import { useState } from 'react';
import { uploadProject } from '../services/api/upload.service';
import { getErrorMessage } from '../utils/api.utils';
import { validateUploadedFiles } from '../utils/upload.utils';

interface UseUploadHandlersProps {
  setIsDragging: (isDragging: boolean) => void;
  onSuccess?: (path: string) => void;
}

export function useUploadHandlers({ setIsDragging, onSuccess }: UseUploadHandlersProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (files: FileList | null, projectName: string) => {
    if (!files?.length) {
      setError('No files selected');
      return;
    }

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      const validationError = validateUploadedFiles(files);
      if (validationError) {
        throw new Error(validationError);
      }

      const result = await uploadProject(files, projectName);
      onSuccess?.(result.path);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDrop = async (e: React.DragEvent, projectName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const items = e.dataTransfer.items;
    if (items?.length) {
      const hasDirectory = Array.from(items).some(
        item => item.webkitGetAsEntry()?.isDirectory
      );

      if (!hasDirectory) {
        setError('Please drop a directory containing your project files');
        return;
      }

      const files = e.dataTransfer.files;
      await handleFileUpload(files, projectName);
    }
  };

  return {
    handleFileUpload,
    handleDragOver,
    handleDrop,
    isUploading,
    error
  };
}