import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAdminAuth from '../hooks/useAdminAuth';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallbackPath?: string;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  children,
  requiredPermission,
  fallbackPath = '/admin/login'
}) => {
  const { isAuthenticated, isLoading, hasPermission, canAccessRoute } = useAdminAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking admin access...</p>
          <p className="text-gray-400 text-sm">Please wait</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-gray-500 text-sm">
            Required permission: <span className="text-gold">{requiredPermission}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-gold text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check route access
  if (!canAccessRoute(location.pathname)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Route Access Denied</h1>
          <p className="text-gray-400 mb-4">
            You don't have permission to access this route.
          </p>
          <p className="text-gray-500 text-sm">
            Route: <span className="text-gold">{location.pathname}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-gold text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default AdminRouteGuard; 