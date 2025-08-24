
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BalanceCard from '../components/BalanceCard';
import StatsCardsRow from '../components/StatsCards';
import RecentActivity from '../components/RecentActivity';
import NotificationCenter from '../components/NotificationCenter';
import LiveActivityFeed from '../components/LiveActivityFeed';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { Users, CheckSquare, TrendingUp, Gift, DollarSign, Calendar, Target, RefreshCw, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { 
    balance, 
    level, 
    stats, 
    realTimeData,
    telegramId
  } = useUserStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Referral stats from store
  const referralStats = {
    today: stats.todayReferrals || 0,
    thisWeek: stats.thisWeekReferrals || 0,
    total: stats.referralsCount || 0
  };

  // Calculate level progress
  const currentLevelReferrals = stats.referralsCount || 0;
  const nextLevelTarget = level * 50; // 50 referrals per level
  const levelProgress = Math.min((currentLevelReferrals / nextLevelTarget) * 100, 100);
  const nextLevelReferrals = Math.max(0, nextLevelTarget - currentLevelReferrals);

  // Enhanced real-time data
  const [isOnline, setIsOnline] = useState(true);
  const [currentActivity, setCurrentActivity] = useState('Active in BT Community');
  const [lastSeen, setLastSeen] = useState<Date>(new Date());
      
  // Load real-time stats from database automatically
  const loadRealTimeStats = async () => {
    if (!telegramId) return;
    
    try {
      // Load today's earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayEarnings, error: earningsError } = await supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', telegramId)
        .gte('created_at', today.toISOString());

      if (earningsError) throw earningsError;

      const todayTotal = todayEarnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Load this week's earnings
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: weekEarnings, error: weekError } = await supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', telegramId)
        .gte('created_at', weekAgo.toISOString());

      if (weekError) throw weekError;

      const weekTotal = weekEarnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Load total earnings
      const { data: totalEarnings, error: totalError } = await supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', telegramId);

      if (totalError) throw totalError;

      const total = totalEarnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Log stats for debugging
      console.log('Real-time stats loaded:', {
        today: todayTotal,
        week: weekTotal,
        total: total
      });

    } catch (error) {
      console.error('Error loading real-time stats:', error);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadRealTimeStats();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadRealTimeStats();
  }, [telegramId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadRealTimeStats, 30000);
    return () => clearInterval(interval);
  }, [telegramId]);

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* Header */}
      <Header level={level} />

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Balance Card */}
        <BalanceCard 
          balance={balance}
          fiatValue={balance}
          percentChange={0}
        />

        {/* Stats Cards Row */}
        <StatsCardsRow 
          currentLevel={level}
          totalReferrals={referralStats.total}
          nextLevelReferrals={nextLevelReferrals}
        />

        {/* Level Progress Section */}
        <motion.div 
          className="glass p-6 rounded-xl border border-gold/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Level Progress
            </h3>
            <span className="text-sm text-gray-400">Level {level}</span>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Current Referrals: {currentLevelReferrals}</span>
              <span>Next Level: {nextLevelTarget}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-gold to-yellow-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {nextLevelReferrals > 0 
                ? `${nextLevelReferrals} more referrals needed for next level`
                : 'Level up achieved! 🎉'
              }
            </p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.button
            onClick={() => navigate('/tasks')}
            className="glass p-4 rounded-xl border border-gold/20 text-center hover:border-gold/40 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckSquare className="w-8 h-8 text-gold mx-auto mb-2" />
            <span className="font-semibold">Daily Tasks</span>
          </motion.button>

          <motion.button
            onClick={() => navigate('/referrals')}
            className="glass p-4 rounded-xl border border-gold/20 text-center hover:border-gold/40 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Users className="w-8 h-8 text-gold mx-auto mb-2" />
            <span className="font-semibold">Earn</span>
          </motion.button>
        </motion.div>

        {/* Recent Activity */}
        <RecentActivity activities={[]} />

        {/* Notification Center */}
        <NotificationCenter userId={telegramId || '0'} />

        {/* Live Activity Feed */}
        <LiveActivityFeed />

        {/* Refresh Button */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="glass px-6 py-3 rounded-lg border border-gold/20 hover:border-gold/40 transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
