import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Trophy, Gift, Share2, Video, Users, MessageCircle as MessageChat, Star, Clock, CheckCircle2, TrendingUp, Calendar, Target, Award, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';

interface Task {
  id: string;
  title: string;
  subtitle: string;
  reward: number;
  type: string;
  icon: string;
  buttonText: string;
  cooldown?: number;
  lastCompleted?: string;
  special?: boolean;
  bgColor?: string;
  description?: string;
  isActive?: boolean;
  completionCount?: number;
  maxCompletions?: number;
  url?: string;
}

const icons = {
  video: Video,
  social: MessageChat,
  daily: Gift,
  share: Share2,
  checkin: Calendar,
  referral: Users
};

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  completed: boolean;
  cooldown: number;
  isSpecial?: boolean;
  onSpecialTaskClick?: () => void;
  isLive?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, completed, cooldown, isSpecial, onSpecialTaskClick, isLive = false }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleButtonClick = async () => {
    if (isSpecial) {
      onSpecialTaskClick?.();
    } else if (!completed && cooldown === 0 && !isCompleting && task.isActive !== false) {
      setIsCompleting(true);
      try {
        await onComplete(task.id);
        setTimeout(() => setIsCompleting(false), 2000);
      } catch (error) {
        setIsCompleting(false);
        console.error('Task completion failed:', error);
      }
    }
  };

  const getButtonText = () => {
    if (isCompleting) return 'Processing...';
    if (completed) {
      if (task.type === 'checkin' && cooldown > 0) {
        const hours = Math.floor(cooldown / 3600);
        const minutes = Math.floor((cooldown % 3600) / 60);
        return `⏰ ${hours}h ${minutes}m`;
      }
      return '✓ Completed';
    }
    if (cooldown > 0) {
      if (task.type === 'checkin') {
        const hours = Math.floor(cooldown / 3600);
        const minutes = Math.floor((cooldown % 3600) / 60);
        return `⏰ ${hours}h ${minutes}m`;
      }
      return `⏰ ${Math.floor(cooldown / 60)}m ${cooldown % 60}s`;
    }
    if (isSpecial) return 'Sign Up';
    return task.buttonText;
  };

  const getButtonClass = () => {
    if (isCompleting) return 'bg-blue-500 text-white cursor-not-allowed animate-pulse';
    if (completed) return 'bg-green-500 text-white cursor-not-allowed';
    if (cooldown > 0) return 'bg-yellow-500 text-white cursor-not-allowed';
    if (isSpecial) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-navy hover:from-yellow-300 hover:to-yellow-400';
    return 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white';
  };

  return (
    <motion.div 
      className="bg-gray-800/20 p-4 border border-white/10 rounded-lg hover:border-yellow-500/30 transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isLive && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400">LIVE</span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${task.bgColor || 'bg-blue-500/20'}`}>
            {task.icon === 'checkin' && <Calendar className="w-5 h-5 text-blue-400" />}
            {task.icon === 'referral' && <TrendingUp className="w-5 h-5 text-yellow-400" />}
            {task.icon === 'social' && <Share2 className="w-5 h-5 text-green-400" />}
            {task.icon === 'daily' && <Gift className="w-5 h-5 text-purple-400" />}
            {task.icon === 'video' && <Video className="w-5 h-5 text-red-400" />}
          </div>
          <div>
            <h3 className="font-semibold text-white">{task.title}</h3>
            <p className="text-sm text-gray-400">{task.subtitle}</p>
            {task.completionCount !== undefined && task.maxCompletions && (
              <p className="text-xs text-yellow-400">
                {task.completionCount}/{task.maxCompletions} completed today
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-yellow-400">৳{task.reward}</div>
          {task.isActive === false && (
            <div className="text-xs text-red-400">Inactive</div>
          )}
        </div>
      </div>
      
      {task.description && showInfo && (
        <motion.div 
          className="mb-3 p-3 bg-gray-800/50 rounded-lg text-sm text-gray-300"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {task.description}
        </motion.div>
      )}
      
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {showInfo ? 'Hide Info' : 'Show Info'}
        </button>
        <button
          onClick={handleButtonClick}
          disabled={completed || cooldown > 0 || isCompleting || task.isActive === false}
          className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${getButtonClass()}`}
        >
          {getButtonText()}
        </button>
      </div>
    </motion.div>
  );
};

export default function Tasks() {
  const { telegramId, balance, level, stats, addNotification, updateBalance } = useUserStore();
  const [activeTab, setActiveTab] = useState<'daily' | 'social' | 'special'>('daily');
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [taskCooldowns, setTaskCooldowns] = useState<Record<string, number>>({});
  const [taskStreak, setTaskStreak] = useState(0);
  const [dailyCheckIn, setDailyCheckIn] = useState(false);
  const [todayReferrals, setTodayReferrals] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(false);
  const [taskCompletionCounts, setTaskCompletionCounts] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [showSpecialTask, setShowSpecialTask] = useState(false);
  const [currentSpecialTask, setCurrentSpecialTask] = useState<Task | null>(null);
  const [specialTaskUID, setSpecialTaskUID] = useState('');
  const [specialTaskStatus, setSpecialTaskStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [specialTaskSubmissionTime, setSpecialTaskSubmissionTime] = useState<string | null>(null);
  const [specialTaskSubmissionId, setSpecialTaskSubmissionId] = useState<string | null>(null);
  const [isCheckingUID, setIsCheckingUID] = useState(false);

  // Throttle notifications to prevent spam
  let lastNotificationTime = 0;
  const throttledAddNotification = (notification: Parameters<typeof addNotification>[0]) => {
    const now = Date.now();
    if (now - lastNotificationTime < 2000) return; // Throttle to 2 seconds
    lastNotificationTime = now;
    addNotification(notification);
  };

  // Initialize tasks first to avoid race conditions
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('🔍 Debug: telegramId =', telegramId);
        console.log('🔍 Debug: telegramId type =', typeof telegramId);
        console.log('🔍 Debug: telegramId length =', telegramId?.length);
        
        await loadTasksFromDatabase();
        setTasksLoaded(true);
      } catch (error: any) {
        console.error('Error loading tasks:', error.code, error.message);
        throttledAddNotification({
          type: 'error',
          title: 'Task Loading Failed',
          message: 'Failed to load tasks. Please try again.',
          user_id: telegramId || ''
        });
      }
    };
    loadInitialData();
  }, [telegramId]);

  // Load other data after tasks are loaded
  useEffect(() => {
    if (tasksLoaded && telegramId) {
      loadCompletedTasks();
      loadTaskStreak();
      loadDailyCheckIn();
      loadTodayReferrals();
      startCooldownTimer();
    }
  }, [tasksLoaded, telegramId, tasks]);

  // Real-time task sync with onSnapshot
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'task_templates'), where('is_active', '==', true), limit(50)),
      (snapshot) => {
        syncTasksFromDatabase();
      },
      (error: any) => {
        console.error('Task sync error:', error.code, error.message);
        throttledAddNotification({
          type: 'error',
          title: 'Sync Failed',
          message: 'Failed to sync tasks.',
          user_id: telegramId || ''
        });
      }
    );
    return () => unsubscribe();
  }, [telegramId]);

  // Real-time special task status updates
  useEffect(() => {
    if (specialTaskSubmissionId && specialTaskStatus === 'pending' && currentSpecialTask) {
      const unsubscribe = onSnapshot(
        doc(db, 'special_task_submissions', specialTaskSubmissionId),
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setSpecialTaskStatus(data.status);
            setSpecialTaskSubmissionTime(data.created_at?.toDate?.().toISOString() || null);
            if (data.status === 'verified') {
              throttledAddNotification({
                type: 'success',
                title: 'UID Verified!',
                message: `You received ৳${currentSpecialTask.reward} reward.`,
                user_id: telegramId || ''
              });
              setTimeout(() => {
                setShowSpecialTask(false);
                setCurrentSpecialTask(null);
                setSpecialTaskUID('');
                setSpecialTaskStatus('pending');
                setSpecialTaskSubmissionId(null);
                setSpecialTaskSubmissionTime(null);
              }, 2000);
            } else if (data.status === 'rejected') {
              throttledAddNotification({
                type: 'error',
                title: 'UID Rejected',
                message: data.admin_notes || 'UID verification rejected.',
                user_id: telegramId || ''
              });
            }
          }
        },
        (error: any) => {
          console.error('Error listening to UID status:', error.code, error.message);
        }
      );
      return () => unsubscribe();
    }
  }, [specialTaskSubmissionId, specialTaskStatus, telegramId, currentSpecialTask]);

  // Optimized auto-refresh (every 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (telegramId && tasksLoaded) {
        updateLiveTaskData();
        loadCompletedTasks();
        loadDailyCheckIn();
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [telegramId, tasksLoaded]);

  const updateLiveTaskData = () => {
    setLastUpdate(new Date());
  };

  const forceRefreshTasks = async () => {
    setIsRefreshing(true);
    try {
      setTasks([]);
      await loadTasksFromDatabase();
      await loadCompletedTasks();
      await loadTaskStreak();
      await loadDailyCheckIn();
      throttledAddNotification({
        type: 'success',
        title: 'Tasks Refreshed!',
        message: 'Tasks refreshed successfully! 🎉',
        user_id: telegramId || ''
      });
    } catch (error: any) {
      console.error('Error refreshing tasks:', error.code, error.message);
      throttledAddNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh tasks.',
        user_id: telegramId || ''
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      updateLiveTaskData();
    }
  };

  const loadTaskStreak = async () => {
    if (!telegramId) return;
    
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, 'task_completions'),
        where('user_id', '==', telegramId),
        where('created_at', '>=', Timestamp.fromDate(sevenDaysAgo))
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        created_at: doc.data().created_at?.toDate?.() || new Date()
      }));

      const dates = [...new Set(data.map(d => new Date(d.created_at).toDateString()))]
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < dates.length; i++) {
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(expectedDate.getDate() - i);
        if (dates[i] === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }
      
      setTaskStreak(streak);
    } catch (error: any) {
      console.error('Error loading task streak:', error.code, error.message);
      throttledAddNotification({
        type: 'error',
        title: 'Streak Load Failed',
        message: 'Failed to load task streak.',
        user_id: telegramId || ''
      });
    }
  };

  const loadDailyCheckIn = async () => {
    if (!telegramId) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const q = query(
        collection(db, 'task_completions'),
        where('user_id', '==', telegramId),
        where('task_type', '==', 'daily_checkin'),
        where('created_at', '>=', Timestamp.fromDate(today)),
        where('created_at', '<', Timestamp.fromDate(tomorrow))
      );
      
      const querySnapshot = await getDocs(q);
      setDailyCheckIn(!querySnapshot.empty);
    } catch (error: any) {
      console.error('Error loading daily check-in:', error.code, error.message);
    }
  };

  const loadTodayReferrals = async () => {
    if (!telegramId) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const q = query(
        collection(db, 'referrals'),
        where('referrer_id', '==', telegramId),
        where('created_at', '>=', Timestamp.fromDate(today)),
        where('created_at', '<', Timestamp.fromDate(tomorrow))
      );
      
      const querySnapshot = await getDocs(q);
      setTodayReferrals(querySnapshot.size);
    } catch (error: any) {
      console.error('Error loading today referrals:', error.code, error.message);
    }
  };

  const startCooldownTimer = () => {
    const interval = setInterval(() => {
      setTaskCooldowns(prev => {
        const newCooldowns = { ...prev };
        Object.keys(newCooldowns).forEach(taskId => {
          if (newCooldowns[taskId] > 0) {
            newCooldowns[taskId]--;
          } else {
            delete newCooldowns[taskId]; // Clean up for performance
          }
        });
        return newCooldowns;
      });
    }, 1000);
    return () => clearInterval(interval);
  };

  const loadCompletedTasks = async () => {
    if (!telegramId || !tasksLoaded) return;

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, 'task_completions'),
        where('user_id', '==', telegramId),
        where('completed_at', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('completed_at', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      const allCompletions = querySnapshot.docs.map(doc => ({
        task_id: doc.data().task_id,
        task_type: doc.data().task_type,
        completed_at: doc.data().completed_at?.toDate?.() || new Date(),
        reward_amount: doc.data().reward_amount || 0
      }));

      const completed = new Set<string>();
      const cooldowns: Record<string, number> = {};
      const now = Date.now();
      
      const latestCompletions = allCompletions.reduce((acc, completion) => {
        if (!acc[completion.task_id] || acc[completion.task_id].completed_at < completion.completed_at) {
          acc[completion.task_id] = completion;
        }
        return acc;
      }, {} as Record<string, typeof allCompletions[0]>);

      Object.values(latestCompletions).forEach(completion => {
        const task = tasks.find(t => t.id === completion.task_id);
        if (!task) return;

        const completedAt = new Date(completion.completed_at).getTime();
        const timeSinceCompletion = (now - completedAt) / 1000;
        
        if (task.cooldown) {
          const remainingCooldown = Math.max(0, task.cooldown - timeSinceCompletion);
          if (remainingCooldown > 0) {
            completed.add(completion.task_id);
            cooldowns[completion.task_id] = remainingCooldown;
          }
        } else {
          completed.add(completion.task_id);
        }
      });
      
      setCompletedTasks(completed);
      setTaskCooldowns(cooldowns);
    } catch (error: any) {
      console.error('Error loading completed tasks:', error.code, error.message);
      throttledAddNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load completed tasks.',
        user_id: telegramId || ''
      });
    }
  };

  const handleTaskAction = async (task: Task) => {
    if (!telegramId) {
      throttledAddNotification({
        type: 'error',
        title: 'Login Required',
        message: 'Please login to complete tasks.',
        user_id: telegramId || ''
      });
      return;
    }

    if (completedTasks.has(task.id) || taskCooldowns[task.id] > 0) {
      throttledAddNotification({
        type: 'warning',
        title: 'Task Not Available',
        message: completedTasks.has(task.id) ? 'Task already completed.' : `Wait ${formatTime(taskCooldowns[task.id])}.`,
        user_id: telegramId || ''
      });
      return;
    }

    try {
      // Special handling for daily check-in
      if (task.type === 'checkin') {
        console.log('🎯 Processing daily check-in task...');
        await completeTask(task);
        return;
      }

      if (task.special) {
        if (task.url) {
          window.open(task.url, '_blank');
          throttledAddNotification({
            type: 'info',
            title: 'Signup Opened',
            message: 'Complete signup and submit UID.',
            user_id: telegramId || ''
          });
        }
        setCurrentSpecialTask(task);
        setShowSpecialTask(true);
        return;
      }

      if (task.type === 'social' && task.url) {
        window.open(task.url, '_blank');
        // TODO: In production, replace with server-side verification (e.g., Telegram API)
        setTimeout(async () => {
          await completeTask(task);
        }, 2000);
      } else {
        await completeTask(task);
      }
    } catch (error: any) {
      console.error('Error in task action:', error.code, error.message);
      throttledAddNotification({
        type: 'error',
        title: 'Task Failed',
        message: error.message || 'Failed to complete task.',
        user_id: telegramId || ''
      });
    }
  };

  const completeTask = async (task: Task) => {
    try {
      console.log('🎯 Starting task completion for user:', telegramId);
      
      await runTransaction(db, async (transaction) => {
        // Query user by telegram_id
        const userQuery = query(collection(db, 'users'), where('telegram_id', '==', telegramId), limit(1));
        const userSnap = await getDocs(userQuery);
        
        let userDocRef;
        let userData;
        
        if (userSnap.empty) {
          console.log('👤 User not found, creating new user...');
          // Create new user if not exists
          const newUserRef = doc(collection(db, 'users'));
          userDocRef = newUserRef;
          userData = {
            telegram_id: telegramId,
            balance: 0,
            total_earnings: 0,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          };
          transaction.set(newUserRef, userData);
          console.log('✅ New user created with ID:', newUserRef.id);
        } else {
          userDocRef = userSnap.docs[0].ref;
          userData = userSnap.docs[0].data();
          console.log('✅ Existing user found:', userData);
        }

        const lastCompletionQuery = query(
          collection(db, 'task_completions'),
          where('user_id', '==', telegramId),
          where('task_id', '==', task.id),
          orderBy('completed_at', 'desc'),
          limit(1)
        );
        const lastCompletionSnapshot = await getDocs(lastCompletionQuery);
        if (!lastCompletionSnapshot.empty) {
          const last = lastCompletionSnapshot.docs[0].data();
          const timeSince = (Date.now() - last.completed_at.toDate().getTime()) / 1000;
          if (task.cooldown && timeSince < task.cooldown) {
            throw new Error('Cooldown active');
          }
        }

        const newBalance = (userData.balance || 0) + task.reward;
        console.log('💰 Updating balance:', userData.balance, '+', task.reward, '=', newBalance);
        
        transaction.update(userDocRef, {
          balance: newBalance,
          total_earnings: (userData.total_earnings || 0) + task.reward,
          updated_at: serverTimestamp()
        });
      });

      // Add task completion outside transaction
      await addDoc(collection(db, 'task_completions'), {
        user_id: telegramId,
        task_id: task.id,
        task_type: task.type,
        task_title: task.title,
        reward_amount: task.reward,
        completed_at: serverTimestamp(),
        created_at: serverTimestamp()
      });

      console.log('✅ Task completion recorded in database');

      await updateBalance(task.reward);
      setCompletedTasks(prev => new Set([...prev, task.id]));
      if (task.cooldown) {
        setTaskCooldowns(prev => ({ ...prev, [task.id]: task.cooldown! }));
      }
      setTaskCompletionCounts(prev => ({ ...prev, [task.id]: (prev[task.id] || 0) + 1 }));
      
      throttledAddNotification({
        type: 'success',
        title: 'Task Completed!',
        message: `Earned ৳${task.reward}`,
        user_id: telegramId || ''
      });

      setTimeout(() => {
        loadCompletedTasks();
        loadTaskStreak();
        loadDailyCheckIn();
      }, 1000);
    } catch (error: any) {
      console.error('❌ Error completing task:', error.code, error.message);
      
      // Handle index errors specifically
      if (error.code === 'failed-precondition') {
        console.log('⚠️ Firebase index not ready yet. This is normal for new deployments.');
        throttledAddNotification({
          type: 'info',
          title: 'Setting Up Database',
          message: 'Database indexes are being created. Please wait a few minutes and try again.',
          user_id: telegramId || ''
        });
      } else {
        throttledAddNotification({
          type: 'error',
          title: 'Task Completion Failed',
          message: error.message || 'Failed to complete task.',
          user_id: telegramId || ''
        });
      }
      throw error;
    }
  };

  const formatCurrency = (amount: number) => `৳${amount.toLocaleString('en-IN')}`;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const calculateProgress = () => tasks.length ? (completedTasks.size / tasks.length) * 100 : 0;

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'daily') return task.type === 'daily' || task.type === 'checkin';
    if (activeTab === 'social') return task.type === 'social';
    if (activeTab === 'special') return task.special || task.type === 'trading_platform' || task.type === 'referral' || task.type === 'bonus';
    return true;
  });

  const handleSpecialTaskUIDSubmit = async () => {
    if (!specialTaskUID.trim() || !currentSpecialTask) return;

    try {
      setIsCheckingUID(true);
      const trimmedUID = specialTaskUID.trim();

      await runTransaction(db, async (transaction) => {
        const globalUIDQuery = query(
          collection(db, 'special_task_submissions'),
          where('uid_submitted', '==', trimmedUID),
          where('task_id', '==', currentSpecialTask.id),
          limit(1)
        );
        const globalUIDSnap = await getDocs(globalUIDQuery);
        if (!globalUIDSnap.empty) {
          const submission = globalUIDSnap.docs[0].data();
          if (submission.user_id === telegramId) {
            throw new Error('UID already submitted by you.');
          } else {
            throw new Error('UID used by another user.');
          }
        }

        const newDoc = await addDoc(collection(db, 'special_task_submissions'), {
          user_id: telegramId,
          task_id: currentSpecialTask.id,
          task_type: currentSpecialTask.type,
          uid_submitted: trimmedUID,
          status: 'pending',
          reward_amount: currentSpecialTask.reward,
          created_at: serverTimestamp()
        });

        setSpecialTaskSubmissionId(newDoc.id);
      });

      setSpecialTaskStatus('pending');
      setSpecialTaskSubmissionTime(new Date().toISOString());
      throttledAddNotification({
        type: 'success',
        title: 'UID Submitted!',
        message: 'UID submitted for approval.',
        user_id: telegramId || ''
      });

      setTimeout(() => {
        setShowSpecialTask(false);
        setCurrentSpecialTask(null);
        setSpecialTaskUID('');
        setSpecialTaskStatus('pending');
        setSpecialTaskSubmissionId(null);
        setSpecialTaskSubmissionTime(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting UID:', error.code, error.message);
      throttledAddNotification({
        type: 'error',
        title: 'Submission Failed',
        message: error.message || 'Failed to submit UID.',
        user_id: telegramId || ''
      });
    } finally {
      setIsCheckingUID(false);
    }
  };

  const loadTasksFromDatabase = async () => {
    try {
      const q = query(collection(db, 'task_templates'), where('is_active', '==', true), limit(50));
      const snapshot = await getDocs(q);
      let loadedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        subtitle: doc.data().subtitle || '',
        reward: doc.data().reward || 0,
        type: doc.data().type,
        icon: doc.data().icon || 'gift',
        buttonText: doc.data().button_text || 'COMPLETE',
        cooldown: doc.data().cooldown || 0,
        description: doc.data().description || '',
        isActive: doc.data().is_active !== false,
        completionCount: 0,
        maxCompletions: doc.data().max_completions || 1,
        url: doc.data().url || '',
        special: doc.data().type === 'trading_platform' || doc.data().type === 'referral' || doc.data().type === 'bonus'
      }));
      
      // If no tasks found in database, add default daily check-in task
      if (loadedTasks.length === 0) {
        console.log('📝 No tasks found in database, adding default daily check-in task');
        loadedTasks = [
          {
            id: 'daily-checkin-1',
            title: 'Daily Check-in',
            subtitle: 'Complete daily check-in to earn rewards',
            reward: 2,
            type: 'checkin',
            icon: 'checkin',
            buttonText: 'CHECK IN',
            cooldown: 86400, // 24 hours in seconds
            description: 'Check in daily to maintain your streak and earn rewards!',
            isActive: true,
            completionCount: 0,
            maxCompletions: 1,
            url: '',
            special: false
          },
          {
            id: 'social-telegram-1',
            title: 'Join Telegram Channel',
            subtitle: 'Join our official channel',
            reward: 5,
            type: 'social',
            icon: 'social',
            buttonText: 'JOIN CHANNEL',
            cooldown: 0, // One-time task
            description: 'Join our official Telegram channel for updates and rewards',
            isActive: true,
            completionCount: 0,
            maxCompletions: 1,
            url: 'https://t.me/your_channel',
            special: false
          }
        ];
      }
      
      setTasks(loadedTasks);
      setTasksLoaded(true);
      console.log('✅ Loaded tasks:', loadedTasks.length);
      
      if (loadedTasks.length > 0) {
        throttledAddNotification({
          type: 'success',
          title: 'Tasks Loaded',
          message: `Loaded ${loadedTasks.length} tasks.`,
          user_id: telegramId || ''
        });
      }
    } catch (error: any) {
      console.error('Error loading tasks:', error.code, error.message);
      
      // Fallback to default tasks if database error
      const fallbackTasks = [
        {
          id: 'daily-checkin-1',
          title: 'Daily Check-in',
          subtitle: 'Complete daily check-in to earn rewards',
          reward: 2,
          type: 'checkin',
          icon: 'checkin',
          buttonText: 'CHECK IN',
          cooldown: 86400,
          description: 'Check in daily to maintain your streak and earn rewards!',
          isActive: true,
          completionCount: 0,
          maxCompletions: 1,
          url: '',
          special: false
        }
      ];
      
      setTasks(fallbackTasks);
      setTasksLoaded(true);
      
      throttledAddNotification({
        type: 'error',
        title: 'Task Loading Failed',
        message: 'Using default tasks due to database error.',
        user_id: telegramId || ''
      });
    }
  };

  const syncTasksFromDatabase = async () => {
    await loadTasksFromDatabase();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-24">
      {tasksLoaded ? (
        <>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <motion.h1 
                  className="text-xl font-bold"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  Cash Points Tasks
                </motion.h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-gray-400">
                    {isLive ? 'Live' : 'Updated'} • {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={syncTasksFromDatabase}
                  disabled={isRefreshing}
                  className="p-2 text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  title="Sync tasks"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={toggleLive}
                  className="p-2 text-gray-400 hover:text-white"
                  title={isLive ? 'Disable live updates' : 'Enable live updates'}
                >
                  {isLive ? 'Stop Live' : 'Go Live'}
                </button>
                <div className="flex items-center px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30">
                  <span className="font-medium">{formatCurrency(balance)}</span>
                  <span className="text-green-400 text-xs ml-1">BDT</span>
                </div>
              </div>
            </div>

            <motion.div 
              className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-400 mb-2">Earn Real Money</h3>
                <p className="text-sm text-gray-300">Complete tasks to earn BDT!</p>
              </div>
            </motion.div>

            <motion.div 
              className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-semibold text-yellow-400">Today's Progress</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Daily Check-in</p>
                  <p className={`text-lg font-bold ${dailyCheckIn ? 'text-green-400' : 'text-yellow-400'}`}>
                    {dailyCheckIn ? '✓ Completed' : '⏰ Pending'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Users className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-400">Today's Referrals</p>
                  <p className="text-xl font-bold text-blue-400">{todayReferrals}</p>
                </div>
                <div className="text-center">
                  <Target className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-400">Target</p>
                  <p className="text-xl font-bold text-green-400">-</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-gray-800/20 rounded-xl p-4 border border-purple-500/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>Level {level}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">×{(1 + Math.min(taskStreak * 0.1, 0.5)).toFixed(1)} Bonus</span>
                </div>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateProgress()}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-400">{completedTasks.size}/{tasks.length} Tasks</span>
                <span className="text-purple-400">{Math.floor(calculateProgress())}% Complete</span>
              </div>
            </motion.div>
          </div>

          <div className="flex space-x-2 mb-6 overflow-x-auto">
            {[
              { id: 'daily', label: 'Daily', description: 'Daily tasks' },
              { id: 'social', label: 'Social', description: 'Social media tasks' },
              { id: 'special', label: 'Special', description: 'Bonus tasks' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-purple-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                }`}
                title={tab.description}
              >
                {tab.label}
              </button>
            ))}
            
            {/* Debug button */}
            <button
              onClick={() => {
                console.log('🔍 Debug Info:');
                console.log('Tasks:', tasks);
                console.log('Completed:', Array.from(completedTasks));
                console.log('Cooldowns:', taskCooldowns);
                console.log('Daily task:', tasks.find(t => t.type === 'checkin'));
              }}
              className="px-4 py-2 rounded-full bg-red-500 text-white text-xs"
              title="Debug Info"
            >
              Debug
            </button>
          </div>

          <AnimatePresence>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => handleTaskAction(task)}
                  completed={completedTasks.has(task.id)}
                  cooldown={taskCooldowns[task.id] || 0}
                  isSpecial={task.special}
                  onSpecialTaskClick={() => handleTaskAction(task)}
                  isLive={isLive}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {showSpecialTask && currentSpecialTask && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 p-4 rounded-lg max-w-sm w-full border border-white/10">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">{currentSpecialTask.title}</h3>
                  <p className="text-gray-400 text-xs">{currentSpecialTask.subtitle}</p>
                </div>

                <div className="mb-4">
                  <h4 className="text-base font-semibold mb-2">Step 1: Complete Signup</h4>
                  <div className="bg-gray-700 p-2 rounded-lg border border-gray-600 mb-2">
                    <p className="text-xs text-gray-400">{currentSpecialTask.description}</p>
                  </div>
                  {currentSpecialTask.url && (
                    <button
                      onClick={() => window.open(currentSpecialTask.url, '_blank')}
                      className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600"
                    >
                      Sign Up Now
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <h4 className="text-base font-semibold mb-2">Step 2: Submit UID</h4>
                  <input
                    type="text"
                    value={specialTaskUID}
                    onChange={(e) => setSpecialTaskUID(e.target.value)}
                    placeholder="Enter UID"
                    className={`w-full px-3 py-2 rounded-lg border-2 ${
                      specialTaskStatus !== 'pending' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-800 border-gray-600 focus:border-purple-500'
                    }`}
                    disabled={specialTaskStatus !== 'pending' || isCheckingUID}
                  />
                  {specialTaskUID.trim() && (
                    <p className="text-xs text-gray-400 mt-1">Enter the UID from your profile.</p>
                  )}
                </div>

                {specialTaskStatus !== 'pending' && (
                  <div className="mb-4 p-3 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      {specialTaskStatus === 'verified' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className={`font-semibold ${specialTaskStatus === 'verified' ? 'text-green-400' : 'text-red-400'}`}>
                        {specialTaskStatus === 'verified' ? 'Verified!' : 'Rejected'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">
                      {specialTaskStatus === 'verified' 
                        ? `You received ৳${currentSpecialTask.reward} reward.`
                        : 'UID verification rejected. Try again.'
                      }
                    </p>
                  </div>
                )}

                {specialTaskSubmissionId && specialTaskStatus === 'pending' && (
                  <div className="mb-4 p-3 rounded-lg border border-green-500/20 bg-green-500/10">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="font-semibold text-green-400">Submitted!</span>
                    </div>
                    <p className="text-sm text-green-300">UID submitted for approval.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSpecialTask(false);
                      setCurrentSpecialTask(null);
                      setSpecialTaskUID('');
                      setSpecialTaskStatus('pending');
                      setSpecialTaskSubmissionId(null);
                      setSpecialTaskSubmissionTime(null);
                    }}
                    className="flex-1 py-2 px-3 bg-gray-600 hover:bg-gray-700 rounded-lg"
                  >
                    Close
                  </button>
                  {specialTaskStatus === 'pending' && !specialTaskSubmissionId && (
                    <button
                      onClick={handleSpecialTaskUIDSubmit}
                      disabled={!specialTaskUID.trim() || isCheckingUID}
                      className={`flex-1 py-2 px-3 rounded-lg ${
                        specialTaskUID.trim() && !isCheckingUID ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isCheckingUID ? 'Checking...' : 'Verify UID'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-400">Loading tasks...</div>
      )}
    </div>
  );
}
