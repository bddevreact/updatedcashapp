import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminUser {
  id: string;
  username: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  lastLogin: string;
}

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is authenticated as admin
  const checkAdminAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check localStorage for admin token
      const adminToken = localStorage.getItem('adminToken');
      const adminUserData = localStorage.getItem('adminUser');
      
      if (!adminToken || !adminUserData) {
        setIsAuthenticated(false);
        setAdminUser(null);
        
        // Redirect to admin login if not on login page
        if (!location.pathname.includes('/admin/login')) {
          navigate('/admin/login', { replace: true });
        }
        return;
      }

      // Validate token (you can add your own validation logic here)
      // For now, we'll just check if it exists
      const userData = JSON.parse(adminUserData);
      
      // Check if token is expired (if you have expiration logic)
      const tokenExpiry = localStorage.getItem('adminTokenExpiry');
      if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
        // Token expired, clear everything
        logout();
        return;
      }

      setIsAuthenticated(true);
      setAdminUser(userData);
      
    } catch (error) {
      console.error('Admin auth check failed:', error);
      setIsAuthenticated(false);
      setAdminUser(null);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Here you would typically make an API call to validate credentials
      // For now, we'll simulate a successful login
      
      // Mock admin user data (replace with actual API call)
      const mockAdminUser: AdminUser = {
        id: 'admin_001',
        username: username,
        role: 'admin',
        permissions: ['users', 'tasks', 'withdrawals', 'referrals', 'settings'],
        lastLogin: new Date().toISOString()
      };

      // Store admin data
      localStorage.setItem('adminToken', 'mock_admin_token_' + Date.now());
      localStorage.setItem('adminUser', JSON.stringify(mockAdminUser));
      localStorage.setItem('adminTokenExpiry', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()); // 24 hours

      setIsAuthenticated(true);
      setAdminUser(mockAdminUser);
      
      // Redirect to admin dashboard
      navigate('/admin/dashboard', { replace: true });
      
      return { success: true, user: mockAdminUser };
      
    } catch (error) {
      console.error('Admin login failed:', error);
      return { success: false, error: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Clear admin data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminTokenExpiry');
    
    setIsAuthenticated(false);
    setAdminUser(null);
    
    // Redirect to admin login
    navigate('/admin/login', { replace: true });
  };

  // Check permissions
  const hasPermission = (permission: string): boolean => {
    if (!adminUser) return false;
    return adminUser.permissions.includes(permission);
  };

  // Check if user can access a specific route
  const canAccessRoute = (route: string): boolean => {
    if (!adminUser) return false;
    
    // Map routes to permissions
    const routePermissions: { [key: string]: string } = {
      '/admin/users': 'users',
      '/admin/tasks': 'tasks',
      '/admin/withdrawals': 'withdrawals',
      '/admin/referrals': 'referrals',
      '/admin/settings': 'settings',
      '/admin/trading-referrals': 'referrals'
    };
    
    const requiredPermission = routePermissions[route];
    if (!requiredPermission) return true; // Allow access if no specific permission required
    
    return hasPermission(requiredPermission);
  };

  // Auto-check auth on mount and route changes
  useEffect(() => {
    checkAdminAuth();
  }, [location.pathname]);

  // Protect admin routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname.startsWith('/admin')) {
      // Don't redirect if already on login page
      if (!location.pathname.includes('/admin/login')) {
        navigate('/admin/login', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  return {
    isAuthenticated,
    isLoading,
    adminUser,
    login,
    logout,
    hasPermission,
    canAccessRoute,
    checkAdminAuth
  };
};

export default useAdminAuth; 