import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

interface DocumentationTreeProps {
  projectName: string;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}


export default function DocumentationTree({ projectName, onSelect, selectedPath }: DocumentationTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fetchTree = async () => {
      try {
        const cleanProjectName = projectName.split('/').pop()?.split('\\').pop() || projectName;
        
        const response = await fetch(`http://localhost:8000/api/file-structure/${cleanProjectName}`);
        if (!response.ok) throw new Error("Failed to fetch file structure");
        const data = await response.json();
        setTree(data);
      } catch (error) {
        console.error("Error fetching file structure:", error);
      }
    };
  
    fetchTree();
  }, []);

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, level = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-800 ${
            isSelected ? 'bg-gray-800 text-blue-400' : 'text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onSelect(node.path)}
        >
          {node.type === 'folder' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.path);
              }}
              className="mr-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {node.type === 'folder' ? (
            <Folder className="h-4 w-4 mr-2" />
          ) : (
            <File className="h-4 w-4 mr-2" />
          )}
          <span className="text-sm">{node.name}</span>
        </div>
        {node.type === 'folder' && isExpanded && node.children?.map(child =>
          renderNode(child, level + 1)
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-900 text-white p-4 overflow-auto">
      <h2 className="text-lg font-semibold mb-4">Project Structure</h2>
      <div className="space-y-1">
        {tree.map(node => renderNode(node))}
      </div>
    </div>
  );
}