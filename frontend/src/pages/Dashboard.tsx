import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { File, Folder, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/common/Toast';
import { getAuthHeader } from '../lib/auth';

interface Project {
  project_name: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:8000/api/documentation/projects', {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to fetch projects',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (projectName: string, rootPath: string) => {
    navigate('/documentation', { state: { projectName, rootPath}});
  };

  const handleNewProject = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/setup', { state: { userId: user.id } });
  };

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
    <div className="min-h-screen bg-gray-900 py-12">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Your Projects</h1>
            <p className="text-gray-400 mt-2">Welcome back, {user?.email}</p>
          </div>
          <button
            onClick={handleNewProject}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Project</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No projects found. Start by creating a new one!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.project_name}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => handleProjectClick(project.project_name, project.root_path)}
              >
                <div className="flex items-start space-x-3">
                  <Folder className="h-6 w-6 text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {project.project_name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {formatDate(project.created_at)}
                    </p>
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