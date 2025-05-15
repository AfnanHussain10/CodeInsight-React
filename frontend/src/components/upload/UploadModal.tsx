import React from 'react';
import { X } from 'lucide-react';
import FileUploadForm from './FileUploadForm';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (path: string) => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Upload Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <FileUploadForm onClose={onClose} onSuccess={onSuccess} />
      </div>
    </div>
  );
}