
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

interface HomeProps {
  isDemoMode?: boolean;
}

const Index: React.FC<HomeProps> = ({ isDemoMode = false }) => {
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

  // Enhanced refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadRealTimeStats();
      setLastUpdate(new Date());
      setLastSeen(new Date());
      setIsOnline(true);
      setCurrentActivity('Data refreshed successfully');
      
      // Show success notification
      setTimeout(() => {
        setCurrentActivity('Active in BT Community');
      }, 2000);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setCurrentActivity('Error refreshing data');
      setIsOnline(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Automatic real-time updates - no manual start/stop needed
  useEffect(() => {
    // Initial load
    loadRealTimeStats();
    updateCurrentActivity();
    
    // Update online status automatically
    const updateOnlineStatus = () => {
      setIsOnline(true);
      setLastSeen(new Date());
    };
    
    window.addEventListener('focus', updateOnlineStatus);
    window.addEventListener('online', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('focus', updateOnlineStatus);
      window.removeEventListener('online', updateOnlineStatus);
    };
  }, [telegramId]); // Only depend on telegramId

  // Auto-refresh every 3 minutes automatically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && !isRefreshing && telegramId) {
        loadRealTimeStats();
        updateCurrentActivity();
        setLastUpdate(new Date());
      }
    }, 180000); // 3 minutes
    return () => clearInterval(interval);
  }, [isOnline, isRefreshing, telegramId]);

  // Update activity every 2 minutes automatically
  useEffect(() => {
    const activityInterval = setInterval(() => {
      if (isOnline && telegramId) {
        updateCurrentActivity();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(activityInterval);
  }, [isOnline, telegramId]);

  const updateCurrentActivity = async () => {
    if (!telegramId) return;
    
    try {
      // Load recent user activity from database
      const { data: activities, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', telegramId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (activities && activities.length > 0) {
        const activity = activities[0];
        let activityText = 'Active in BT Community';
        
        // Map activity types to readable text
        switch (activity.activity_type) {
          case 'task_completed':
            activityText = 'Completed a task';
            break;
          case 'referral_earned':
            activityText = 'Earned referral bonus';
            break;
          case 'withdrawal_requested':
            activityText = 'Requested withdrawal';
            break;
          case 'deposit_made':
            activityText = 'Made a deposit';
            break;
          case 'level_up':
            activityText = 'Leveled up!';
            break;
          case 'mining':
            activityText = 'Mining in progress';
            break;
          case 'airdrop':
            activityText = 'Received airdrop';
            break;
          default:
            activityText = 'Active in BT Community';
        }
        
        setCurrentActivity(activityText);
        console.log('Activity updated:', activityText);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error updating activity:', error);
      setCurrentActivity('Active in BT Community');
    }
  };

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white">
      <Header level={level} isDemoMode={isDemoMode} />
      
      <div className="p-4 pb-20">
        {/* Header with Refresh and Notifications */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <motion.h1 
              className="text-2xl font-bold text-white"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Welcome to BT Community!
            </motion.h1>
            <div className="flex items-center gap-3">
              <motion.p 
                className="text-gray-400 text-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Last updated: {lastUpdate.toLocaleTimeString()}
              </motion.p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-xs text-blue-400">Auto-updating</span>
                </div>
              </div>
            </div>
            <motion.p 
              className="text-gray-300 text-sm mt-1"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {currentActivity} • Auto-updating every 2 minutes
            </motion.p>
          </div>
          
          <div className="flex items-center gap-3">
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
              transition={{ duration: 0.5, delay: 0.4 }}
              title="Manual refresh (auto-updates every 3 minutes)"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <NotificationCenter userId={telegramId || '0'} />
            </motion.div>
          </div>
        </div>

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <motion.div 
            className="glass p-4 mb-6 border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-center gap-3">
              <Monitor className="w-5 h-5 text-blue-400" />
              <div className="text-center">
                <h3 className="text-blue-400 font-semibold mb-1">Demo Mode</h3>
                <p className="text-blue-300 text-sm">
                  You're viewing a demo version. In the real Telegram app, you'll see your actual data and can perform real transactions.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Balance Card */}
      <BalanceCard
        balance={balance}
          fiatValue={balance} // In BDT, so same as balance
          percentChange={0} // No percentage change for BDT
        />
        
        {/* Referral Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass p-4 text-center border border-white/10 hover:border-gold/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Today's Referral</p>
            <p className="text-2xl font-bold text-blue-400">{referralStats.today}</p>
            <p className="text-xs text-gray-500">new today</p>
          </div>
      
          <div className="glass p-4 text-center border border-white/10 hover:border-gold/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-gray-400 mb-1">This Week</p>
            <p className="text-2xl font-bold text-green-400">{referralStats.thisWeek}</p>
            <p className="text-xs text-gray-500">this week</p>
          </div>
      
          <div className="glass p-4 text-center border border-white/10 hover:border-gold/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Total Referral</p>
            <p className="text-2xl font-bold text-gold">{referralStats.total}</p>
            <p className="text-xs text-gray-500">lifetime</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => handleNavigation('/tasks')}
            className="glass p-4 text-center hover:bg-white/10 transition-all duration-300 transform hover:scale-105 border border-white/10"
          >
            <CheckSquare className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm font-semibold">Complete Tasks</p>
            <p className="text-xs text-gray-400">Earn real money daily</p>
          </button>
          
          <button
            onClick={() => handleNavigation('/referrals')}
            className="glass p-4 text-center hover:bg-white/10 transition-all duration-300 transform hover:scale-105 border border-white/10"
          >
            <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-semibold">Invite Friends</p>
            <p className="text-xs text-gray-400">Get referral bonuses</p>
          </button>
        </div>

        {/* Stats Cards */}
        <StatsCardsRow 
        currentLevel={level}
          totalReferrals={referralStats.total} 
          nextLevelReferrals={nextLevelReferrals} 
        />

        {/* Level Progress */}
        <div className="glass p-4 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              Level {level}
            </h3>
            <span className="text-gold text-sm font-semibold flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              ৳{level * 100} bonus
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-gold to-yellow-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${levelProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-400">
              {currentLevelReferrals}/{nextLevelTarget} referrals
            </span>
            <span className="text-gold">
              {Math.floor(levelProgress)}% complete
            </span>
          </div>
          {nextLevelReferrals > 0 && (
            <p className="text-xs text-gray-400 mt-1 text-center">
              {nextLevelReferrals} more referrals to reach Level {level + 1}
            </p>
          )}
        </div>

        {/* Recent Activity */}
        <RecentActivity activities={[]} />
        
        {/* Live Activity Feed */}
        <LiveActivityFeed maxItems={8} />

        {/* Earn Real Money Section */}
        <motion.div 
          className="glass p-6 mt-6 border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="text-center">
            <motion.div 
              className="text-4xl mb-4"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, delay: 1.0, type: "spring", stiffness: 200 }}
            >
              💰
            </motion.div>
            <motion.h2 
              className="text-2xl font-bold text-gold mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              Earn Real Money
            </motion.h2>
            <motion.p 
              className="text-gray-300 text-lg mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              Join our community and start earning in Bangladeshi Taka (BDT) today!
            </motion.p>
            <motion.div 
              className="flex justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.6 }}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">৳{stats.todayEarnings || 0}</div>
                <div className="text-sm text-gray-400">Today's Earnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">৳{stats.thisWeekEarnings || 0}</div>
                <div className="text-sm text-gray-400">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">৳{stats.thisMonthEarnings || 0}</div>
                <div className="text-sm text-gray-400">This Month</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Professional Tips Section */}
        <div className="glass p-5 mt-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-gold" />
            Pro Tips & Strategies
          </h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></div>
              <p>Complete daily tasks consistently to earn ৳10-50 in real money</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></div>
              <p>Invite friends strategically and earn ৳50 per successful referral</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></div>
              <p>Withdraw your real money earnings in BDT or crypto anytime</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></div>
              <p>Maintain high activity to unlock higher level bonuses in BDT</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="glass p-4 mt-4 text-center border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent">
          <h4 className="text-gold font-semibold mb-2">Ready to Earn Real Money?</h4>
          <p className="text-gray-300 text-sm mb-3">Complete tasks and invite friends to maximize your BDT earnings</p>
          <button
            onClick={() => handleNavigation('/tasks')}
            className="bg-gradient-to-r from-gold to-yellow-500 text-navy px-6 py-2 rounded-lg font-semibold hover:from-yellow-400 hover:to-gold transition-all duration-300 transform hover:scale-105"
          >
            Start Earning Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
