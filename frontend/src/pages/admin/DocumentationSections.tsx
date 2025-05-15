import { useState, useEffect } from 'react';
import { Search, FileText, Trash2, ChevronDown, ChevronRight, AlertCircle, Code, Folder, BookOpen } from 'lucide-react';
import { getAuthHeader } from '../../lib/auth';
import Toast from '../../components/common/Toast';
import ValueModal from '../../components/admin/ValueModal';

interface DocumentationSection {
  id: number;
  documentation_id: number;
  section_name: string;
  section_content: string;
  prompt_used: string;
  created_at: string;
}

interface Documentation {
  id: number;
  user_id: string;
  path: string;
  project_name: string;
  level: string;
  created_at: string;
  user_email: string;
  sections: DocumentationSection[];
}

export default function DocumentationSections() {
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  useEffect(() => {
    fetchDocumentationSections();
  }, []);

  const fetchDocumentationSections = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch('http://localhost:8000/api/admin/documentation-sections', {
        headers
      });

      if (!response.ok) throw new Error('Failed to fetch documentation sections');
      const data = await response.json();
      setDocs(data);
    } catch (error) {
      showToast('Failed to fetch documentation sections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (sectionId: number) => {
    if (!confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      return;
    }

    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(`/api/admin/documentation-sections/${sectionId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Failed to delete section');
      
      // Update the UI by removing the deleted section
      setDocs(docs.map(doc => ({
        ...doc,
        sections: doc.sections.filter(section => section.id !== sectionId)
      })));
      
      showToast('Section deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete section', 'error');
    }
  };

  const toggleExpandDoc = (docId: number) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'file':
        return <FileText className="h-5 w-5 text-blue-400" />;
      case 'folder':
        return <Folder className="h-5 w-5 text-yellow-400" />;
      case 'project':
        return <BookOpen className="h-5 w-5 text-green-400" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const filteredDocs = docs.filter(doc => 
    (selectedLevel === 'all' || doc.level === selectedLevel) &&
    (searchTerm === '' || 
      doc.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.sections.some(section => 
        section.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.prompt_used.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

  return (
    <div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {selectedPrompt && (
        <ValueModal
          isOpen={true}
          onClose={() => setSelectedPrompt(null)}
          value={selectedPrompt}
          title="Prompt Used"
          onSave={() => setSelectedPrompt(null)}
        />
      )}

      {selectedContent && (
        <ValueModal
          isOpen={true}
          onClose={() => setSelectedContent(null)}
          value={selectedContent}
          title="Section Content"
          onSave={() => setSelectedContent(null)}
        />
      )}

      <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by project, path, section name or prompt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="all" className="bg-gray-700">All Levels</option>
                <option value="file" className="bg-gray-700">File</option>
                <option value="folder" className="bg-gray-700">Folder</option>
                <option value="project" className="bg-gray-700">Project</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400 space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>No documentation sections found</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="bg-gray-750 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => toggleExpandDoc(doc.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {expandedDocs.has(doc.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      {getLevelIcon(doc.level)}
                      <div>
                        <h3 className="text-lg font-semibold text-white">{doc.project_name}</h3>
                        <p className="text-sm text-gray-400">{doc.path}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-400">{formatDate(doc.created_at)}</span>
                      <span className="text-sm text-gray-400">{doc.user_email}</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300 capitalize">{doc.level}</span>
                    </div>
                  </div>

                  {expandedDocs.has(doc.id) && (
                    <div className="p-4 border-t border-gray-700">
                      {doc.sections.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No sections found for this documentation</p>
                      ) : (
                        <div className="space-y-4">
                          {doc.sections.map((section) => (
                            <div key={section.id} className="bg-gray-800 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="text-lg font-medium text-white">{section.section_name}</h4>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setSelectedContent(section.section_content)}
                                    className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    title="View section content"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setSelectedPrompt(section.prompt_used)}
                                    className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    title="View prompt used"
                                  >
                                    <Code className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteSection(section.id)}
                                    className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                    title="Delete section"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between text-sm text-gray-400">
                                <span>Created: {formatDate(section.created_at)}</span>
                                <span className="truncate max-w-md">
                                  Prompt: {section.prompt_used.substring(0, 50)}...
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}