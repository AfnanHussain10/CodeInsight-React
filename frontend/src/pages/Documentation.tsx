import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import DocumentationTree from '../components/documentation/DocumentationTree';
import DocumentationViewer from '../components/documentation/DocumentationViewer';
import GeneratingDocumentation from '../components/documentation/GeneratingDocumentation';

export default function Documentation() {
  const location = useLocation();

  const projectName = location.state?.projectName;
  const rootPath = location.state?.rootPath;

  const progressKey = location.state?.progressKey;
  const [isGenerating, setIsGenerating] = useState(!!progressKey);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [documentation, setDocumentation] = useState<string | null>(null);
  const [isTreeVisible, setIsTreeVisible] = useState(true); // New state for tree visibility

  const handlePathSelect = async (path: string) => {
    try {
      if (path === rootPath) {
        path += '_project';
      }
      setSelectedPath(path);
      const response = await fetch(`http://localhost:8000/api/documentation?path=${encodeURIComponent(path)}`);
      if (!response.ok) throw new Error('Failed to fetch documentation');
      const doc = await response.text();
      setDocumentation(doc);
    } catch (error) {
      console.error('Error fetching documentation:', error);
    }
  };

  const handleTreeToggle = () => {
    setIsTreeVisible(!isTreeVisible);
  };

  if (isGenerating && progressKey) {
    return (
      <GeneratingDocumentation 
        progressKey={progressKey.split('/').pop()?.split('\\').pop() || projectName} 
        onComplete={() => setIsGenerating(false)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {isTreeVisible && (
        <div className="w-80 border-r border-gray-700 transition-all duration-300">
          <DocumentationTree
            projectName={projectName}
            onSelect={handlePathSelect}
            selectedPath={selectedPath}
          />
        </div>
      )}
      <div className={`flex-1 overflow-auto ${!isTreeVisible ? 'w-full' : ''}`}>
        <DocumentationViewer
          documentation={documentation}
          path={selectedPath}
          projectName={projectName}
          onTreeToggle={handleTreeToggle} // Pass toggle function
          isTreeVisible={isTreeVisible}   // Pass visibility state
        />
      </div>
    </div>
  );
}