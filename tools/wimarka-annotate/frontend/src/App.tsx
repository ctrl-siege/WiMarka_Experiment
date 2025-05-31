import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import AnnotationInterface from './components/AnnotationInterface';
import MyAnnotations from './components/MyAnnotations';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import GuidelinesModal from './components/GuidelinesModal';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Smart redirect component
const SmartRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.is_admin) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

// Public Route Component (redirects to appropriate dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.is_admin) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, markGuidelinesSeen } = useAuth();
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    // Show guidelines modal for authenticated users who haven't seen them
    if (isAuthenticated && user && !user.guidelines_seen) {
      setShowGuidelines(true);
    }
  }, [isAuthenticated, user]);

  const handleGuidelinesAccept = async () => {
    try {
      await markGuidelinesSeen();
      setShowGuidelines(false);
    } catch (error) {
      console.error('Error accepting guidelines:', error);
      // Still close the modal even if the API call fails
      setShowGuidelines(false);
    }
  };

  const handleGuidelinesClose = () => {
    setShowGuidelines(false);
  };

  const handleShowGuidelines = () => {
    setShowGuidelines(true);
  };

  return (
    <Router>
      <Layout onShowGuidelines={handleShowGuidelines}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/annotate" 
            element={
              <ProtectedRoute>
                <AnnotationInterface />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-annotations" 
            element={
              <ProtectedRoute>
                <MyAnnotations />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Only Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* User Only Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirects */}
          <Route path="/" element={<SmartRedirect />} />
          <Route path="*" element={<SmartRedirect />} />
        </Routes>
        
        {/* Guidelines Modal */}
        <GuidelinesModal
          isOpen={showGuidelines}
          onClose={handleGuidelinesClose}
          onAccept={handleGuidelinesAccept}
        />
      </Layout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
