import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Settings as SettingsIcon, MessageSquare, Brain, Sparkles, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import Toast from '../../components/common/Toast';
import ValueModal from '../../components/admin/ValueModal';
import NewSettingModal from '../../components/admin/NewSettingModal';

interface Setting {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: JSX.Element;
  description: string;
}

interface SortConfig {
  key: keyof Setting;
  direction: 'asc' | 'desc';
}

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedSetting, setSelectedSetting] = useState<Setting | null>(null);
  const [isNewSettingModalOpen, setIsNewSettingModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'key', direction: 'asc' });
  
  const itemsPerPage = 10;

  const categories: Category[] = [
    {
      id: 'all',
      name: 'All Settings',
      icon: <SettingsIcon className="h-5 w-5" />,
      description: 'View and manage all system settings'
    },
    {
      id: 'prompt',
      name: 'Prompts',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'AI model prompt templates and configurations'
    },
    {
      id: 'models',
      name: 'Models',
      icon: <Brain className="h-5 w-5" />,
      description: 'AI model selection and parameters'
    },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      showToast('Failed to load settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (setting: Setting) => {
    try {
      const response = await fetch(`http://localhost:8000/api/settings/${setting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setting),
      });
      
      if (!response.ok) throw new Error('Failed to update setting');
      showToast('Setting updated successfully', 'success');
      fetchSettings();
    } catch (error) {
      showToast('Failed to update setting', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/settings/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete setting');
      showToast('Setting deleted successfully', 'success');
      fetchSettings();
    } catch (error) {
      showToast('Failed to delete setting', 'error');
    }
  };

  const handleAdd = async (newSetting: Omit<Setting, 'id'>) => {
    try {
      const response = await fetch('http://localhost:8000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetting),
      });
      
      if (!response.ok) throw new Error('Failed to add setting');
      showToast('Setting added successfully', 'success');
      setIsNewSettingModalOpen(false);
      fetchSettings();
    } catch (error) {
      showToast('Failed to add setting', 'error');
    }
  };

  const handleSort = (key: keyof Setting) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sortedAndFilteredSettings = settings
    .filter(setting => 
      (selectedCategory === 'all' || setting.category === selectedCategory) &&
      (searchTerm === '' || 
        setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        setting.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        setting.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      return sortConfig.direction === 'asc' 
        ? aValue < bValue ? -1 : 1
        : aValue > bValue ? -1 : 1;
    });

  const totalPages = Math.ceil(sortedAndFilteredSettings.length / itemsPerPage);
  const paginatedSettings = sortedAndFilteredSettings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const SortIcon = ({ columnKey }: { columnKey: keyof Setting }) => {
    if (sortConfig.key !== columnKey) {
      return <div className="w-4" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {selectedSetting && (
        <ValueModal
          isOpen={true}
          onClose={() => setSelectedSetting(null)}
          value={selectedSetting.value}
          title={`Edit value for ${selectedSetting.key}`}
          onSave={(newValue) => {
            handleSave({ ...selectedSetting, value: newValue });
            setSelectedSetting(null);
          }}
        />
      )}

      <NewSettingModal
        isOpen={isNewSettingModalOpen}
        onClose={() => setIsNewSettingModalOpen(false)}
        onSave={handleAdd}
        selectedCategory={selectedCategory !== 'all' ? selectedCategory : undefined}
      />

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Settings Management</h1>
          <button
            onClick={() => setIsNewSettingModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Setting</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="space-y-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setCurrentPage(1);
                }}
                className={`w-full flex flex-col items-start p-4 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-1">
                  {category.icon}
                  <span className="font-medium">{category.name}</span>
                </div>
                <p className="text-sm opacity-80 text-left">
                  {category.description}
                </p>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {/* Search Bar */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-700">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-600"
                        onClick={() => handleSort('key')}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Key</span>
                          <SortIcon columnKey="key" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-600"
                        onClick={() => handleSort('value')}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Value</span>
                          <SortIcon columnKey="value" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-600"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Category</span>
                          <SortIcon columnKey="category" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-600"
                        onClick={() => handleSort('description')}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Description</span>
                          <SortIcon columnKey="description" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedSettings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                          No settings found
                        </td>
                      </tr>
                    ) : (
                      paginatedSettings.map(setting => (
                        <tr key={setting.id} className="hover:bg-gray-750">
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={setting.key}
                              onChange={e => setSettings(settings.map(s =>
                                s.id === setting.id ? { ...s, key: e.target.value } : s
                              ))}
                              className="bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={setting.value}
                                onChange={e => setSettings(settings.map(s =>
                                  s.id === setting.id ? { ...s, value: e.target.value } : s
                                ))}
                                className="bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                              />
                              <button
                                onClick={() => setSelectedSetting(setting)}
                                className="text-gray-400 hover:text-white transition-colors"
                                title="Edit full value"
                              >
                                <Maximize2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={setting.category}
                              onChange={e => setSettings(settings.map(s =>
                                s.id === setting.id ? { ...s, category: e.target.value } : s
                              ))}
                              className="bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                            >
                              <option value="prompt" className="bg-gray-700">Prompt</option>
                              <option value="models" className="bg-gray-700">Models</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={setting.description || ''}
                              onChange={e => setSettings(settings.map(s =>
                                s.id === setting.id ? { ...s, description: e.target.value } : s
                              ))}
                              className="bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleSave(setting)}
                                className="p-1 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                                title="Save changes"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(setting.id)}
                                className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                title="Delete setting"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-750 px-6 py-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedAndFilteredSettings.length)} of {sortedAndFilteredSettings.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-700 text-gray-400'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}