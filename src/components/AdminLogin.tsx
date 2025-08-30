import React, { useState } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';

const AdminLogin: React.FC = () => {
  const { adminLogin, logout, user, loading, error, isAdmin } = useAdminAuth();
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = async () => {
    const success = await adminLogin();
    if (success) {
      setShowLogin(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto mt-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">👑 Admin Panel</h2>
          <p className="text-gray-600 mt-2">Welcome, Admin!</p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Admin Access Granted
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You have full administrative privileges
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Admin Info</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>UID:</strong> {user?.uid}</p>
              <p><strong>Role:</strong> Admin</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto mt-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🔐 Admin Login</h2>
        <p className="text-gray-600 mt-2">Access administrative panel</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                Login Error
              </p>
              <p className="text-sm text-red-700 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Admin Credentials</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Email:</strong> cashpoints@gmail.com</p>
            <p><strong>Password:</strong> admin123</p>
          </div>
        </div>
        
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Logging in...
            </div>
          ) : (
            '🔑 Login as Admin'
          )}
        </button>
        
        <div className="text-center">
          <button
            onClick={() => setShowLogin(!showLogin)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showLogin ? 'Hide' : 'Show'} Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
