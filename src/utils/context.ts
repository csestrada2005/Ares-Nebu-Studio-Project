import type { FileSystemTree, DirectoryNode, FileNode } from '@webcontainer/api';

// ---------------------------------------------------------------------------
// fileSystemTreeToMap — flattens a FileSystemTree into a Map<path, content>
// ---------------------------------------------------------------------------

function flattenTreeToMap(
  tree: FileSystemTree,
  prefix: string,
  out: Map<string, string>
): void {
  for (const [name, node] of Object.entries(tree)) {
    if (name === 'node_modules' || name === '.git') continue;
    const currentPath = prefix ? `${prefix}/${name}` : name;

    if ('file' in node) {
      const fileNode = node as FileNode;
      if ('contents' in fileNode.file) {
        const content =
          typeof fileNode.file.contents === 'string'
            ? fileNode.file.contents
            : new TextDecoder().decode(fileNode.file.contents as Uint8Array);
        out.set(currentPath, content);
      }
    } else if ('directory' in node) {
      flattenTreeToMap((node as DirectoryNode).directory, currentPath, out);
    }
  }
}

/**
 * Convert a FileSystemTree (as used by templates and history snapshots) into
 * the flat Map<string, string> format used by the new file system.
 */
export function fileSystemTreeToMap(tree: FileSystemTree): Map<string, string> {
  const map = new Map<string, string>();
  flattenTreeToMap(tree, '', map);
  return map;
}

/**
 * Convert a Map<string, string> (path → content) back to a FileSystemTree.
 * Used for compatibility with components that haven't been refactored yet.
 */
export function mapToFileSystemTree(files: Map<string, string>): FileSystemTree {
  const tree: any = {};
  for (const [path, content] of files) {
    const parts = path.split('/');
    let current: any = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = { file: { contents: content } };
      } else {
        if (!current[part]) current[part] = { directory: {} };
        current = current[part].directory;
      }
    }
  }
  return tree as FileSystemTree;
}

const flattenFileTreeRecursive = (tree: FileSystemTree, pathPrefix = ''): string => {
  let output = '';

  for (const [name, node] of Object.entries(tree)) {
    // Skip node_modules and .git to save tokens
    if (name === 'node_modules' || name === '.git') {
      continue;
    }

    const currentPath = pathPrefix ? `${pathPrefix}/${name}` : name;

    if ('file' in node) {
      const fileNode = node as FileNode;
      if ('contents' in fileNode.file) {
        const content = typeof fileNode.file.contents === 'string'
          ? fileNode.file.contents
          : new TextDecoder().decode(fileNode.file.contents);

        output += `<document path="${currentPath}">\n${content}\n</document>\n`;
      }
    } else if ('directory' in node) {
      const directoryNode = node as DirectoryNode;
      output += flattenFileTreeRecursive(directoryNode.directory, currentPath);
    }
  }

  return output;
};

export const flattenFileTree = (tree: FileSystemTree): string => {
  const documents = flattenFileTreeRecursive(tree);
  return `<documents>\n${documents}</documents>`;
};

const generateBlueprintRecursive = (tree: FileSystemTree, depth = 0): string => {
  let output = '';
  const indent = '  '.repeat(depth);

  const entries = Object.entries(tree).sort(([a], [b]) => a.localeCompare(b));

  for (const [name, node] of entries) {
    if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'package-lock.json' || name === 'yarn.lock' || name === 'pnpm-lock.yaml') {
      continue;
    }

    if ('directory' in node) {
      output += `${indent}${name}/\n`;
      output += generateBlueprintRecursive((node as DirectoryNode).directory, depth + 1);
    } else if ('file' in node) {
      output += `${indent}${name}\n`;
    }
  }
  return output;
};

export const generateProjectBlueprint = (tree: FileSystemTree): string => {
  return generateBlueprintRecursive(tree);
};
