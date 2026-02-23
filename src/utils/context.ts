import type { FileSystemTree, DirectoryNode, FileNode } from '@webcontainer/api';

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
