/**
 * BrowserCompiler — in-browser TSX compilation pipeline.
 *
 * Accepts a Map<string, string> of project files and produces a complete
 * HTML string suitable for an iframe's srcdoc attribute.
 *
 * Pipeline:
 *  1. Transform each file with @babel/standalone (react + typescript presets)
 *  2. Resolve relative imports to absolute map keys
 *  3. Wrap each file in a CommonJS module factory
 *  4. Bundle into a single self-executing script with a require() shim
 *  5. Load React/ReactDOM from unpkg UMD builds, Tailwind from CDN
 *  6. Always append the preview-client postMessage bridge as the last script
 */

import * as Babel from '@babel/standalone';
import { PREVIEW_CLIENT_SCRIPT } from '../utils/previewClient';

// ---------------------------------------------------------------------------
// Path resolution helpers
// ---------------------------------------------------------------------------

function resolveRelativePath(fromFile: string, importPath: string, files: Map<string, string>): string | null {
  const dir = fromFile.includes('/') ? fromFile.split('/').slice(0, -1).join('/') : '';
  let combined = dir ? `${dir}/${importPath}` : importPath;

  // Normalize . and ..
  const parts = combined.split('/');
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === '..') { normalized.pop(); }
    else if (part !== '.') { normalized.push(part); }
  }
  const resolved = normalized.join('/');

  // Exact match
  if (files.has(resolved)) return resolved;

  // Try common extensions and index files
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  for (const ext of extensions) {
    if (files.has(resolved + ext)) return resolved + ext;
    if (files.has(`${resolved}/index${ext}`)) return `${resolved}/index${ext}`;
  }

  return null;
}

function resolveAliasPath(importPath: string, files: Map<string, string>): string | null {
  // Handle @/ → src/
  if (importPath.startsWith('@/')) {
    const withSrc = 'src/' + importPath.slice(2);
    if (files.has(withSrc)) return withSrc;
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    for (const ext of extensions) {
      if (files.has(withSrc + ext)) return withSrc + ext;
    }
    return withSrc; // fallback: will be a missing module warning at runtime
  }
  return null;
}

/**
 * After Babel transforms imports to require() calls, replace relative and @/*
 * paths with their resolved absolute keys so the require() shim can find them.
 */
function resolveRequirePaths(code: string, fromFile: string, files: Map<string, string>): string {
  return code.replace(/require\(['"]([^'"]+)['"]\)/g, (match, importPath) => {
    if (importPath.startsWith('.')) {
      const resolved = resolveRelativePath(fromFile, importPath, files);
      return resolved ? `require(${JSON.stringify(resolved)})` : match;
    }
    if (importPath.startsWith('@/')) {
      const resolved = resolveAliasPath(importPath, files);
      return resolved ? `require(${JSON.stringify(resolved)})` : match;
    }
    return match; // bare import — handled at runtime by the shim
  });
}

// ---------------------------------------------------------------------------
// Babel transform
// ---------------------------------------------------------------------------

function transformFile(content: string, filename: string): string {
  const result = Babel.transform(content, {
    filename,
    presets: [
      ['react', { runtime: 'classic' }],
      'typescript',
    ],
    plugins: ['transform-modules-commonjs'],
    retainLines: true,
  });
  return result.code || '';
}

// ---------------------------------------------------------------------------
// Script safety
// ---------------------------------------------------------------------------

/** Prevent </script> inside JS strings from terminating the outer script tag. */
function escapeScriptClose(code: string): string {
  return code.replace(/<\/script>/gi, '<\\/script>');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile all project files into a self-contained HTML string for srcdoc.
 * Returns an error page if compilation fails.
 */
export async function compile(files: Map<string, string>): Promise<string> {
  // Find entry point
  const entryPoint =
    files.has('src/App.tsx') ? 'src/App.tsx' :
    files.has('src/main.tsx') ? 'src/main.tsx' :
    null;

  if (!entryPoint) {
    return generateErrorHTML('No entry point found. Expected src/App.tsx or src/main.tsx.');
  }

  try {
    // Build per-file module factories
    const moduleFactories: string[] = [];

    for (const [path, content] of files) {
      // Skip non-JS assets
      if (
        path.includes('node_modules') ||
        path.includes('dist/') ||
        path.endsWith('.css') ||
        path.endsWith('.svg') ||
        path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.json') ||
        path.endsWith('.md') ||
        path.endsWith('.lock') ||
        path.endsWith('.html')
      ) continue;

      const isCode =
        path.endsWith('.tsx') || path.endsWith('.ts') ||
        path.endsWith('.jsx') || path.endsWith('.js');

      if (!isCode) continue;

      try {
        let transformed = transformFile(content, path);
        transformed = resolveRequirePaths(transformed, path, files);
        transformed = escapeScriptClose(transformed);

        moduleFactories.push(
          `__modules[${JSON.stringify(path)}] = function(module, exports, require) {\n${transformed}\n};`
        );
      } catch (err: any) {
        const msg = err?.message || String(err);
        console.warn(`[BrowserCompiler] Skipping ${path}:`, msg);
        moduleFactories.push(
          `__modules[${JSON.stringify(path)}] = function(module, exports) { console.error(${JSON.stringify('[Preview] Failed to compile ' + path + ': ' + msg)}); };`
        );
      }
    }

    // Bootstrap: render App or run main
    const isMain = entryPoint === 'src/main.tsx';
    const bootstrapCode = isMain
      ? `require(${JSON.stringify(entryPoint)});`
      : [
          `var _entry = require(${JSON.stringify(entryPoint)});`,
          `var AppComponent = _entry.default || _entry;`,
          `var root = document.getElementById('root');`,
          `if (window.ReactDOM && window.ReactDOM.createRoot) {`,
          `  window.ReactDOM.createRoot(root).render(window.React.createElement(AppComponent));`,
          `} else if (window.ReactDOM) {`,
          `  window.ReactDOM.render(window.React.createElement(AppComponent), root);`,
          `}`,
        ].join('\n');

    const bundleScript = buildBundleScript(moduleFactories, bootstrapCode);

    return generateHTML(bundleScript);
  } catch (err: any) {
    return generateErrorHTML(err?.message || String(err), err?.stack);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildBundleScript(moduleFactories: string[], bootstrapCode: string): string {
  return [
    '(function() {',
    '"use strict";',
    '',
    'var __modules = {};',
    'var __cache = {};',
    '',
    'function require(id) {',
    '  if (Object.prototype.hasOwnProperty.call(__cache, id)) return __cache[id];',
    '',
    '  // Built-in global mappings',
    '  if (id === "react") return window.React;',
    '  if (id === "react-dom") return window.ReactDOM;',
    '  if (id === "react-dom/client") return window.ReactDOM;',
    '  if (id === "react/jsx-runtime") {',
    '    return { jsx: window.React.createElement, jsxs: window.React.createElement, Fragment: window.React.Fragment };',
    '  }',
    '  if (id === "lucide-react") return window.__lucideReact || {};',
    '  if (id === "react-router-dom") return window.__reactRouterDom || {};',
    '',
    '  if (__modules[id]) {',
    '    var m = { exports: {} };',
    '    __cache[id] = m.exports; // circular ref guard',
    '    __modules[id](m, m.exports, require);',
    '    __cache[id] = m.exports;',
    '    return m.exports;',
    '  }',
    '',
    '  console.warn("[Preview] Module not found:", id);',
    '  return {};',
    '}',
    '',
    moduleFactories.join('\n\n'),
    '',
    'try {',
    bootstrapCode,
    '} catch(e) {',
    '  var root = document.getElementById("root");',
    '  if (root) root.innerHTML = "<div style=\\"color:red;padding:20px;font-family:monospace;background:#1a0000\\">Preview error: " + e.message + "<br><pre>" + e.stack + "</pre></div>";',
    '  console.error("[Preview] Bootstrap error:", e);',
    '}',
    '',
    '})();',
  ].join('\n');
}

function generateHTML(bundleScript: string): string {
  // We build the HTML as a string using array join to avoid template-literal
  // escaping issues with the bundle's content.
  const parts: string[] = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    // Tailwind CDN play script
    '  <script src="https://cdn.tailwindcss.com"><\/script>',
    // React UMD (sets window.React)
    '  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><\/script>',
    // ReactDOM UMD (sets window.ReactDOM)
    '  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><\/script>',
    '  <style>body{margin:0;}#root{min-height:100vh;}<\/style>',
    '<\/head>',
    '<body>',
    '  <div id="root"><\/div>',
    '  <script>',
    bundleScript,
    '  <\/script>',
    '  <script>',
    // Preview-client bridge — always last so the app renders first
    PREVIEW_CLIENT_SCRIPT,
    '  <\/script>',
    '<\/body>',
    '<\/html>',
  ];
  return parts.join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateErrorHTML(message: string, stack?: string): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <style>',
    '    body{background:#0a0a0f;color:#fff;font-family:system-ui;padding:40px;margin:0;}',
    '    h1{color:#ef4444;font-size:1.5rem;margin-bottom:16px;}',
    '    pre{background:#111;border:1px solid #333;padding:16px;border-radius:8px;overflow:auto;font-size:12px;color:#f87171;white-space:pre-wrap;}',
    '    .note{margin-top:24px;color:#9ca3af;font-size:14px;}',
    '  <\/style>',
    '<\/head>',
    '<body>',
    '  <h1>Compilation Error<\/h1>',
    `  <pre>${escapeHtml(message)}${stack ? '\n\n' + escapeHtml(stack) : ''}<\/pre>`,
    '  <p class="note">The AI will auto-fix this...<\/p>',
    '<\/body>',
    '<\/html>',
  ].join('\n');
}
