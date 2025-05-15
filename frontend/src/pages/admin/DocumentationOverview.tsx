import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, User, Calendar, ExternalLink, AlertCircle, Trash2, MessageSquare } from 'lucide-react';
import { getAuthHeader } from '../../lib/auth';
import Toast from '../../components/common/Toast';

interface Documentation {
  id: string;
  user_id: string;
  path: string;
  project_name: string;
  created_at: string;
  user: {
    email: string;
  };
}

export default function DocumentationOverview() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const navigateToFeedback = (projectName: string) => {
    navigate('/admin/section-feedback', { state: { selectedProject: projectName } });
  };

  useEffect(() => {
    fetchDocumentation();
  }, []);

  const fetchDocumentation = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch('http://localhost:8000/api/admin/documentation', {
        headers
      });

      if (!response.ok) throw new Error('Failed to fetch documentation');
      const data = await response.json();
      setDocs(data);
    } catch (error) {
      showToast('Failed to fetch documentation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteDocumentation = async (projectName: string) => {
    if (!confirm('Are you sure you want to delete this documentation? This action cannot be undone.')) {
      return;
    }

    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(`http://localhost:8000/api/documentation/project/${projectName}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Failed to delete documentation');
      
      setDocs(docs.filter(doc => doc.project_name !== projectName));
      showToast('Documentation deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete documentation', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleNavigation = (doc: Documentation) => {
    let processedPath = doc.path
      ?.replace(/_project/g, '') // Removes all occurrences of "_project"
      .replace('uploadeds', 'uploaded_projects'); // Replaces "uploadeds" with "uploaded_projects"

    navigate('/documentation', {
      state: { projectName: doc.project_name, rootPath: processedPath }
    });
  };

  const filteredDocs = docs.filter(doc =>
    doc.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by project name or user email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400 space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>No documentation found</span>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white truncate">
                        {doc.project_name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleNavigation(doc)}
                        className="p-2 hover:bg-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="View documentation"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => navigateToFeedback(doc.project_name)}
                        className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                        title="View project feedback"
                      >
                        <MessageSquare className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteDocumentation(doc.project_name)}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                        title="Delete documentation"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <User className="h-4 w-4" />
                      <span>{doc.user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="text-sm text-gray-400 truncate">
                      Path: {doc.path}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
