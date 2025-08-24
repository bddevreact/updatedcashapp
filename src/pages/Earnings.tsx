import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, BarChart3, Target, DollarSign, RefreshCw, Activity, Zap } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import EarningsAnalytics from '../components/EarningsAnalytics';

interface Earning {
  id: string;
  type: string;
  amount: number;
  time: string;
  isLive: boolean;
  created_at: string;
}

interface UserStats {
  total_earnings: number;
  total_referrals: number;
  balance: number;
  level: number;
  experience_points: number;
}

export default function Earnings() {
  const { balance, stats, addNotification, telegramId } = useUserStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [liveEarnings, setLiveEarnings] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);

  // Real-time updates hook
  const { isUpdating, forceUpdate } = useRealTimeUpdates({
    interval: 25000, // 25 seconds for earnings
    onUpdate: () => {
      setLastUpdate(new Date());
      updateLiveEarnings();
    }
  });

  const updateLiveEarnings = () => {
    // Real-time earnings updates will be handled by actual API calls
    setLastUpdate(new Date());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await forceUpdate();
      await loadEarningsData();
      await loadUserStats();
      setLastUpdate(new Date());
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Earnings data refreshed successfully!'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to refresh earnings data'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      loadEarningsData();
    }
  };

  // Load user stats from database
  const loadUserStats = async () => {
    if (!telegramId) {
      setIsLoading(false);
      return;
    }

    try {
      // Use the user_earnings_summary view for better performance
      const { data: userData, error: userError } = await supabase
        .from('user_earnings_summary')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (userError) {
        // Fallback to direct users table query if view doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('total_earnings, total_referrals, balance, level, experience_points')
          .eq('telegram_id', telegramId)
          .single();

        if (fallbackError) {
          console.error('Error loading user stats:', fallbackError);
          // Set default values if both queries fail
          setUserStats({
            total_earnings: 0,
            total_referrals: 0,
            balance: 0,
            level: 1,
            experience_points: 0
          });
        } else {
          setUserStats(fallbackData);
        }
      } else {
        setUserStats(userData);
      }

      // Set loading to false after stats are loaded
      setIsLoading(false);

    } catch (error) {
      console.error('Error loading user stats:', error);
      // Set default values on error
      setUserStats({
        total_earnings: 0,
        total_referrals: 0,
        balance: 0,
        level: 1,
        experience_points: 0
      });
      setIsLoading(false);
    }
  };

  const loadEarningsData = async () => {
    if (!telegramId) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to use the recent_earnings view first
      const { data: recentEarningsData, error: recentError } = await supabase
        .from('recent_earnings')
        .select('*')
        .eq('user_id', telegramId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentError) {
        // Fallback to direct earnings table query
        const { data: earnings, error: earningsError } = await supabase
          .from('earnings')
          .select('*')
          .eq('user_id', telegramId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (earningsError) {
          console.error('Error loading earnings:', earningsError);
          // Set empty arrays on error
          setEarningsHistory([]);
          setLiveEarnings([]);
          setIsLoading(false);
          return;
        }

        // Transform earnings data
        const earningsHistory = earnings?.map((earning: any) => ({
          id: earning.id,
          type: earning.source || 'task',
          amount: earning.amount || 0,
          time: formatTimeAgo(new Date(earning.created_at)),
          isLive: false,
          created_at: earning.created_at
        })) || [];

        setEarningsHistory(earningsHistory);

        // Load live earnings (recent earnings in last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentEarnings = earnings?.filter((e: any) => 
          new Date(e.created_at) >= oneHourAgo
        ).map((earning: any) => ({
          id: earning.id,
          type: earning.source || 'task',
          amount: earning.amount || 0,
          time: formatTimeAgo(new Date(earning.created_at)),
          isLive: true,
          created_at: earning.created_at
        })) || [];

        setLiveEarnings(recentEarnings);
      } else {
        // Use data from the view
        const earningsHistory = recentEarningsData?.map((earning: any) => ({
          id: earning.id,
          type: earning.source || 'task',
          amount: earning.amount || 0,
          time: formatTimeAgo(new Date(earning.created_at)),
          isLive: earning.status === 'LIVE',
          created_at: earning.created_at
        })) || [];

        setEarningsHistory(earningsHistory);

        // Filter live earnings from view data
        const liveEarnings = recentEarningsData?.filter((e: any) => 
          e.status === 'LIVE'
        ).map((earning: any) => ({
          id: earning.id,
          type: earning.source || 'task',
          amount: earning.amount || 0,
          time: formatTimeAgo(new Date(earning.created_at)),
          isLive: true,
          created_at: earning.created_at
        })) || [];

        setLiveEarnings(liveEarnings);
      }

      setLastUpdate(new Date());
      setIsLoading(false);

    } catch (error) {
      console.error('Error loading earnings data:', error);
      // Set empty arrays on error
      setEarningsHistory([]);
      setLiveEarnings([]);
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Load earnings data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (telegramId) {
        setIsLoading(true);
        await loadUserStats();
        await loadEarningsData();
      } else {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [telegramId]);

  // Auto-refresh earnings data
  useEffect(() => {
    if (!telegramId || !isLive) return;
    
    const interval = setInterval(() => {
      loadEarningsData();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isLive, telegramId]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Loading timeout reached, forcing loading to false');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  // Calculate earnings breakdown
  const getEarningsBreakdown = () => {
    if (!userStats) return { task: 0, referral: 0, total: 0 };

    // Calculate task earnings (total earnings minus referral bonuses)
    const referralBonus = (userStats.total_referrals || 0) * 50; // Assuming 50 per referral
    const taskEarnings = Math.max(0, (userStats.total_earnings || 0) - referralBonus);

    return {
      task: taskEarnings,
      referral: referralBonus,
      total: userStats.total_earnings || 0
    };
  };

  const earningsBreakdown = getEarningsBreakdown();
  const monthlyEarnings = Math.floor(earningsBreakdown.total * 0.8); // Calculate based on actual data

  // Fallback values when data is not available
  const fallbackStats = {
    total_earnings: 0,
    total_referrals: 0,
    balance: balance || 0,
    level: 1,
    experience_points: 0
  };

  const currentStats = userStats || fallbackStats;

  // Check if data is loaded
  const isDataLoaded = userStats !== null || earningsHistory.length > 0 || balance !== undefined;

  // Set loading to false when data is loaded or after timeout
  useEffect(() => {
    if (isDataLoaded) {
      setIsLoading(false);
    }
  }, [isDataLoaded]);

  // Force loading to false after 5 seconds if still loading
  useEffect(() => {
    const forceStopLoading = setTimeout(() => {
      if (isLoading) {
        console.warn('Force stopping loading after 5 seconds');
        setIsLoading(false);
      }
    }, 5000);

    return () => clearTimeout(forceStopLoading);
  }, [isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white p-4 pb-24">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg">Loading earnings data...</p>
            <p className="text-gray-500 text-sm">Please wait while we fetch your data</p>
            <button 
              onClick={() => setIsLoading(false)}
              className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Skip Loading
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Show when data is loaded or loading is forced to stop */}
      {(!isLoading || isDataLoaded) && (
        <>
          {/* Header with Live Status */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <motion.h1 
                className="text-3xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                BT Community Earnings
              </motion.h1>
              <div className="flex items-center gap-4">
                <motion.p 
                  className="text-gray-400 text-sm"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </motion.p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={`text-xs ${isLive ? 'text-green-400' : 'text-red-400'}`}>
                    {isLive ? 'LIVE' : 'PAUSED'}
                  </span>
                </div>
                {liveEarnings.length > 0 && (
                  <motion.p 
                    className="text-gray-300 text-sm"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    {liveEarnings.length} live earnings
                  </motion.p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                onClick={toggleLive}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  isLive 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                {isLive ? 'Stop Live' : 'Start Live'}
              </motion.button>
              
              <motion.button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isRefreshing 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-gold/20 text-gold hover:bg-gold/30 hover:scale-105'
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>

          {/* Data Loading Status */}
          {!isDataLoaded && (
            <motion.div 
              className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 backdrop-blur-sm border border-yellow-500/30 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center">
                <motion.div 
                  className="text-2xl mb-2"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, type: "spring" }}
                >
                  ⚠️
                </motion.div>
                <motion.h4 
                  className="text-md font-semibold text-yellow-400 mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Data Loading Issue
                </motion.h4>
                <motion.p 
                  className="text-sm text-gray-300 mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  Some earnings data couldn't be loaded. You can still view the interface and try refreshing.
                </motion.p>
                <motion.button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-all duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  Try Again
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Earn Real Money Banner */}
          <motion.div 
            className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-4 backdrop-blur-sm border border-green-500/30 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-center">
              <motion.div 
                className="text-3xl mb-2"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
              >
                💰
              </motion.div>
              <motion.h3 
                className="text-lg font-semibold text-green-400 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                Track Your Real Money Earnings
              </motion.h3>
              <motion.p 
                className="text-sm text-gray-300"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                Monitor your earnings from tasks, referrals, and bonuses in real-time!
              </motion.p>
            </div>
          </motion.div>

          {/* Total Earnings Card */}
          <motion.div 
            className="glass p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-gold mr-3" />
                <h2 className="text-xl font-semibold">Total Lifetime Earnings</h2>
                {liveEarnings.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400">+৳{liveEarnings.reduce((sum, item) => sum + item.amount, 0)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-center">
              <motion.p 
                className="text-4xl font-bold text-gold"
                key={earningsBreakdown.total}
                initial={{ scale: 1.2, color: '#fbbf24' }}
                animate={{ scale: 1, color: '#fbbf24' }}
                transition={{ duration: 0.3 }}
              >
                {formatCurrency(earningsBreakdown.total)}
              </motion.p>
              <p className="text-gray-400 text-sm">Lifetime earnings in real money</p>
                              <p className="text-xs text-gray-500 mt-1">From database: {currentStats.total_earnings} BDT</p>
            </div>
          </motion.div>

          {/* Earnings Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass p-4 text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-sm">📋</span>
              </div>
              <p className="text-sm text-gray-400">Task Earnings</p>
              <p className="text-lg font-semibold">{formatCurrency(earningsBreakdown.task)}</p>
            </div>
            <div className="glass p-4 text-center">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-sm">👥</span>
              </div>
              <p className="text-sm text-gray-400">Referral Bonus</p>
              <p className="text-lg font-semibold">{formatCurrency(earningsBreakdown.referral)}</p>
            </div>
          </div>

          {/* Monthly Performance */}
          <div className="glass p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gold" />
              This Month
            </h3>
            <div className="text-center">
              <p className="text-2xl font-bold text-gold">{formatCurrency(monthlyEarnings)}</p>
              <p className="text-gray-400 text-sm">Estimated monthly earnings</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="glass p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gold" />
              Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Tasks Completed</span>
                <span className="font-semibold">{stats?.tasksCompleted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Referrals</span>
                <span className="font-semibold">{currentStats.total_referrals}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Success Rate</span>
                <span className="font-semibold text-green-400">95%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Current Level</span>
                <span className="font-semibold text-gold">{currentStats.level}</span>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="glass p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-gold" />
              Goals & Milestones
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Next Milestone</span>
                <span className="text-gold font-semibold flex items-center gap-1">
                  💰
                  ৳1000
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gold h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((earningsBreakdown.total / 1000) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {formatCurrency(earningsBreakdown.total)}/৳1000 BDT
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3 mb-6">
            <button className="w-full glass p-4 text-left hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span>View Detailed Analytics</span>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
            </button>
            <button className="w-full glass p-4 text-left hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span>Download Report</span>
                <span className="text-gold">📊</span>
              </div>
            </button>
          </div>

          {/* Earnings Analytics */}
          <div className="mb-6">
            <EarningsAnalytics telegramId={telegramId || ''} />
          </div>

          {/* Live Earnings History */}
          <div className="glass p-4 mb-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                Live Earnings History
              </h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-400">{isLive ? 'Live' : 'Paused'}</span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {liveEarnings.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`p-3 rounded-lg border transition-all duration-300 ${
                      item.isLive 
                        ? 'border-green-500/30 bg-green-500/10 ring-2 ring-green-500/20' 
                        : 'border-gray-600/30 bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.type}</p>
                          <p className="text-xs text-gray-400">{item.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-400">+৳{item.amount}</p>
                        {item.isLive && (
                          <p className="text-xs text-green-400">Just now</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {liveEarnings.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No earnings history yet</p>
                  <p className="text-xs">Earnings will appear here in real-time</p>
                </div>
              )}
            </div>
          </div>

          {/* Real Money Notice */}
          <div className="glass p-4 mt-6 text-center border border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent">
            <div className="flex items-center justify-center gap-2 mb-2">
              💰
              <h4 className="text-green-400 font-semibold">Real Money Earnings</h4>
            </div>
            <p className="text-gray-300 text-sm">
              All your earnings are in real Bangladeshi Taka (BDT) that you can withdraw anytime!
            </p>
          </div>
        </>
      )}
    </div>
  );
} 