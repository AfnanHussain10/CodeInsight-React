import React from 'react';
import { Upload } from 'lucide-react';
import { useUploadArea } from '../../hooks/upload/useUploadArea';

interface UploadAreaProps {
  projectName: string;
  onUploadComplete: () => void;
}

export default function UploadArea({ projectName, onUploadComplete }: UploadAreaProps) {
  const {
    fileInputRef,
    isDragging,
    isUploading,
    error,
    handleDragOver,
    handleDrop,
    handleBrowseClick,
    handleFileSelect
  } = useUploadArea(projectName, onUploadComplete);

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-gray-700' : 'border-gray-600'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnter={() => !isUploading}
        onDragLeave={() => !isUploading}
        onClick={handleBrowseClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          {...{
            directory: "",
            webkitdirectory: "",
            mozdirectory: "",
          } as any}
          multiple
          disabled={isUploading}
        />
        
        {isUploading ? (
          <UploadProgress />
        ) : (
          <UploadPrompt />
        )}
      </div>

      {error && <UploadError message={error} />}
    </div>
  );
}