import React, { useState, useEffect } from 'react';
import { Target, Search, Filter, CheckCircle, XCircle, Eye, DollarSign, TrendingUp, Users, BarChart3, Shield, Activity, Info, Link, UserCheck, UserX, RefreshCw, Zap, Award, Calendar, Globe } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, doc, updateDoc, deleteDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

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
    referral_code?: string;
  };
  referred: {
    first_name: string;
    username: string;
  };
}

interface ReferralCode {
  id: string;
  user_id: number;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  total_clicks: number;
  total_conversions: number;
  user: {
    first_name: string;
    username: string;
  };
}

interface EnhancedStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  totalBonus: number;
  totalReferralCodes: number;
  activeReferralCodes: number;
  totalGroupVerifications: number;
  pendingGroupVerifications: number;
  todayReferrals: number;
  weekReferrals: number;
  monthReferrals: number;
  conversionRate: number;
}

interface FirebaseReferralData {
  id: string;
  created_at?: string;
  status?: string;
  referral_bonus?: number;
  [key: string]: any;
}

interface FirebaseCodeData {
  id: string;
  total_clicks?: number;
  total_conversions?: number;
  is_active?: boolean;
  [key: string]: any;
}

interface FirebaseVerificationData {
  id: string;
  status?: string;
  [key: string]: any;
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState<EnhancedStats>({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    totalBonus: 0,
    totalReferralCodes: 0,
    activeReferralCodes: 0,
    totalGroupVerifications: 0,
    pendingGroupVerifications: 0,
    todayReferrals: 0,
    weekReferrals: 0,
    monthReferrals: 0,
    conversionRate: 0
  });

  // Add new state for enhanced analytics
  const [showEnhancedAnalytics, setShowEnhancedAnalytics] = useState(false);
  const [activeView, setActiveView] = useState<'basic' | 'enhanced' | 'codes' | 'analytics'>('basic');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    loadAllData();
  }, [selectedPeriod]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadReferrals(),
        loadReferralCodes(),
        loadEnhancedStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferrals = async () => {
    try {
      const referralsQuery = query(
        collection(db, 'referrals'),
        orderBy('created_at', 'desc')
      );
      const referralsSnapshot = await getDocs(referralsQuery);
      const referralsData = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load user data for each referral
      const referralsWithUsers = await Promise.all(
        referralsData.map(async (referral: any) => {
          let referrerData = null;
          let referredData = null;
          
          if (referral.referrer_id) {
            const referrerDoc = await getDoc(doc(db, 'users', referral.referrer_id));
            if (referrerDoc.exists()) {
              referrerData = referrerDoc.data();
            }
          }
          
          if (referral.referred_id) {
            const referredDoc = await getDoc(doc(db, 'users', referral.referred_id));
            if (referredDoc.exists()) {
              referredData = referredDoc.data();
            }
          }
          
          return {
            ...referral,
            referrer: referrerData ? {
              first_name: referrerData.first_name,
              username: referrerData.username,
              referral_code: referrerData.referral_code
            } : null,
            referred: referredData ? {
              first_name: referredData.first_name,
              username: referredData.username
            } : null
          };
        })
      );
      
      setReferrals(referralsWithUsers);
    } catch (error) {
      console.error('Error loading referrals:', error);
    }
  };

  const loadReferralCodes = async () => {
    try {
      const codesSnapshot = await getDocs(collection(db, 'referralCodes'));
      const codesData = codesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load user data for each code
      const codesWithUsers = await Promise.all(
        codesData.map(async (code: any) => {
          if (code.user_id) {
                    // Query user by telegram_id since user_id is the telegram_id, not document ID
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('telegram_id', '==', code.user_id), limit(1));
        const userSnapshot = await getDocs(userQuery);
        const userDoc = userSnapshot.empty ? null : userSnapshot.docs[0];
        if (userDoc && userDoc.exists()) {
              const userData = userDoc.data();
              return {
                ...code,
                user: {
                  first_name: userData.first_name,
                  username: userData.username
                }
              };
            }
          }
          return code;
        })
      );
      
      setReferralCodes(codesWithUsers);
    } catch (error) {
      console.error('Error loading referral codes:', error);
    }
  };

  const loadEnhancedStats = async () => {
    try {
      // Load basic referral stats
      const referralsSnapshot = await getDocs(collection(db, 'referrals'));
      const referralsData = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FirebaseReferralData[];

      // Load referral codes stats
      const codesSnapshot = await getDocs(collection(db, 'referralCodes'));
      const codesData = codesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FirebaseCodeData[];

      // Load group membership verifications
      const verificationsSnapshot = await getDocs(collection(db, 'group_membership_verification'));
      const verificationsData = verificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FirebaseVerificationData[];

      // Calculate period-based stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todayReferrals = referralsData?.filter(r => r.created_at && new Date(r.created_at) >= today).length || 0;
      const weekReferrals = referralsData?.filter(r => r.created_at && new Date(r.created_at) >= weekAgo).length || 0;
      const monthReferrals = referralsData?.filter(r => r.created_at && new Date(r.created_at) >= monthAgo).length || 0;

      // Calculate conversion rate
      const totalClicks = codesData?.reduce((sum, code) => sum + (code.total_clicks || 0), 0) || 0;
      const totalConversions = codesData?.reduce((sum, code) => sum + (code.total_conversions || 0), 0) || 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      setStats({
        total: referralsData?.length || 0,
        pending: referralsData?.filter(r => r.status === 'pending').length || 0,
        verified: referralsData?.filter(r => r.status === 'verified').length || 0,
        rejected: referralsData?.filter(r => r.status === 'rejected').length || 0,
        totalBonus: referralsData?.reduce((sum, r) => sum + (r.referral_bonus || 0), 0) || 0,
        totalReferralCodes: codesData?.length || 0,
        activeReferralCodes: codesData?.filter(c => c.is_active).length || 0,
        totalGroupVerifications: verificationsData?.length || 0,
        pendingGroupVerifications: verificationsData?.filter(v => v.status === 'pending').length || 0,
        todayReferrals,
        weekReferrals,
        monthReferrals,
        conversionRate
      });
    } catch (error) {
      console.error('Error loading enhanced stats:', error);
    }
  };

  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = 
      referral.referrer?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrer_id.toString().includes(searchTerm) ||
      referral.referred_id.toString().includes(searchTerm) ||
      referral.referrer?.referral_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || referral.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleStatusUpdate = async (referralId: string, newStatus: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'referrals', referralId), {
        status: newStatus,
        verification_date: new Date().toISOString(),
        updated_at: serverTimestamp()
      });
      
      // Reload data
      loadAllData();
    } catch (error) {
      console.error('Error updating referral status:', error);
    }
  };

  const handleReferralCodeToggle = async (codeId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'referralCodes', codeId), {
        is_active: isActive,
        updated_at: serverTimestamp()
      });
      
      // Reload data
      loadAllData();
    } catch (error) {
      console.error('Error updating referral code status:', error);
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

  const generateReferralLink = (referralCode: string) => {
    return `https://t.me/CashPoinntbot?start=${referralCode}`;
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
            Cash Points
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
            Enhanced Referrals Management
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Manage referral system with group verification and enhanced analytics
          </motion.p>

          {/* View Toggle */}
          <div className="mt-4 flex gap-2 flex-wrap">
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
            <button
              onClick={() => setActiveView('codes')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                activeView === 'codes'
                  ? 'bg-gold text-navy'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Referral Codes
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                activeView === 'analytics'
                  ? 'bg-gold text-navy'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Performance Analytics
            </button>
          </div>
        </div>

        {/* Enhanced Stats Dashboard */}
        <motion.div 
          className="glass p-6 border border-white/10 rounded-xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gold" />
              Enhanced Referral Statistics
            </h3>
            <button
              onClick={loadAllData}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Referrals</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{stats.verified}</div>
              <div className="text-sm text-gray-400">Verified</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{stats.totalReferralCodes}</div>
              <div className="text-sm text-gray-400">Referral Codes</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">{stats.activeReferralCodes}</div>
              <div className="text-sm text-gray-400">Active Codes</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalBonus)}</div>
              <div className="text-sm text-gray-400">Total Rewards</div>
            </div>
          </div>

          {/* Period-based stats */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-800/30 rounded-lg">
              <div className="text-lg font-bold text-green-400">{stats.todayReferrals}</div>
              <div className="text-xs text-gray-400">Today</div>
            </div>
            <div className="text-center p-3 bg-gray-800/30 rounded-lg">
              <div className="text-lg font-bold text-blue-400">{stats.weekReferrals}</div>
              <div className="text-xs text-gray-400">This Week</div>
            </div>
            <div className="text-center p-3 bg-gray-800/30 rounded-lg">
              <div className="text-lg font-bold text-purple-400">{stats.monthReferrals}</div>
              <div className="text-xs text-gray-400">This Month</div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="mt-4 p-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{stats.conversionRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-300">Overall Conversion Rate</div>
            </div>
          </div>
        </motion.div>

        {/* Content based on active view */}
        {activeView === 'basic' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* Search and Filter */}
            <div className="glass p-6 border border-white/10 rounded-xl mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by name, ID, or referral code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gold"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Referrals List */}
            <div className="glass p-6 border border-white/10 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                Referrals ({filteredReferrals.length})
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading referrals...</p>
                </div>
              ) : filteredReferrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No referrals found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReferrals.map((referral) => (
                    <div key={referral.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(referral.status)}
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(referral.status)}`}>
                                {referral.status}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {referral.referrer?.first_name || 'Unknown'} → {referral.referred?.first_name || 'Unknown'}
                              </p>
                              <p className="text-sm text-gray-400">
                                Referrer: @{referral.referrer?.username || 'unknown'} | 
                                Referred: @{referral.referred?.username || 'unknown'}
                              </p>
                              {referral.referrer?.referral_code && (
                                <p className="text-xs text-blue-400">
                                  Code: {referral.referrer.referral_code}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-400">
                            <span>Bonus: {formatCurrency(referral.referral_bonus || 0)}</span>
                            <span className="mx-2">•</span>
                            <span>{formatDate(referral.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {referral.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(referral.id, 'verified')}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-all duration-300"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(referral.id, 'rejected')}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-all duration-300"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-all duration-300">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'codes' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="glass p-6 border border-white/10 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Link className="w-5 h-5 text-gold" />
                Referral Codes Management
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading referral codes...</p>
                </div>
              ) : referralCodes.length === 0 ? (
                <div className="text-center py-8">
                  <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No referral codes found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referralCodes.map((code) => (
                    <div key={code.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {code.is_active ? (
                                <UserCheck className="w-4 h-4 text-green-400" />
                              ) : (
                                <UserX className="w-4 h-4 text-red-400" />
                              )}
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                code.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {code.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {code.user?.first_name || 'Unknown'} (@{code.user?.username || 'unknown'})
                              </p>
                              <p className="text-sm text-blue-400 font-mono">
                                Code: {code.referral_code}
                              </p>
                              <p className="text-xs text-gray-400">
                                Clicks: {code.total_clicks || 0} | Conversions: {code.total_conversions || 0}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-gray-400">
                              Link: {generateReferralLink(code.referral_code)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Created: {formatDate(code.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReferralCodeToggle(code.id, !code.is_active)}
                            className={`px-3 py-1 rounded text-sm transition-all duration-300 ${
                              code.is_active
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {code.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-all duration-300">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="glass p-6 border border-white/10 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gold" />
                Performance Analytics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Group Verification Stats */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Group Verification
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Verifications:</span>
                      <span className="text-white font-semibold">{stats.totalGroupVerifications}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pending Verifications:</span>
                      <span className="text-yellow-400 font-semibold">{stats.pendingGroupVerifications}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Success Rate:</span>
                      <span className="text-green-400 font-semibold">
                        {stats.totalGroupVerifications > 0 
                          ? ((stats.totalGroupVerifications - stats.pendingGroupVerifications) / stats.totalGroupVerifications * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Referral Performance */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    Referral Performance
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Referrers:</span>
                      <span className="text-white font-semibold">{stats.activeReferralCodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Conversion Rate:</span>
                      <span className="text-green-400 font-semibold">{stats.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg. Reward per Referral:</span>
                      <span className="text-gold font-semibold">৳2.00</span>
                    </div>
                  </div>
                </div>

                {/* Period Performance */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    Period Performance
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Today:</span>
                      <span className="text-green-400 font-semibold">{stats.todayReferrals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">This Week:</span>
                      <span className="text-blue-400 font-semibold">{stats.weekReferrals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">This Month:</span>
                      <span className="text-purple-400 font-semibold">{stats.monthReferrals}</span>
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    System Health
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Users:</span>
                      <span className="text-white font-semibold">{stats.total + stats.totalReferralCodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active System:</span>
                      <span className="text-green-400 font-semibold">✅ Online</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Updated:</span>
                      <span className="text-gray-300 font-semibold">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'enhanced' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="glass p-6 border border-white/10 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-gold" />
                Enhanced Referral System Features
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">🔄 Auto-Start Triggers</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Referral links automatically start the bot with referral codes
                  </p>
                  <div className="text-xs text-gray-400">
                    Format: t.me/botname?start=REFERRAL_CODE
                  </div>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">👥 Group Membership</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Users must join required group to access Mini App
                  </p>
                  <div className="text-xs text-gray-400">
                    Group: Bull Trading Community (BD)
                  </div>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">💰 Fixed Rewards</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Consistent ৳2 reward for each successful referral
                  </p>
                  <div className="text-xs text-gray-400">
                    Automatic balance updates
                  </div>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3">📊 Enhanced Analytics</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Real-time tracking and performance metrics
                  </p>
                  <div className="text-xs text-gray-400">
                    Conversion rates and user behavior
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 
