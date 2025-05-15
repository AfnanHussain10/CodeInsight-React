import { useRef, useState, useCallback } from 'react';
import { useUploadProject } from './useUploadProject';
import { validateUploadedFiles } from '../../utils/upload.utils';

export function useUploadArea(projectName: string, onUploadComplete: () => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { uploadProject, isUploading, error } = useUploadProject();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  }, [isUploading]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    try {
      const files = e.dataTransfer.files;
      await handleUpload(files);
    } catch (err) {
      // Error is handled by useUploadProject
    }
  }, [isUploading, projectName]);

  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  }, [isUploading]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    await handleUpload(files);
  }, [projectName]);

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;

    try {
      const validationError = validateUploadedFiles(files);
      if (validationError) {
        throw new Error(validationError);
      }

      await uploadProject(files, projectName);
      onUploadComplete();
    } catch (err) {
      // Error is handled by useUploadProject
    }
  };

  return {
    fileInputRef,
    isDragging,
    isUploading,
    error,
    handleDragOver,
    handleDrop,
    handleBrowseClick,
    handleFileSelect
  };
}