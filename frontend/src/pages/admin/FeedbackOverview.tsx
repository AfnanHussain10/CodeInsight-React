import { useState, useEffect } from 'react';
import { Search, Star, AlertCircle, FileText, User, Calendar, X, Filter, Trash2 } from 'lucide-react';
import { getAuthHeader } from '../../lib/auth';
import Toast from '../../components/common/Toast';
import ReactMarkdown from 'react-markdown';

interface Feedback {
  id: number;
  user_id: string;
  user_email: string;
  path: string;
  level: string;
  feedback: string;
  rating: number;
  timestamp: string;
  documentation: string | null;
}

type SortField = 'timestamp' | 'rating' | 'user_email';
type SortOrder = 'asc' | 'desc';

export default function FeedbackOverview() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch('http://localhost:8000/api/admin/feedback', {
        headers
      });

      if (!response.ok) throw new Error('Failed to fetch feedback');
      const data = await response.json();
      setFeedbacks(data);
    } catch (error) {
      showToast('Failed to fetch feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (feedbackId: number) => {
    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(`http://localhost:8000/api/admin/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Failed to delete feedback');
      
      setFeedbacks(feedbacks.filter(f => f.id !== feedbackId));
      showToast('Feedback deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete feedback', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedFeedback = feedbacks
    .filter(feedback => 
      (selectedLevel === 'all' || feedback.level === selectedLevel) &&
      (searchTerm === '' || 
        feedback.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.feedback.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.path.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'timestamp') {
        return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * order;
      }
      if (sortField === 'rating') {
        return (a.rating - b.rating) * order;
      }
      return a[sortField].localeCompare(b[sortField]) * order;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const levels = ['all', 'file', 'folder', 'project'];

  return (
    <div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Documentation</h2>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{selectedDoc}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="text-gray-400">
            Total Feedback: {filteredAndSortedFeedback.length}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, feedback or path..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {levels.map(level => (
                    <option key={level} value={level} className="bg-gray-700">
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSort('timestamp')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    sortField === 'timestamp' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Date {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('rating')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    sortField === 'rating' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Rating {sortField === 'rating' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : filteredAndSortedFeedback.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-400 space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>No feedback found</span>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredAndSortedFeedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-gray-300">
                          <User className="h-4 w-4" />
                          <span>{feedback.user_email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-300">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(feedback.timestamp)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < feedback.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-400'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {feedback.documentation && (
                          <button
                            onClick={() => setSelectedDoc(feedback.documentation)}
                            className="p-2 hover:bg-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="View documentation"
                          >
                            <FileText className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(feedback.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                          title="Delete feedback"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <p className="text-white whitespace-pre-wrap">{feedback.feedback}</p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Path:</span>
                        <span className="truncate">{feedback.path}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Level:</span>
                        <span className="capitalize">{feedback.level}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}