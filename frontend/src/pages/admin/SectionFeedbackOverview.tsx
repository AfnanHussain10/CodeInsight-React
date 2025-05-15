import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Star, AlertCircle, FileText, User, Calendar, X, Filter, Trash2, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
import { getAuthHeader } from '../../lib/auth';
import Toast from '../../components/common/Toast';

interface SectionFeedback {
  id: number;
  user_id: string;
  user_email: string;
  documentation_id: number;
  section_id: number;
  section_name: string;
  rating: number;
  feedback: string | null;
  created_at: string;
  project_name: string;
}

type SortField = 'created_at' | 'rating' | 'user_email' | 'section_name';
type SortOrder = 'asc' | 'desc';

export default function SectionFeedbackOverview() {
  const location = useLocation();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<SectionFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedProject, setSelectedProject] = useState<string>(
    location.state?.selectedProject || 'all'
  );
  const [projects, setProjects] = useState<string[]>([]);
  const [projectStats, setProjectStats] = useState<{[key: string]: {count: number, avgRating: number}}>({});
  // Add state for tracking expanded projects and sections
  const [expandedProjects, setExpandedProjects] = useState<{[key: string]: boolean}>({});
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [projectMap, setProjectMap] = useState<Map<string, Map<string, SectionFeedback[]>>>(new Map());

  const filteredAndSortedFeedback = feedbacks
    .filter(feedback => 
      (selectedProject === 'all' || feedback.project_name === selectedProject) &&
      (searchTerm === '' || 
        feedback.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (feedback.feedback && feedback.feedback.toLowerCase().includes(searchTerm.toLowerCase())) ||
        feedback.project_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * order;
      }
      if (sortField === 'rating') {
        return (a.rating - b.rating) * order;
      }
      if (sortField === 'section_name') {
        return a.section_name.localeCompare(b.section_name) * order;
      }
      return a.user_email.localeCompare(b.user_email) * order;
    });

  useEffect(() => {
    fetchSectionFeedback();
  }, []);
  
  // Update selectedProject if it changes in location state
  useEffect(() => {
    if (location.state?.selectedProject) {
      setSelectedProject(location.state.selectedProject);
    }
  }, [location.state]);
  
  // Create project map from filtered and sorted feedback
  useEffect(() => {
    // Create a map of project -> section -> feedbacks
    const newProjectMap = new Map<string, Map<string, SectionFeedback[]>>();
    
    filteredAndSortedFeedback.forEach(feedback => {
      if (!newProjectMap.has(feedback.project_name)) {
        newProjectMap.set(feedback.project_name, new Map<string, SectionFeedback[]>());
      }
      
      const sectionMap = newProjectMap.get(feedback.project_name)!;
      if (!sectionMap.has(feedback.section_name)) {
        sectionMap.set(feedback.section_name, []);
      }
      
      sectionMap.get(feedback.section_name)!.push(feedback);
    });
    
    setProjectMap(newProjectMap);
    
    // Initialize expanded state for any new projects
    const projectNames = Array.from(newProjectMap.keys());
    const newExpandedProjects = {...expandedProjects};
    
    projectNames.forEach(name => {
      if (expandedProjects[name] === undefined) {
        newExpandedProjects[name] = true; // Default to expanded
      }
    });
    
    setExpandedProjects(newExpandedProjects);
  }, [filteredAndSortedFeedback, expandedProjects]);

  const fetchSectionFeedback = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch('http://localhost:8000/api/admin/section-feedback', {
        headers
      });

      if (!response.ok) throw new Error('Failed to fetch section feedback');
      const data = await response.json();
      setFeedbacks(data);
      
      // Extract unique project names
      const uniqueProjects = Array.from(new Set(data.map((f: SectionFeedback) => f.project_name)));
      setProjects(['all', ...uniqueProjects]);
      
      // Calculate project statistics
      const stats: {[key: string]: {count: number, avgRating: number}} = {};
      uniqueProjects.forEach(project => {
        const projectFeedbacks = data.filter((f: SectionFeedback) => f.project_name === project);
        const totalRating = projectFeedbacks.reduce((sum: number, f: SectionFeedback) => sum + f.rating, 0);
        stats[project] = {
          count: projectFeedbacks.length,
          avgRating: totalRating / projectFeedbacks.length
        };
      });
      setProjectStats(stats);
    } catch (error) {
      showToast('Failed to fetch section feedback', 'error');
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

      const response = await fetch(`http://localhost:8000/api/admin/section-feedback/${feedbackId}`, {
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



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
        <div className="flex justify-between items-center mb-6">
          <div className="text-gray-400">
            Total Feedback: {filteredAndSortedFeedback.length}
          </div>
        </div>
        
        {/* Project Cards */}
        {projects.length > 1 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div 
                className={`bg-gray-700 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${selectedProject === 'all' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSelectedProject('all')}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">All Projects</h3>
                </div>
                <div className="text-gray-300 text-sm">
                  <p>Total Feedback: {feedbacks.length}</p>
                  <p>Average Rating: {(feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)}/5</p>
                </div>
              </div>
              
              {projects.filter(p => p !== 'all').map(project => (
                <div 
                  key={project}
                  className={`bg-gray-700 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${selectedProject === project ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{project}</h3>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < Math.round(projectStats[project]?.avgRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm">
                    <p>Feedback: {projectStats[project]?.count || 0}</p>
                    <p>Average Rating: {(projectStats[project]?.avgRating || 0).toFixed(1)}/5</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, section name or feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {projects.map(project => (
                    <option key={project} value={project} className="bg-gray-700">
                      {project === 'all' ? 'All Projects' : project}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSort('created_at')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    sortField === 'created_at' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Date {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('rating')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    sortField === 'rating' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Rating {sortField === 'rating' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('section_name')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    sortField === 'section_name' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Section {sortField === 'section_name' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                <span>No section feedback found</span>
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Group feedbacks by project and section */}
                {Array.from(projectMap.entries()).map(([projectName, sectionMap]) => {
                    const projectExpanded = expandedProjects[projectName] !== false; // Default to true if undefined
                    const toggleProjectExpanded = () => {
                      setExpandedProjects(prev => ({
                        ...prev,
                        [projectName]: !projectExpanded
                      }));
                    };
                    
                    const projectFeedbackCount = Array.from(sectionMap.values()).reduce(
                      (count, feedbacks) => count + feedbacks.length, 0
                    );
                    
                    return (
                      <div key={projectName} className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
                        {/* Project header */}
                        <div 
                          className="bg-gray-600 px-4 py-3 flex items-center justify-between cursor-pointer"
                          onClick={toggleProjectExpanded}
                        >
                          <div className="flex items-center space-x-2">
                            {projectExpanded ? 
                              <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            }
                            <FileText className="h-5 w-5 text-blue-400" />
                            <h3 className="font-semibold text-white">
                              {projectName} <span className="text-gray-300 text-sm">({projectFeedbackCount} feedbacks)</span>
                            </h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(projectName);
                              }}
                              className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                              title="Filter by this project"
                            >
                              <Filter className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Sections */}
                        {projectExpanded && (
                          <div className="divide-y divide-gray-600">
                            {Array.from(sectionMap.entries()).map(([sectionName, feedbacks]) => {
                              // Create a unique key for this section
                              const sectionKey = `${projectName}-${sectionName}`;
                              const sectionExpanded = expandedSections[sectionKey] === true; // Default to false
                              
                              const toggleSectionExpanded = () => {
                                setExpandedSections(prev => ({
                                  ...prev,
                                  [sectionKey]: !sectionExpanded
                                }));
                              };
                              
                              return (
                                <div key={sectionName} className="bg-gray-700">
                                  {/* Section header */}
                                  <div 
                                    className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-650"
                                    onClick={toggleSectionExpanded}
                                  >
                                    <div className="flex items-center space-x-2">
                                      {sectionExpanded ? 
                                        <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                      }
                                      <div className="ml-4 flex items-center space-x-2">
                                        <span className="text-white">{sectionName}</span>
                                        <span className="text-gray-400 text-sm">({feedbacks.length})</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {/* Average rating for this section */}
                                      <div className="flex items-center space-x-1 bg-gray-800 px-2 py-1 rounded-full">
                                        {Array.from({ length: 5 }).map((_, i) => {
                                          const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
                                          return (
                                            <Star
                                              key={i}
                                              className={`h-3 w-3 ${
                                                i < Math.round(avgRating)
                                                  ? 'text-yellow-400 fill-yellow-400'
                                                  : 'text-gray-500'
                                              }`}
                                            />
                                          );
                                        })}
                                        <span className="ml-1 text-white text-xs">
                                          {(feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Feedback items */}
                                  {sectionExpanded && (
                                    <div className="pl-10 pr-4 py-2 space-y-3">
                                      {feedbacks.map(feedback => (
                                        <div key={feedback.id} className="bg-gray-750 rounded-lg p-3 hover:bg-gray-800 transition-all">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-3">
                                              <div className="flex items-center space-x-1 text-gray-300 text-sm">
                                                <User className="h-3.5 w-3.5" />
                                                <span>{feedback.user_email}</span>
                                              </div>
                                              <div className="flex items-center space-x-1 text-gray-300 text-sm">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{formatDate(feedback.created_at)}</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                              <div className="flex items-center space-x-0.5">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                  <Star
                                                    key={i}
                                                    className={`h-3.5 w-3.5 ${
                                                      i < feedback.rating
                                                        ? 'text-yellow-400 fill-yellow-400'
                                                        : 'text-gray-500'
                                                    }`}
                                                  />
                                                ))}
                                              </div>
                                              <button
                                                onClick={() => handleDelete(feedback.id)}
                                                className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors ml-2"
                                                title="Delete feedback"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          {feedback.feedback ? (
                                            <div className="bg-gray-800 rounded p-2 text-sm text-white">
                                              <p className="whitespace-pre-wrap leading-relaxed">{feedback.feedback}</p>
                                            </div>
                                          ) : (
                                            <div className="text-xs text-gray-400 italic">
                                              <span>Rating only</span>
                                            </div>
                                          )}
                                          
                                          <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                                            <span>Section ID: {feedback.section_id}</span>
                                            <span>Doc ID: {feedback.documentation_id}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}