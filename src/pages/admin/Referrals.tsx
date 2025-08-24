import React, { useState, useEffect } from 'react';
import { Target, Search, Filter, CheckCircle, XCircle, Eye, DollarSign, TrendingUp, Users, BarChart3, Shield, Activity, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import AdminReferralDashboard from '../../components/admin/AdminReferralDashboard';

interface Referral {
  id: string;
  referrer_id: number;
  referred_id: number;
  status: 'pending' | 'verified' | 'rejected';
  referral_bonus: number;
  verification_date: string | null;
  created_at: string;
  referrer: {
    first_name: string;
    username: string;
  };
  referred: {
    first_name: string;
    username: string;
  };
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    totalBonus: 0
  });

  // Add new state for enhanced analytics
  const [showEnhancedAnalytics, setShowEnhancedAnalytics] = useState(false);
  const [activeView, setActiveView] = useState<'basic' | 'enhanced'>('basic');

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:users!referrals_referrer_id_fkey(first_name, username),
          referred:users!referrals_referred_id_fkey(first_name, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(r => r.status === 'pending').length || 0;
      const verified = data?.filter(r => r.status === 'verified').length || 0;
      const rejected = data?.filter(r => r.status === 'rejected').length || 0;
      const totalBonus = data?.reduce((sum, r) => sum + (r.referral_bonus || 0), 0) || 0;
      
      setStats({ total, pending, verified, rejected, totalBonus });
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = 
      referral.referrer?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrer_id.toString().includes(searchTerm) ||
      referral.referred_id.toString().includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || referral.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleStatusUpdate = async (referralId: string, newStatus: 'verified' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ 
          status: newStatus, 
          verification_date: new Date().toISOString() 
        })
        .eq('id', referralId);

      if (error) throw error;
      
      // Reload referrals
      loadReferrals();
    } catch (error) {
      console.error('Error updating referral status:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800/90 backdrop-blur-sm border-r border-white/10 p-4">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
            <Target className="w-6 h-6 text-navy" />
          </div>
          <motion.h1 
            className="text-xl font-bold text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            BT Community
          </motion.h1>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => window.history.back()}
            className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-300"
          >
            ← Back to Dashboard
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1 
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Referrals Management
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Manage and verify referral relationships in BT Community
          </motion.p>

          {/* View Toggle */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveView('basic')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                activeView === 'basic'
                  ? 'bg-gold text-navy'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Basic Management
            </button>
            <button
              onClick={() => setActiveView('enhanced')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                activeView === 'enhanced'
                  ? 'bg-gold text-navy'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Enhanced Analytics
            </button>
          </div>
        </div>

        {/* Basic Management View */}
        {activeView === 'basic' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <motion.div 
                className="glass p-6 border border-white/10 rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="text-3xl font-bold text-white">{stats.total}</div>
                <div className="text-gray-400">Total Referrals</div>
              </motion.div>
              
              <motion.div 
                className="glass p-6 border border-white/10 rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
                <div className="text-gray-400">Pending</div>
              </motion.div>
              
              <motion.div 
                className="glass p-6 border border-white/10 rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="text-3xl font-bold text-green-400">{stats.verified}</div>
                <div className="text-gray-400">Verified</div>
              </motion.div>
              
              <motion.div 
                className="glass p-6 border border-white/10 rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="text-3xl font-bold text-red-400">{stats.rejected}</div>
                <div className="text-gray-400">Rejected</div>
              </motion.div>
              
              <motion.div 
                className="glass p-6 border border-white/10 rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalBonus)}</div>
                <div className="text-gray-400">Total Bonus</div>
              </motion.div>
            </div>

            {/* Controls */}
            <div className="glass p-6 border border-white/10 rounded-xl mb-8">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search referrals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                    />
                  </div>

                  {/* Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300">
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Analytics
                  </button>
                </div>
              </div>
            </div>

            {/* Referrals Table */}
            <div className="glass border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Referrer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Referred User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bonus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                          Loading referrals...
                        </td>
                      </tr>
                    ) : filteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                          No referrals found
                        </td>
                      </tr>
                    ) : (
                      filteredReferrals.map((referral, index) => (
                        <motion.tr
                          key={referral.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="hover:bg-gray-800/30 transition-colors duration-200"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-white font-semibold text-sm">
                                  {referral.referrer?.first_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">{referral.referrer?.first_name || 'Unknown'}</div>
                                <div className="text-sm text-gray-400">@{referral.referrer?.username || 'No username'}</div>
                                <div className="text-xs text-gray-500">ID: {referral.referrer_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-white font-semibold text-sm">
                                  {referral.referred?.first_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">{referral.referred?.first_name || 'Unknown'}</div>
                                <div className="text-sm text-gray-400">@{referral.referred?.username || 'No username'}</div>
                                <div className="text-xs text-gray-500">ID: {referral.referred_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                              {getStatusIcon(referral.status)}
                              <span className="ml-1 capitalize">{referral.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-white">{formatCurrency(referral.referral_bonus)}</div>
                            <div className="text-xs text-gray-400">BDT Bonus</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-white">{formatDate(referral.created_at)}</div>
                            {referral.verification_date && (
                              <div className="text-xs text-gray-400">
                                Verified: {formatDate(referral.verification_date)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {referral.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleStatusUpdate(referral.id, 'verified')}
                                    className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                                    title="Verify Referral"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(referral.id, 'rejected')}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                    title="Reject Referral"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Enhanced Analytics View */}
        {activeView === 'enhanced' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Enhanced Analytics Header */}
            <div className="glass p-6 border border-white/10 rounded-xl mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-gold" />
                  Enhanced Referral Analytics
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEnhancedAnalytics(!showEnhancedAnalytics)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      showEnhancedAnalytics 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-gold hover:bg-yellow-500 text-navy'
                    }`}
                  >
                    {showEnhancedAnalytics ? 'Hide Dashboard' : 'Show Full Dashboard'}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">0</div>
                  <div className="text-sm text-gray-400">Total Groups</div>
                  <div className="text-xs text-blue-400">Enhanced tracking</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">0</div>
                  <div className="text-sm text-gray-400">Active Referrals</div>
                  <div className="text-xs text-green-400">Real-time data</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">0</div>
                  <div className="text-sm text-gray-400">Conversion Rate</div>
                  <div className="text-xs text-purple-400">AI-powered</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">0</div>
                  <div className="text-sm text-gray-400">Fraud Detection</div>
                  <div className="text-xs text-orange-400">Active monitoring</div>
                </div>
              </div>
            </div>

            {/* Enhanced Dashboard */}
            {showEnhancedAnalytics && (
              <div className="glass p-4 border border-white/10 rounded-xl mb-6">
                <AdminReferralDashboard adminId="admin" />
              </div>
            )}

            {/* Quick Actions */}
            <div className="glass p-6 border border-white/10 rounded-xl mb-6">
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-gold" />
                Enhanced Referral Actions
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="p-4 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-sm font-medium">Export Report</div>
                  </div>
                </button>
                <button className="p-4 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="text-sm font-medium">Set Goals</div>
                  </div>
                </button>
                <button className="p-4 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🔍</div>
                    <div className="text-sm font-medium">Fraud Detection</div>
                  </div>
                </button>
                <button className="p-4 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">⚙️</div>
                    <div className="text-sm font-medium">Settings</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Enhanced Features Info */}
            <div className="glass p-6 border border-blue-500/30 bg-blue-500/10 rounded-xl">
              <h4 className="text-blue-400 font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Enhanced Referral Features
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-300">
                <div>
                  <h5 className="font-medium text-blue-200 mb-3">🎯 Advanced Analytics</h5>
                  <ul className="space-y-2 text-sm">
                    <li>• System-wide referral performance tracking</li>
                    <li>• Group-based referral analysis</li>
                    <li>• Real-time conversion rate monitoring</li>
                    <li>• Trend analysis and predictions</li>
                    <li>• Fraud detection and prevention</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-blue-200 mb-3">📊 Performance Management</h5>
                  <ul className="space-y-2 text-sm">
                    <li>• Individual referral code tracking</li>
                    <li>• Group membership verification</li>
                    <li>• Suspicious activity detection</li>
                    <li>• Automated reporting system</li>
                    <li>• Performance benchmarking</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 