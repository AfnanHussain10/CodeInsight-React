import { Users, FileText, Settings, MessageSquare, Code, Star, Layout } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Admin() {
  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: <Users className="h-8 w-8 text-blue-400" />,
      link: '/admin/users'
    },
    {
      title: 'Documentation Overview',
      description: 'View and manage all generated documentation',
      icon: <FileText className="h-8 w-8 text-blue-400" />,
      link: '/admin/documentation'
    },
    {
      title: 'Settings',
      description: 'Configure system settings and preferences',
      icon: <Settings className="h-8 w-8 text-blue-400" />,
      link: '/admin/settings'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">Admin Dashboard</h1>
          <p className="text-gray-400">Manage your application settings and users</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {adminModules.filter(module => !module.primary).map((module) => (
            <Link
              key={module.title}
              to={module.link}
              className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  {module.icon}
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {module.title}
                </h2>
                <p className="text-gray-400">
                  {module.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}