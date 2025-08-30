import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { user, isAdmin: authIsAdmin, loading: authLoading } = useAdminAuth();

  useEffect(() => {
    console.log('🔐 AdminRoute useEffect:', { authLoading, authIsAdmin, user: user?.email });
    if (!authLoading) {
      setIsAdmin(authIsAdmin);
      setLoading(false);
      console.log('🔐 AdminRoute state updated:', { isAdmin: authIsAdmin });
    }
  }, [authLoading, authIsAdmin, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
          >
            <Shield className="w-10 h-10 text-navy" />
          </motion.div>
          <motion.h2 
            className="text-2xl font-bold text-white mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Cash Points
          </motion.h2>
          <motion.p 
            className="text-gold font-semibold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Admin Access Verification
          </motion.p>
          <motion.div 
            className="flex items-center justify-center gap-3 text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verifying admin privileges...</span>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}