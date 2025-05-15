import React from 'react';
import { Upload } from 'lucide-react';

export default function UploadPrompt() {
  return (
    <>
      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-300 mb-2">Drag and drop your project folder here</p>
      <p className="text-gray-400 text-sm mb-4">or</p>
      <button
        type="button"
        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        Select Folder
      </button>
    </>
  );
}