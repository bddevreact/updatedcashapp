import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, TrendingUp, Users, DollarSign, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';

interface LiveActivity {
  id: string;
  type: 'referral' | 'task' | 'bonus' | 'level_up' | 'withdrawal' | 'deposit' | 'special_task';
  title: string;
  description: string;
  amount?: number;
  timestamp: Date;
  user?: string;
  isLive?: boolean;
  status?: string;
}

interface LiveActivityFeedProps {
  maxItems?: number;
  autoScroll?: boolean;
}

export default function LiveActivityFeed({ maxItems = 15, autoScroll = true }: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActivities: 0,
    todayEarnings: 0,
    activeUsers: 0
  });

  // Load real activities from database
  const loadRealActivities = async () => {
    try {
      console.log('🔄 LiveActivityFeed: Starting to load activities...');
      setIsLoading(true);
      const newActivities: LiveActivity[] = [];

      // 1. Load recent task completions
      try {
        console.log('🔄 LiveActivityFeed: Loading task completions...');
        const taskCompletionsRef = collection(db, 'task_completions');
        
        // Try with index first
        try {
          const taskQuery = query(taskCompletionsRef, orderBy('completed_at', 'desc'), limit(10));
          const taskSnapshot = await getDocs(taskQuery);

          console.log('📊 LiveActivityFeed: Found', taskSnapshot.size, 'task completions');

          if (!taskSnapshot.empty) {
            taskSnapshot.forEach(task => {
              const taskData = task.data();
              console.log('📝 LiveActivityFeed: Task data:', taskData);
              
              const activity = {
                id: `task_${task.id}`,
                type: 'task' as const,
                title: 'Task Completed',
                description: `${taskData.user_id || 'User'} completed ${taskData.task_title || 'task'}`,
                amount: taskData.reward_amount || 0,
                timestamp: taskData.completed_at?.toDate?.() || new Date(taskData.created_at),
                user: taskData.user_id || 'Unknown',
                isLive: true,
                status: 'completed'
              };
              
              newActivities.push(activity);
              console.log('✅ LiveActivityFeed: Added task activity:', activity);
            });
          }
        } catch (indexError: any) {
          // If index error, try without orderBy
          if (indexError.code === 'failed-precondition') {
            console.log('⚠️ LiveActivityFeed: Index not ready for task completions, trying without orderBy...');
            const taskQuery2 = query(taskCompletionsRef, limit(10));
            const taskSnapshot2 = await getDocs(taskQuery2);

            console.log('📊 LiveActivityFeed: Found', taskSnapshot2.size, 'task completions (without orderBy)');

            if (!taskSnapshot2.empty) {
              taskSnapshot2.forEach(task => {
                const taskData = task.data();
                console.log('📝 LiveActivityFeed: Task data:', taskData);
                
                const activity = {
                  id: `task_${task.id}`,
                  type: 'task' as const,
                  title: 'Task Completed',
                  description: `${taskData.user_id || 'User'} completed ${taskData.task_title || 'task'}`,
                  amount: taskData.reward_amount || 0,
                  timestamp: taskData.completed_at?.toDate?.() || new Date(taskData.created_at),
                  user: taskData.user_id || 'Unknown',
                  isLive: true,
                  status: 'completed'
                };
                
                newActivities.push(activity);
                console.log('✅ LiveActivityFeed: Added task activity:', activity);
              });
            }
          } else {
            throw indexError;
          }
        }
      } catch (error) {
        console.log('❌ LiveActivityFeed: Error loading task completions:', error);
      }

      // 2. Load recent withdrawals
      try {
        console.log('🔄 LiveActivityFeed: Loading withdrawals...');
        const withdrawalsRef = collection(db, 'withdrawal_requests');
        
        // Try with index first
        try {
          const withdrawalQuery = query(withdrawalsRef, orderBy('created_at', 'desc'), limit(10));
          const withdrawalSnapshot = await getDocs(withdrawalQuery);

          if (!withdrawalSnapshot.empty) {
            withdrawalSnapshot.forEach(withdrawal => {
              const withdrawalData = withdrawal.data();
              newActivities.push({
                id: `withdrawal_${withdrawal.id}`,
                type: 'withdrawal',
                title: 'Withdrawal Request',
                description: `${withdrawalData.user_id || 'User'} requested withdrawal via ${withdrawalData.method}`,
                amount: withdrawalData.amount,
                timestamp: withdrawalData.created_at?.toDate?.() || new Date(),
                user: withdrawalData.user_id || 'Unknown',
                isLive: withdrawalData.status === 'pending',
                status: withdrawalData.status
              });
            });
          }
        } catch (indexError: any) {
          // If index error, try without orderBy
          if (indexError.code === 'failed-precondition') {
            console.log('⚠️ LiveActivityFeed: Index not ready for withdrawals, trying without orderBy...');
            const withdrawalQuery2 = query(withdrawalsRef, limit(10));
            const withdrawalSnapshot2 = await getDocs(withdrawalQuery2);

            if (!withdrawalSnapshot2.empty) {
              withdrawalSnapshot2.forEach(withdrawal => {
                const withdrawalData = withdrawal.data();
                newActivities.push({
                  id: `withdrawal_${withdrawal.id}`,
                  type: 'withdrawal',
                  title: 'Withdrawal Request',
                  description: `${withdrawalData.user_id || 'User'} requested withdrawal via ${withdrawalData.method}`,
                  amount: withdrawalData.amount,
                  timestamp: withdrawalData.created_at?.toDate?.() || new Date(),
                  user: withdrawalData.user_id || 'Unknown',
                  isLive: withdrawalData.status === 'pending',
                  status: withdrawalData.status
                });
              });
            }
          } else {
            throw indexError;
          }
        }
      } catch (error) {
        console.log('❌ LiveActivityFeed: Error loading withdrawals:', error);
      }

      // 3. Load recent deposits (from user_activities)
      try {
        console.log('🔄 LiveActivityFeed: Loading deposits...');
        const depositsRef = collection(db, 'user_activities');
        
        // Try with index first
        try {
          const depositQuery = query(depositsRef, where('activity_type', '==', 'deposit_request'), orderBy('created_at', 'desc'), limit(10));
          const depositSnapshot = await getDocs(depositQuery);

          if (!depositSnapshot.empty) {
            depositSnapshot.forEach(deposit => {
              const depositData = deposit.data();
              try {
                const parsedData = JSON.parse(depositData.activity_data || '{}');
                newActivities.push({
                  id: `deposit_${deposit.id}`,
                  type: 'deposit',
                  title: 'Deposit Request',
                  description: `Deposit request via ${parsedData.method || 'unknown method'}`,
                  amount: parsedData.amount || 0,
                  timestamp: depositData.created_at?.toDate?.() || new Date(),
                  user: depositData.user_id || 'User',
                  isLive: true,
                  status: 'pending'
                });
              } catch (e) {
                console.log('Error parsing deposit data:', e);
              }
            });
          }
        } catch (indexError: any) {
          // If index error, try without orderBy
          if (indexError.code === 'failed-precondition') {
            console.log('⚠️ LiveActivityFeed: Index not ready for deposits, trying without orderBy...');
            const depositQuery2 = query(depositsRef, where('activity_type', '==', 'deposit_request'), limit(10));
            const depositSnapshot2 = await getDocs(depositQuery2);

            if (!depositSnapshot2.empty) {
              depositSnapshot2.forEach(deposit => {
                const depositData = deposit.data();
                try {
                  const parsedData = JSON.parse(depositData.activity_data || '{}');
                  newActivities.push({
                    id: `deposit_${deposit.id}`,
                    type: 'deposit',
                    title: 'Deposit Request',
                    description: `Deposit request via ${parsedData.method || 'unknown method'}`,
                    amount: parsedData.amount || 0,
                    timestamp: depositData.created_at?.toDate?.() || new Date(),
                    user: depositData.user_id || 'User',
                    isLive: true,
                    status: 'pending'
                  });
                } catch (e) {
                  console.log('Error parsing deposit data:', e);
                }
              });
            }
          } else {
            throw indexError;
          }
        }
      } catch (error) {
        console.log('❌ LiveActivityFeed: Error loading deposits:', error);
      }

      // 4. Load special task submissions
      try {
        console.log('🔄 LiveActivityFeed: Loading special task submissions...');
        const specialTasksRef = collection(db, 'special_task_submissions');
        
        // Try with index first
        try {
          const specialQuery = query(specialTasksRef, orderBy('created_at', 'desc'), limit(10));
          const specialSnapshot = await getDocs(specialQuery);

          if (!specialSnapshot.empty) {
            specialSnapshot.forEach(task => {
              const taskData = task.data();
              newActivities.push({
                id: `special_${task.id}`,
                type: 'special_task',
                title: 'Special Task Submitted',
                description: `${taskData.user_id || 'User'} submitted UID for special task`,
                amount: taskData.reward_amount || 0,
                timestamp: taskData.created_at?.toDate?.() || new Date(),
                user: taskData.user_id || 'Unknown',
                isLive: taskData.status === 'pending',
                status: taskData.status
              });
            });
          }
        } catch (indexError: any) {
          // If index error, try without orderBy
          if (indexError.code === 'failed-precondition') {
            console.log('⚠️ LiveActivityFeed: Index not ready for special tasks, trying without orderBy...');
            const specialQuery2 = query(specialTasksRef, limit(10));
            const specialSnapshot2 = await getDocs(specialQuery2);

            if (!specialSnapshot2.empty) {
              specialSnapshot2.forEach(task => {
                const taskData = task.data();
                newActivities.push({
                  id: `special_${task.id}`,
                  type: 'special_task',
                  title: 'Special Task Submitted',
                  description: `${taskData.user_id || 'User'} submitted UID for special task`,
                  amount: taskData.reward_amount || 0,
                  timestamp: taskData.created_at?.toDate?.() || new Date(),
                  user: taskData.user_id || 'Unknown',
                  isLive: taskData.status === 'pending',
                  status: taskData.status
                });
              });
            }
          } else {
            throw indexError;
          }
        }
      } catch (error) {
        console.log('❌ LiveActivityFeed: Error loading special tasks:', error);
      }

      // 5. Load referral activities (from referrals collection)
      try {
        console.log('🔄 LiveActivityFeed: Loading referrals...');
        const referralsRef = collection(db, 'referrals');
        
        // Try with index first
        try {
          const referralQuery = query(referralsRef, orderBy('created_at', 'desc'), limit(10));
          const referralSnapshot = await getDocs(referralQuery);

          console.log('📊 LiveActivityFeed: Found', referralSnapshot.size, 'referrals');

          if (!referralSnapshot.empty) {
            referralSnapshot.forEach(referral => {
              const referralData = referral.data();
              console.log('📝 LiveActivityFeed: Referral data:', referralData);
              
              const activity = {
                id: `referral_${referral.id}`,
                type: 'referral' as const,
                title: 'Referral Completed',
                description: `${referralData.referrer_id || 'User'} referred ${referralData.referred_id || 'someone'}`,
                amount: 0, // Referral rewards are handled separately
                timestamp: referralData.created_at?.toDate?.() || new Date(),
                user: referralData.referrer_id || 'Unknown',
                isLive: true,
                status: 'completed'
              };
              
              newActivities.push(activity);
              console.log('✅ LiveActivityFeed: Added referral activity:', activity);
            });
          }
        } catch (indexError: any) {
          // If index error, try without orderBy
          if (indexError.code === 'failed-precondition') {
            console.log('⚠️ LiveActivityFeed: Index not ready for referrals, trying without orderBy...');
            const referralQuery2 = query(referralsRef, limit(10));
            const referralSnapshot2 = await getDocs(referralQuery2);

            console.log('📊 LiveActivityFeed: Found', referralSnapshot2.size, 'referrals (without orderBy)');

            if (!referralSnapshot2.empty) {
              referralSnapshot2.forEach(referral => {
                const referralData = referral.data();
                console.log('📝 LiveActivityFeed: Referral data:', referralData);
                
                const activity = {
                  id: `referral_${referral.id}`,
                  type: 'referral' as const,
                  title: 'Referral Completed',
                  description: `${referralData.referrer_id || 'User'} referred ${referralData.referred_id || 'someone'}`,
                  amount: 0, // Referral rewards are handled separately
                  timestamp: referralData.created_at?.toDate?.() || new Date(),
                  user: referralData.referrer_id || 'Unknown',
                  isLive: true,
                  status: 'completed'
                };
                
                newActivities.push(activity);
                console.log('✅ LiveActivityFeed: Added referral activity:', activity);
              });
            }
          } else {
            throw indexError;
          }
        }
      } catch (error) {
        console.log('❌ LiveActivityFeed: Error loading referrals:', error);
      }

      // Sort all activities by timestamp (newest first)
      newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log('📊 LiveActivityFeed: Total activities found:', newActivities.length);
      console.log('📊 LiveActivityFeed: Activities:', newActivities);

      // Take only the latest activities
      setActivities(newActivities.slice(0, maxItems));

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayActivities = newActivities.filter(activity => 
        activity.timestamp >= today
      );

      setStats({
        totalActivities: newActivities.length,
        todayEarnings: todayActivities.reduce((sum, activity) => sum + (activity.amount || 0), 0),
        activeUsers: new Set(newActivities.map(a => a.user)).size
      });

    } catch (error) {
      console.error('Error loading real activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load activities on mount
  useEffect(() => {
    console.log('🔄 LiveActivityFeed: Loading activities...');
    loadRealActivities();
  }, []);

  // Auto-refresh every 30 seconds when live
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      loadRealActivities();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  const getActivityIcon = (type: LiveActivity['type']) => {
    switch (type) {
      case 'referral':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'task':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'bonus':
        return <Activity className="w-4 h-4 text-yellow-400" />;
      case 'level_up':
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      case 'withdrawal':
        return <DollarSign className="w-4 h-4 text-red-400" />;
      case 'deposit':
        return <DollarSign className="w-4 h-4 text-green-400" />;
      case 'special_task':
        return <Zap className="w-4 h-4 text-orange-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityColor = (type: LiveActivity['type']) => {
    switch (type) {
      case 'referral':
        return 'border-blue-500/20 bg-blue-500/10';
      case 'task':
        return 'border-green-500/20 bg-green-500/10';
      case 'bonus':
        return 'border-yellow-500/20 bg-yellow-500/10';
      case 'level_up':
        return 'border-purple-500/20 bg-purple-500/10';
      case 'withdrawal':
        return 'border-red-500/20 bg-red-500/10';
      case 'deposit':
        return 'border-green-500/20 bg-green-500/10';
      case 'special_task':
        return 'border-orange-500/20 bg-orange-500/10';
      default:
        return 'border-gray-500/20 bg-gray-500/10';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'approved':
      case 'verified':
      case 'completed':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const toggleLive = () => {
    setIsLive(!isLive);
  };

  const refreshActivities = () => {
    loadRealActivities();
  };

  return (
    <div className="glass p-4 border border-white/10 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <h3 className="text-lg font-semibold text-white">Live Activity Feed</h3>
          </div>
          {isLive && (
            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshActivities}
            disabled={isLoading}
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
            title="Refresh Activities"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={toggleLive}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
              isLive
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
            }`}
          >
            {isLive ? 'Stop' : 'Start'} Live
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-800/30 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{stats.totalActivities}</div>
          <div className="text-xs text-gray-400">Total Activities</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">৳{stats.todayEarnings}</div>
          <div className="text-xs text-gray-400">Today's Earnings</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">{stats.activeUsers}</div>
          <div className="text-xs text-gray-400">Active Users</div>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-400" />
            <p className="text-gray-400">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No activities yet</p>
            <p className="text-xs">Activities will appear here in real-time</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-3 rounded-lg border transition-all duration-300 hover:scale-105 ${
                  getActivityColor(activity.type)
                } ${activity.isLive ? 'ring-2 ring-green-500/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white">
                        {activity.title}
                      </h4>
                      {activity.isLive && (
                        <span className="text-xs text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded-full">
                          LIVE
                        </span>
                      )}
                      {activity.status && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          activity.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          activity.status === 'approved' || activity.status === 'verified' ? 'bg-green-500/20 text-green-400' :
                          activity.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 mb-2">
                      {activity.description}
                      {activity.user && (
                        <span className="text-blue-400 ml-1">• {activity.user}</span>
                      )}
                    </p>
                    <div className="flex items-center justify-between">
                      {activity.amount && (
                        <span className="text-xs text-green-400 font-medium">
                          +৳{activity.amount}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Showing {activities.length} activities</span>
          <span>Auto-refresh: {isLive ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    </div>
  );
} 
