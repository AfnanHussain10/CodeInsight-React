import React, { useEffect, useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Check } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  parentPath?: string;
}

interface FileSelectionProps {
  projectName: string;
  onSelectionChange: (selectedPaths: string[]) => void;
}

export default function FileSelection({ projectName, onSelectionChange }: FileSelectionProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add parent paths to all nodes for easier traversal
  const addParentPaths = (nodes: FileNode[], parentPath?: string): FileNode[] => {
    return nodes.map(node => ({
      ...node,
      parentPath,
      children: node.children ? addParentPaths(node.children, node.path) : undefined
    }));
  };

  useEffect(() => {
    const fetchFileStructure = async () => {
      try {
        setLoading(true);
        const cleanProjectName = projectName.split('/').pop()?.split('\\').pop() || projectName;
        
        const response = await fetch(`http://localhost:8000/api/file-structure/${cleanProjectName}`);
        if (!response.ok) {
          throw new Error('Failed to fetch file structure');
        }
        const data = await response.json();
        // Add parent paths to the file tree
        const treeWithParents = addParentPaths(data);
        setFileTree(treeWithParents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (projectName) {
      fetchFileStructure();
    }
  }, [projectName]);

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Get all descendant paths of a folder
  const getAllDescendantPaths = (node: FileNode): string[] => {
    const paths: string[] = [node.path];
    if (node.children) {
      node.children.forEach(child => {
        paths.push(...getAllDescendantPaths(child));
      });
    }
    return paths;
  };

  // Get all ancestor paths of a node
  const getAllAncestorPaths = (node: FileNode): string[] => {
    const paths: string[] = [];
    let currentPath = node.parentPath;
    
    while (currentPath) {
      paths.push(currentPath);
      const parentNode = findNodeByPath(fileTree, currentPath);
      currentPath = parentNode?.parentPath;
    }
    
    return paths;
  };

  // Helper function to find a node by its path
  const findNodeByPath = (nodes: FileNode[], path: string): FileNode | undefined => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return undefined;
  };

  const toggleSelection = (node: FileNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles(prev => {
      const next = new Set(prev);
      
      if (next.has(node.path)) {
        // Deselecting node and its descendants
        const descendantPaths = getAllDescendantPaths(node);
        descendantPaths.forEach(path => next.delete(path));
      } else {
        // Selecting node, its descendants, and ancestors
        const descendantPaths = getAllDescendantPaths(node);
        const ancestorPaths = getAllAncestorPaths(node);
        
        // Add all paths
        [...descendantPaths, ...ancestorPaths].forEach(path => next.add(path));
      }

      const selectedArray = Array.from(next);
      onSelectionChange(selectedArray);
      return next;
    });
  };

  const renderFileTree = (node: FileNode, level = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFiles.has(node.path);

    return (
      <div key={node.path} className="select-none">
        <div 
          className={`flex items-center space-x-2 py-1.5 px-2 rounded-lg hover:bg-gray-800 cursor-pointer ${
            isSelected ? 'bg-gray-800' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={(e) => toggleSelection(node, e)}
        >
          <div className="flex items-center min-w-[24px]">
            {node.type === 'folder' && (
              <button
                onClick={(e) => toggleFolder(node.path, e)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2 flex-1">
            {node.type === 'folder' ? (
              <Folder className={`h-4 w-4 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
            ) : (
              <File className={`h-4 w-4 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
            )}
            <span className={`text-sm ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
              {node.name}
            </span>
          </div>

          {isSelected && (
            <Check className="h-4 w-4 text-green-400 ml-2" />
          )}
        </div>
        
        {node.type === 'folder' && isExpanded && node.children?.map(child => 
          renderFileTree(child, level + 1)
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
        <div className="text-gray-400">Loading file structure...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
        {fileTree.map(node => renderFileTree(node))}
      </div>
      {selectedFiles.size > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}