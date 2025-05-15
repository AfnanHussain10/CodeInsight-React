import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Features from './pages/Features';
import About from './pages/About';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import DocumentationOverview from './pages/admin/DocumentationOverview';
import DocumentationSections from './pages/admin/DocumentationSections';
import FeedbackOverview from './pages/admin/FeedbackOverview';
import SectionFeedbackOverview from './pages/admin/SectionFeedbackOverview';
import Settings from './pages/admin/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Documentation from './pages/Documentation';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-900">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/features" element={<Features />} />
            <Route path="/about" element={<About />} />
            
            {/* Protected Routes */}
            <Route path="/setup" element={
              <ProtectedRoute>
                <Setup />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/documentation" element={
              <ProtectedRoute>
                <Documentation />
              </ProtectedRoute>
            } />
            <Route path="/documentation/:id" element={
              <ProtectedRoute>
                <Documentation />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requireAdmin>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/documentation" element={
              <ProtectedRoute requireAdmin>
                <DocumentationOverview />
              </ProtectedRoute>
            } />
            <Route path="/admin/documentation-sections" element={
              <ProtectedRoute requireAdmin>
                <DocumentationSections />
              </ProtectedRoute>
            } />
            <Route path="/admin/feedback" element={
              <ProtectedRoute requireAdmin>
                <FeedbackOverview />
              </ProtectedRoute>
            } />
            <Route path="/admin/section-feedback" element={
              <ProtectedRoute requireAdmin>
                <SectionFeedbackOverview />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requireAdmin>
                <Settings />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;