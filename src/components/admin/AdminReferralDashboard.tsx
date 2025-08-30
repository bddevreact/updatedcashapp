import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Award, Share2, Activity, BarChart3, Calendar, Target, Zap, RefreshCw, Settings, Eye, EyeOff, Download, Upload, Filter, Search, UserPlus, UserCheck, UserX, Crown, Star, Medal, Trophy, Gift, DollarSign, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, AlertCircle, Info, HelpCircle, ChevronDown, ChevronUp, Plus, Minus, RotateCcw, Save, Edit, Trash2, Copy, Check, ExternalLink, Link, Hash, Tag, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface AdminReferralDashboardProps {
  adminId: string;
}

interface SystemReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  todayReferrals: number;
  weekReferrals: number;
  monthReferrals: number;
  totalReferrers: number;
  totalGroups: number;
  averageReferralsPerUser: number;
}

interface TopReferrer {
  referrer_id: string;
  username: string;
  first_name: string;
  total_referrals: number;
  active_referrals: number;
  success_rate: number;
}

interface GroupPerformance {
  group_username: string;
  total_joins: number;
  active_joins: number;
  unique_referrers: number;
  conversion_rate: number;
}

interface SuspiciousActivity {
  referrer_id: string;
  username: string;
  suspicious_pattern: string;
  risk_level: 'low' | 'medium' | 'high';
  details: string;
}

export default function AdminReferralDashboard({ adminId }: AdminReferralDashboardProps) {
  const [systemStats, setSystemStats] = useState<SystemReferralStats | null>(null);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [groupPerformance, setGroupPerformance] = useState<GroupPerformance[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  useEffect(() => {
    if (adminId) {
      loadAdminReferralData();
    }
  }, [adminId, selectedPeriod, selectedGroup]);

  const loadAdminReferralData = async () => {
    if (!adminId) return;

    setIsLoading(true);
    try {
      // Load system-wide referral statistics - simplified for Firebase
      const referralsRef = collection(db, 'referrals');
      const referralsQuery = query(
        referralsRef,
        where('status', '==', 'verified'),
        orderBy('created_at', 'desc')
      );
      const referralsSnapshot = await getDocs(referralsQuery);
      const referrals = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate stats manually
      const stats = {
        totalReferrals: referrals.length,
        activeReferrals: referrals.filter((r: any) => r.status === 'verified').length,
        todayReferrals: referrals.filter((r: any) => {
          const today = new Date().toDateString();
          return new Date(r.created_at).toDateString() === today;
        }).length,
        weekReferrals: referrals.filter((r: any) => {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return new Date(r.created_at) >= weekAgo;
        }).length,
        monthReferrals: referrals.filter((r: any) => {
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return new Date(r.created_at) >= monthAgo;
        }).length,
        totalReferrers: new Set(referrals.map((r: any) => r.referrer_id)).size,
        totalGroups: new Set(referrals.map((r: any) => r.group_username)).size,
        averageReferralsPerUser: referrals.length > 0 ? referrals.length / new Set(referrals.map((r: any) => r.referrer_id)).size : 0
      };

      // Load top referrers - simplified for Firebase
      const referrerCounts = referrals.reduce((acc: any, ref: any) => {
        const referrerId = ref.referrer_id;
        if (!acc[referrerId]) {
          acc[referrerId] = { referrer_id: referrerId, total_referrals: 0, verified_referrals: 0 };
        }
        acc[referrerId].total_referrals++;
        if (ref.status === 'verified') {
          acc[referrerId].verified_referrals++;
        }
        return acc;
      }, {});

      const topRefs = Object.values(referrerCounts)
        .sort((a: any, b: any) => b.total_referrals - a.total_referrals)
        .slice(0, 10);

      // Load group performance - simplified for Firebase
      const groupCounts = referrals.reduce((acc: any, ref: any) => {
        const groupUsername = ref.group_username || 'unknown';
        if (!acc[groupUsername]) {
          acc[groupUsername] = { group_username: groupUsername, total_referrals: 0, verified_referrals: 0 };
        }
        acc[groupUsername].total_referrals++;
        if (ref.status === 'verified') {
          acc[groupUsername].verified_referrals++;
        }
        return acc;
      }, {});

      const groups = Object.values(groupCounts);

      // Load suspicious activities - simplified for Firebase
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayReferrals = referrals.filter((r: any) => new Date(r.created_at) >= today);
      const referrerDailyCounts = todayReferrals.reduce((acc: any, ref: any) => {
        const referrerId = ref.referrer_id;
        acc[referrerId] = (acc[referrerId] || 0) + 1;
        return acc;
      }, {});

      const suspicious = Object.entries(referrerDailyCounts)
        .filter(([_, count]) => (count as number) > 50)
        .map(([referrerId, count]) => ({
          referrer_id: referrerId,
          daily_referrals: count,
          risk_level: (count as number) > 100 ? 'high' : (count as number) > 75 ? 'medium' : 'low'
        }));

      setSystemStats(stats || {
        totalReferrals: 0,
        activeReferrals: 0,
        todayReferrals: 0,
        weekReferrals: 0,
        monthReferrals: 0,
        totalReferrers: 0,
        totalGroups: 0,
        averageReferralsPerUser: 0
      });
      setTopReferrers(topRefs as TopReferrer[] || []);
      setGroupPerformance(groups as GroupPerformance[] || []);
      setSuspiciousActivities(suspicious.map((s: any) => ({
        referrer_id: s.referrer_id,
        username: `User ${s.referrer_id.slice(-4)}`,
        suspicious_pattern: 'High daily referral count',
        details: `${s.daily_referrals} referrals in one day`,
        risk_level: s.risk_level
      })) || []);

    } catch (error) {
      console.error('Error loading admin referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  if (isLoading) {
    return (
      <div className="glass p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4"></div>
        <p className="text-gray-400">Loading admin referral dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-gold" />
          <h2 className="text-2xl font-bold">Admin Referral Dashboard</h2>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm border border-gray-600"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Group:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm border border-gray-600"
            >
              <option value="all">All Groups</option>
              {groupPerformance.map(group => (
                <option key={group.group_username} value={group.group_username}>
                  @{group.group_username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* System Overview Stats */}
      {systemStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            className="glass p-4 text-center border border-blue-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">Total Referrals</p>
            <p className="text-2xl font-bold text-blue-400">{formatNumber(systemStats.totalReferrals)}</p>
          </motion.div>

          <motion.div 
            className="glass p-4 text-center border border-green-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">Active Referrals</p>
            <p className="text-2xl font-bold text-green-400">{formatNumber(systemStats.activeReferrals)}</p>
          </motion.div>

          <motion.div 
            className="glass p-4 text-center border border-purple-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">Total Referrers</p>
            <p className="text-2xl font-bold text-purple-400">{formatNumber(systemStats.totalReferrers)}</p>
          </motion.div>

          <motion.div 
            className="glass p-4 text-center border border-orange-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">Avg/User</p>
            <p className="text-2xl font-bold text-orange-400">{systemStats.averageReferralsPerUser.toFixed(1)}</p>
          </motion.div>
        </div>
      )}

      {/* Period-specific Stats */}
      {systemStats && (
        <div className="grid grid-cols-3 gap-4">
          <motion.div 
            className="glass p-4 text-center border border-yellow-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">Today</p>
            <p className="text-xl font-bold text-yellow-400">{formatNumber(systemStats.todayReferrals)}</p>
          </motion.div>

          <motion.div 
            className="glass p-4 text-center border border-indigo-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">This Week</p>
            <p className="text-xl font-bold text-indigo-400">{formatNumber(systemStats.weekReferrals)}</p>
          </motion.div>

          <motion.div 
            className="glass p-4 text-center border border-pink-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">This Month</p>
            <p className="text-xl font-bold text-pink-400">{formatNumber(systemStats.monthReferrals)}</p>
          </motion.div>
        </div>
      )}

      {/* Top Referrers Leaderboard */}
      {topReferrers.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-gold" />
            Top Referrers Leaderboard
          </h3>
          
          <div className="space-y-3">
            {topReferrers.map((referrer, index) => (
              <motion.div
                key={referrer.referrer_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  index === 0 ? 'border-yellow-500/50 bg-yellow-500/10' :
                  index === 1 ? 'border-gray-400/50 bg-gray-400/10' :
                  index === 2 ? 'border-orange-500/50 bg-orange-500/10' :
                  'border-gray-600/30 bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getRankIcon(index + 1)}</div>
                    <div>
                      <h4 className="font-semibold text-white">
                        {referrer.first_name || referrer.username || `User ${referrer.referrer_id.slice(-4)}`}
                      </h4>
                      <p className="text-sm text-gray-400">@{referrer.username || 'No username'}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-gold">{referrer.total_referrals}</div>
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-sm text-green-400">{referrer.active_referrals} active</div>
                    <div className="text-xs text-blue-400">{referrer.success_rate}% success</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Group Performance */}
      {groupPerformance.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold" />
            Group Performance Analysis
          </h3>
          
          <div className="space-y-4">
            {groupPerformance.map((group, index) => (
              <motion.div
                key={group.group_username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-4 bg-gray-700/50 rounded-lg border border-gray-600/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                      <span className="text-navy text-sm font-bold">@{group.group_username.slice(0, 2)}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">@{group.group_username}</h4>
                      <p className="text-sm text-gray-400">{group.total_joins} total joins</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gold">{group.active_joins}</div>
                    <div className="text-xs text-gray-400">Active</div>
                    <div className="text-sm text-green-400">{group.conversion_rate}% conversion</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-blue-400">{group.total_joins}</div>
                    <div className="text-xs text-gray-400">Total Joins</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-400">{group.active_joins}</div>
                    <div className="text-xs text-gray-400">Active</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-purple-400">{group.unique_referrers}</div>
                    <div className="text-xs text-gray-400">Referrers</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Suspicious Activities */}
      {suspiciousActivities.length > 0 && (
        <div className="glass p-6 border border-red-500/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Suspicious Activities Detected
          </h3>
          
          <div className="space-y-3">
            {suspiciousActivities.map((activity, index) => (
              <motion.div
                key={activity.referrer_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getRiskLevelColor(activity.risk_level)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">
                      {activity.username || `User ${activity.referrer_id.slice(-4)}`}
                    </h4>
                    <p className="text-sm text-gray-300">{activity.suspicious_pattern}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.details}</p>
                  </div>
                  
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(activity.risk_level)}`}>
                      {activity.risk_level.toUpperCase()} RISK
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass p-4">
        <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold" />
          Admin Actions
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <button className="p-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-medium">Export Report</div>
            </div>
          </button>
          <button className="p-3 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors">
            <div className="text-center">
              <div className="text-2xl mb-1">⚙️</div>
              <div className="text-sm font-medium">Settings</div>
            </div>
          </button>
          <button className="p-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
            <div className="text-center">
              <div className="text-2xl mb-1">🚫</div>
              <div className="text-sm font-medium">Ban User</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
} 