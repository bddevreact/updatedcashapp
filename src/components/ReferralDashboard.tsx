import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Award, Share2, Activity, BarChart3, Calendar, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import ReferralLinkTracker from './ReferralLinkTracker';

interface ReferralDashboardProps {
  telegramId: string;
}

interface ReferralPerformance {
  referral_code: string;
  total_joins: number;
  active_joins: number;
  today_joins: number;
  week_joins: number;
  month_joins: number;
}

interface TopReferrer {
  referrer_id: string;
  username: string;
  first_name: string;
  total_referrals: number;
  active_referrals: number;
}

export default function ReferralDashboard({ telegramId }: ReferralDashboardProps) {
  const [referralPerformance, setReferralPerformance] = useState<ReferralPerformance[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);

  useEffect(() => {
    if (telegramId) {
      loadReferralData();
      loadAvailableGroups();
    }
  }, [telegramId, selectedGroup]);

  const loadReferralData = async () => {
    if (!telegramId) return;

    setIsLoading(true);
    try {
      // Load referral performance - simplified for Firebase
      const performanceQuery = query(
        collection(db, 'referrals'),
        where('referrer_id', '==', telegramId)
      );
      const performanceSnapshot = await getDocs(performanceQuery);
      const performance = performanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Load top referrers - simplified for Firebase
      const topRefsQuery = query(
        collection(db, 'referrals'),
        orderBy('created_at', 'desc'),
        limit(5)
      );
      const topRefsSnapshot = await getDocs(topRefsQuery);
      const topRefs = topRefsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setReferralPerformance(performance || []);
      setTopReferrers(topRefs || []);

    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableGroups = async () => {
    try {
      const groupsQuery = query(
        collection(db, 'referral_joins'),
        where('referrer_id', '==', telegramId)
      );
      const groupsSnapshot = await getDocs(groupsQuery);
      const groups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (groups) {
        const uniqueGroups = [...new Set(groups.map(g => g.group_username).filter(Boolean))];
        setAvailableGroups(uniqueGroups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const getTotalStats = () => {
    if (!referralPerformance.length) return { total: 0, active: 0, today: 0, week: 0, month: 0 };

    return {
      total: referralPerformance.reduce((sum, p) => sum + p.total_joins, 0),
      active: referralPerformance.reduce((sum, p) => sum + p.active_joins, 0),
      today: referralPerformance.reduce((sum, p) => sum + p.today_joins, 0),
      week: referralPerformance.reduce((sum, p) => sum + p.week_joins, 0),
      month: referralPerformance.reduce((sum, p) => sum + p.month_joins, 0)
    };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
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
        <p className="text-gray-400">Loading referral dashboard...</p>
      </div>
    );
  }

  const totalStats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-gold" />
          <h2 className="text-2xl font-bold">Referral Dashboard</h2>
        </div>
        
        {/* Group Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Group:</span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm border border-gray-600"
          >
            <option value="all">All Groups</option>
            {availableGroups.map(group => (
              <option key={group} value={group}>@{group}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <p className="text-2xl font-bold text-blue-400">{formatNumber(totalStats.total)}</p>
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
          <p className="text-sm text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-400">{formatNumber(totalStats.active)}</p>
        </motion.div>

        <motion.div 
          className="glass p-4 text-center border border-yellow-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm text-gray-400">Today</p>
          <p className="text-2xl font-bold text-yellow-400">{formatNumber(totalStats.today)}</p>
        </motion.div>

        <motion.div 
          className="glass p-4 text-center border border-purple-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm text-gray-400">This Week</p>
          <p className="text-2xl font-bold text-purple-400">{formatNumber(totalStats.week)}</p>
        </motion.div>

        <motion.div 
          className="glass p-4 text-center border border-orange-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm text-gray-400">This Month</p>
          <p className="text-2xl font-bold text-orange-400">{formatNumber(totalStats.month)}</p>
        </motion.div>
      </div>

      {/* Referral Performance by Code */}
      {referralPerformance.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold" />
            Performance by Referral Code
          </h3>
          
          <div className="space-y-4">
            {referralPerformance.map((perf, index) => (
              <motion.div
                key={perf.referral_code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-4 bg-gray-700/50 rounded-lg border border-gray-600/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                      <span className="text-navy text-sm font-bold">{perf.referral_code.slice(-2)}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Code: {perf.referral_code}</h4>
                      <p className="text-sm text-gray-400">Total: {perf.total_joins} joins</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gold">{perf.active_joins}</div>
                    <div className="text-xs text-gray-400">Active</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-blue-400">{perf.today_joins}</div>
                    <div className="text-xs text-gray-400">Today</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-400">{perf.week_joins}</div>
                    <div className="text-xs text-gray-400">Week</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-purple-400">{perf.month_joins}</div>
                    <div className="text-xs text-gray-400">Month</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Active Rate</span>
                    <span>{perf.total_joins > 0 ? Math.round((perf.active_joins / perf.total_joins) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-gold to-yellow-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${perf.total_joins > 0 ? (perf.active_joins / perf.total_joins) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Top Referrers */}
      {topReferrers.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-gold" />
            Top Referrers
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
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Referral Link Tracker */}
      {referralPerformance.length > 0 && (
        <ReferralLinkTracker
          telegramId={telegramId}
          referralCode={referralPerformance[0]?.referral_code || 'DEFAULT'}
          groupUsername={selectedGroup === 'all' ? 'bt_community' : selectedGroup}
        />
      )}

      {/* No Data State */}
      {referralPerformance.length === 0 && (
        <div className="glass p-8 text-center">
          <Zap className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Referral Data Yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Start sharing your referral links to see your performance here!
          </p>
          <button className="px-6 py-3 bg-gold text-navy rounded-lg font-semibold hover:bg-yellow-400 transition-colors">
            Create Referral Link
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass p-4">
        <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-gold" />
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-medium">Download Report</div>
            </div>
          </button>
          <button className="p-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
            <div className="text-center">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-sm font-medium">Set Goals</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
} 