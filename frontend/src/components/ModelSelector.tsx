import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

interface Model {
  key: string;
  value: string;
  description: string | null;
}

interface ModelSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ModelSelector({ label, value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/settings');
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        
        // Filter settings to only get models
        const modelSettings = data.filter((setting: any) => setting.category === 'models');
        setModels(modelSettings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white appearance-none focus:outline-none focus:border-blue-500"
        >
          <option value="" className="bg-gray-700">Select Model</option>
          {models.map((model) => (
            <option 
              key={model.key} 
              value={model.value}
              className="bg-gray-700"
            >
              {model.key}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Brain className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      {value && (
        <p className="mt-2 text-sm text-gray-400">
          {models.find(m => m.value === value)?.description || 'No description available'}
        </p>
      )}
    </div>
  );
}