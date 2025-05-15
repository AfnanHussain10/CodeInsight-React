import { X, Maximize2 } from 'lucide-react';
import { useState } from 'react';
import ValueModal from './ValueModal';

interface NewSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (setting: {
    key: string;
    value: string;
    category: string;
    description: string | null;
  }) => void;
  selectedCategory?: string;
}

export default function NewSettingModal({ isOpen, onClose, onSave, selectedCategory = 'general' }: NewSettingModalProps) {
  const [setting, setSetting] = useState({
    key: '',
    value: '',
    category: selectedCategory,
    description: ''
  });
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(setting);
    setSetting({ key: '', value: '', category: selectedCategory, description: '' });
  };

  const handleValueSave = (newValue: string) => {
    setSetting(prev => ({ ...prev, value: newValue }));
    setIsValueModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {isValueModalOpen && (
        <ValueModal
          isOpen={true}
          onClose={() => setIsValueModalOpen(false)}
          value={setting.value}
          title="Add new setting value"
          onSave={handleValueSave}
        />
      )}

      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Add New Setting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Key
            </label>
            <input
              type="text"
              value={setting.key}
              onChange={e => setSetting({ ...setting, key: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter setting key"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Value
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={setting.value}
                onChange={e => setSetting({ ...setting, value: e.target.value })}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter setting value"
                required
              />
              <button
                type="button"
                onClick={() => setIsValueModalOpen(true)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Open in editor"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={setting.category}
              onChange={e => setSetting({ ...setting, category: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="general" className="bg-gray-700">General</option>
              <option value="prompt" className="bg-gray-700">Prompt</option>
              <option value="models" className="bg-gray-700">Models</option>
              <option value="rlhf" className="bg-gray-700">RLHF</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={setting.description}
              onChange={e => setSetting({ ...setting, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter setting description"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
            >
              Add Setting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}