import type { FileSystemTree, DirectoryNode, FileNode } from '@webcontainer/api';

export const flattenFileTree = (tree: FileSystemTree, pathPrefix = ''): string => {
  let output = '';

  for (const [name, node] of Object.entries(tree)) {
    const currentPath = pathPrefix ? `${pathPrefix}/${name}` : name;

    if ('file' in node) {
      const fileNode = node as FileNode;
      if ('contents' in fileNode.file) {
        const content = typeof fileNode.file.contents === 'string'
          ? fileNode.file.contents
          : new TextDecoder().decode(fileNode.file.contents);

        output += `--- ${currentPath} ---\n${content}\n\n`;
      }
    } else if ('directory' in node) {
      const directoryNode = node as DirectoryNode;
      output += flattenFileTree(directoryNode.directory, currentPath);
    }
  }

  return output;
};
