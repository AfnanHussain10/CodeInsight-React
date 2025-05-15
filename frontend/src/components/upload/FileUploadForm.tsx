import React, { useState, useRef } from 'react';
import { useUploadHandlers } from '../../hooks/useUploadHandlers';
import UploadProgress from './UploadProgress';
import UploadPrompt from './UploadPrompt';

interface FileUploadFormProps {
  onClose: () => void;
  onSuccess?: (path: string) => void;
}

export default function FileUploadForm({ onClose, onSuccess }: FileUploadFormProps) {
  const [projectName, setProjectName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { handleFileUpload, handleDragOver, handleDrop, isUploading, error } = useUploadHandlers({
    setIsDragging,
    onSuccess
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.length) {
      alert('Please select a folder to upload');
      return;
    }
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      await handleFileUpload(fileInputRef.current.files, projectName);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">
          Project Name
        </label>
        <input
          type="text"
          id="projectName"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="Enter project name"
          required
          disabled={isUploading}
        />
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-blue-500 bg-gray-700' : 'border-gray-600'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, projectName)}
        onDragEnter={() => !isUploading && setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onClick={handleBrowseClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e.target.files, projectName)}
          className="hidden"
          {...{
            directory: "",
            webkitdirectory: "",
            mozdirectory: "",
          } as any}
          multiple
          disabled={isUploading}
        />
        
        {isUploading ? <UploadProgress /> : <UploadPrompt />}
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          disabled={isUploading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`px-4 py-2 rounded-lg text-white transition-colors ${
            isUploading 
              ? 'bg-blue-500/50 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Project'}
        </button>
      </div>
    </form>
  );
}