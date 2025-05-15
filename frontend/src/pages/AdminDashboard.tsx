import { useState } from 'react';
import { Users, FileText, Settings, MessageSquare, Code, Star, Search, Filter } from 'lucide-react';
import UserManagement from './admin/UserManagement';
import DocumentationOverview from './admin/DocumentationOverview';
import DocumentationSections from './admin/DocumentationSections';
import FeedbackOverview from './admin/FeedbackOverview';
import SectionFeedbackOverview from './admin/SectionFeedbackOverview';
import AdminSettings from './admin/Settings';

type TabType = 'users' | 'documentation' | 'sections' | 'feedback' | 'section-feedback' | 'settings';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    {
      id: 'users' as TabType,
      title: 'User Management',
      icon: <Users className="h-5 w-5" />
    },
    {
      id: 'documentation' as TabType,
      title: 'Documentation',
      icon: <FileText className="h-5 w-5" />
    },
    {
      id: 'sections' as TabType,
      title: 'Doc Sections',
      icon: <Code className="h-5 w-5" />
    },
    {
      id: 'feedback' as TabType,
      title: 'Feedback',
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      id: 'section-feedback' as TabType,
      title: 'Section Feedback',
      icon: <Star className="h-5 w-5" />
    },
    {
      id: 'settings' as TabType,
      title: 'Settings',
      icon: <Settings className="h-5 w-5" />
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'documentation':
        return <DocumentationOverview />;
      case 'sections':
        return <DocumentationSections />;
      case 'feedback':
        return <FeedbackOverview />;
      case 'section-feedback':
        return <SectionFeedbackOverview />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search across all admin data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide mb-6 bg-gray-800 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            >
              {tab.icon}
              <span>{tab.title}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-transparent">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}