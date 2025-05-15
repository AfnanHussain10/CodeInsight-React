import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import UploadModal from '../components/upload/UploadModal';
import SetupProgress from '../components/setup/SetupProgress';
import FileSelection from '../components/setup/FileSelection';
import ModelSelector from '../components/ModelSelector';

export default function Setup() {
  const location = useLocation();
  const userId = location.state?.userId;
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fileModel, setFileModel] = useState('');
  const [folderModel, setFolderModel] = useState('');
  const [projectModel, setProjectModel] = useState('');

  const handleUploadSuccess = (name: string) => {
    setProjectName(name);
    setUploadSuccess(true);
    setIsUploadModalOpen(false);
  };

  const handleNext = () => {
    if (currentStep === 1 && uploadSuccess) {
      setCurrentStep(2);
    }
  };

  const handleFileSelection = (paths: string[]) => {
    setSelectedFiles(paths);
  };

  const handleGenerateDocumentation = async () => {
    try {
      const cleanProjectName = projectName.split('/').pop()?.split('\\').pop() || projectName;
      const firstSelectedPath = selectedFiles[0];
      const pathParts = firstSelectedPath.split(/[/\\]/);
      const projectIndex = pathParts.findIndex(part => part === projectName.split(/[/\\]/).pop());
      const rootPath = './' + pathParts.slice(1, projectIndex + 2).join('\\');
      console.log(cleanProjectName,rootPath,selectedFiles)
      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          root_path: rootPath,
          project_name: cleanProjectName,
          selected_items: selectedFiles,
          file_model: fileModel,
          folder_model: folderModel,
          project_model: projectModel
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate documentation');
      }
      const data = await response.json();
      console.log(data.progress_key)
      navigate('/documentation', { state: { projectName, selectedFiles, progressKey: data.progress_key, rootPath}});
    } catch (error) {
      console.error('Failed to generate documentation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-16">
      <div className="max-w-4xl mx-auto px-4">
        <SetupProgress currentStep={currentStep} totalSteps={2} />

        {currentStep === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Upload your codebase</h2>
              {!uploadSuccess ? (
                <div 
                  className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <Upload className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-lg text-gray-300 mb-2">Drag and drop your codebase here</p>
                  <p className="text-gray-500 mb-4">or</p>
                  <button 
                    className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Browse Computer
                  </button>
                </div>
              ) : (
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 text-center">
                  <p className="text-green-400 text-lg mb-4">Project uploaded successfully!</p>
                  <button
                    onClick={handleNext}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Continue to File Selection
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
            <ModelSelector
                label="File-level Model"
                value={fileModel}
                onChange={setFileModel}
              />
              <ModelSelector
                label="Folder-level Model"
                value={folderModel}
                onChange={setFolderModel}
              />
              <ModelSelector
                label="Project-level Model"
                value={projectModel}
                onChange={setProjectModel}
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Select Files or Folders</h2>
              <FileSelection 
                projectName={projectName}
                onSelectionChange={handleFileSelection}
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleGenerateDocumentation}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedFiles.length === 0 || !fileModel || !folderModel || !projectModel}
              >
                Generate Documentation
              </button>
            </div>
          </div>
        )}

        <UploadModal 
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      </div>
    </div>
  );
}