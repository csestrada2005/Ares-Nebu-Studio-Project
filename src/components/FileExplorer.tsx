import React, { useState } from 'react';
import { File, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import type { FileSystemTree, DirectoryNode, FileNode } from '@webcontainer/api';

interface FileExplorerProps {
  fileTree: FileSystemTree;
  onSelectFile: (path: string, content: string) => void;
}

interface FileNodeProps {
  name: string;
  node: FileNode | DirectoryNode;
  path: string;
  depth: number;
  onSelectFile: (path: string, content: string) => void;
}

const FileSystemNode: React.FC<FileNodeProps> = ({ name, node, path, depth, onSelectFile }) => {
  const [isOpen, setIsOpen] = useState(true); // Default open for better visibility
  const isDirectory = 'directory' in node;

  const handleClick = () => {
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      const fileNode = node as FileNode;
      const content = typeof fileNode.file.contents === 'string'
        ? fileNode.file.contents
        : new TextDecoder().decode(fileNode.file.contents);
      onSelectFile(path, content);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-800 cursor-pointer select-none`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory && (
          <span className="text-gray-400">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        {!isDirectory && <span className="w-3.5" />} {/* Spacer for alignment */}

        {isDirectory ? (
          <Folder size={14} className="text-blue-400" />
        ) : (
          <File size={14} className="text-gray-400" />
        )}

        <span className="text-sm truncate">{name}</span>
      </div>

      {isDirectory && isOpen && (
        <div>
          {Object.entries((node as DirectoryNode).directory).map(([childName, childNode]) => (
            <FileSystemNode
              key={childName}
              name={childName}
              node={childNode}
              path={`${path}/${childName}`}
              depth={depth + 1}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ fileTree, onSelectFile }) => {
  return (
    <div className="h-full bg-gray-900 text-gray-300 overflow-y-auto border-r border-gray-800">
      <div className="p-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">
        Explorer
      </div>
      {Object.entries(fileTree).map(([name, node]) => (
        <FileSystemNode
          key={name}
          name={name}
          node={node}
          path={name}
          depth={0}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
};
