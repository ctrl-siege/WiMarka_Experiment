import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, BarChart3, FileText, Settings, HelpCircle, Home, CheckSquare } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onShowGuidelines?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onShowGuidelines }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const isActive = (path: string) => location.pathname === path;

  // Navigation items for regular users only (not for admins or evaluators)
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/annotate', icon: FileText, label: 'Annotate' },
    { path: '/my-annotations', icon: BarChart3, label: 'My Annotations' },
  ];

  const adminNavItems = [
    { path: '/admin', icon: Settings, label: 'Admin Dashboard' },
  ];

  const evaluatorNavItems = [
    { path: '/evaluator', icon: CheckSquare, label: 'Evaluator Dashboard' },
    { path: '/my-evaluations', icon: BarChart3, label: 'My Evaluations' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3 lg:space-x-6">
              <Link to="/" className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-primary-500" />
                <span className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">WiMarka - Annotation Tool</span>
              </Link>
              
              <div className="hidden md:flex space-x-1 lg:space-x-2">
                {/* Show user navigation items only for regular users (not admin or evaluator) */}
                {!user?.is_admin && !user?.is_evaluator && navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                ))}
                
                {/* Show admin navigation items only for admin users */}
                {user?.is_admin && adminNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                ))}

                {/* Show evaluator navigation items only for evaluator users */}
                {user?.is_evaluator && evaluatorNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Help Button */}
              {onShowGuidelines && (
                <button
                  onClick={onShowGuidelines}
                  className="group flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                  title="View Guidelines"
                >
                  <HelpCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
                  <span className="transition-all duration-200">Help</span>
                </button>
              )}
              
              <Link
                to="/profile"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {user?.first_name} {user?.last_name}
                  </span>
                  {user?.is_admin && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      Admin
                    </span>
                  )}
                  {user?.is_evaluator && !user?.is_admin && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Evaluator
                    </span>
                  )}
                </div>
              </Link>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout; 