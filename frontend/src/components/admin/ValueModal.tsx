import { X, Save } from 'lucide-react';
import { useState } from 'react';

interface ValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  title: string;
  onSave: (value: string) => void;
}

export default function ValueModal({ isOpen, onClose, value, title, onSave }: ValueModalProps) {
  const [editedValue, setEditedValue] = useState(value);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="w-full h-full min-h-[400px] bg-gray-900 text-gray-200 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
}