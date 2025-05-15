import { useState } from 'react';
import { uploadProject as uploadProjectApi } from '../../services/api/upload.service';
import { getErrorMessage } from '../../utils/api.utils';

export function useUploadProject() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadProject = async (files: FileList, projectName: string) => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await uploadProjectApi(files, projectName);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadProject,
    isUploading,
    error
  };
}