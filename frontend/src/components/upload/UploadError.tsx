import React from 'react';
import { AlertCircle } from 'lucide-react';

interface UploadErrorProps {
  message: string;
}

export default function UploadError({ message }: UploadErrorProps) {
  return (
    <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center">
      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
      <p>{message}</p>
    </div>
  );
}