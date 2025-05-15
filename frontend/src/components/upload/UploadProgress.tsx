import React from 'react';
import { Loader } from 'lucide-react';

export default function UploadProgress() {
  return (
    <div className="text-center">
      <Loader className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-spin" />
      <p className="text-gray-300">Uploading project...</p>
    </div>
  );
}