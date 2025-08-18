import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Trophy, Gift, Share2, Video, Users, MessageCircle as MessageChat, Star, Zap, Clock, CheckCircle2, TrendingUp, Calendar, Target, Award, DollarSign, CheckCircle, AlertCircle, RefreshCw, TrendingUp as TrendingUpIcon, Activity, Zap as ZapIcon } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { supabase } from '../lib/supabase';

interface Task {
  id: string; // Changed from number to string for UUID
  title: string;
  subtitle: string;
  reward: number;
  type: string;
  icon: string;
  buttonText: string;
  cooldown?: number; // in seconds
  lastCompleted?: string;
  special?: boolean; // Added for special tasks
  bgColor?: string; // Added for background color
  description?: string; // Added for task description
  isActive?: boolean; // Added for task status
  completionCount?: number; // Added for tracking completions
  maxCompletions?: number; // Added for daily limits
  url?: string; // Added for task URL
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
    } else if (!completed && cooldown === 0 && !isCompleting) {
      setIsCompleting(true);
      try {
        await onComplete(task.id);
        // Show success feedback
        setTimeout(() => setIsCompleting(false), 2000);
      } catch (error) {
        setIsCompleting(false);
        console.error('Task completion failed:', error);
      }
    }
  };

  const getButtonText = () => {
    if (isCompleting) return 'Processing...';
    if (completed) return '✓ Completed';
    if (cooldown > 0) return `⏰ ${Math.floor(cooldown / 60)}m ${cooldown % 60}s`;
    if (isSpecial) return 'Sign Up'; // Changed from task.buttonText to 'Sign Up'
    return task.buttonText;
  };

  const getButtonClass = () => {
    if (isCompleting) return 'bg-blue-500 text-white cursor-not-allowed animate-pulse';
    if (completed) return 'bg-green-500 text-white cursor-not-allowed';
    if (cooldown > 0) return 'bg-yellow-500 text-white cursor-not-allowed';
    if (isSpecial) return 'bg-gradient-to-r from-gold to-yellow-500 text-navy hover:from-yellow-400 hover:to-gold';
    return 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white';
  };

  return (
    <motion.div 
      className="glass p-4 border border-white/10 rounded-lg hover:border-gold/30 transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {/* Live indicator */}
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
            {task.icon === 'referral' && <TrendingUp className="w-5 h-5 text-gold" />}
            {task.icon === 'social' && <Share2 className="w-5 h-5 text-green-400" />}
            {task.icon === 'daily' && <Gift className="w-5 h-5 text-purple-400" />}
            {task.icon === 'video' && <Video className="w-5 h-5 text-red-400" />}
          </div>
          <div>
            <h3 className="font-semibold text-white">{task.title}</h3>
            <p className="text-sm text-gray-400">{task.subtitle}</p>
            {task.completionCount !== undefined && task.maxCompletions && (
              <p className="text-xs text-gold">
                {task.completionCount}/{task.maxCompletions} completed today
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gold">৳{task.reward}</div>
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
  const [showTaskInfo, setShowTaskInfo] = useState<string | null>(null);

  // Real-time updates hook
  const { isUpdating, forceUpdate } = useRealTimeUpdates({
    interval: 30000, // 30 seconds for tasks
    onUpdate: () => {
      setLastUpdate(new Date());
      updateLiveTaskData();
    }
  });

  // Enhanced tasks with dynamic data
  const [tasks, setTasks] = useState<Task[]>([]);

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isUpdating) {
        updateLiveTaskData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isUpdating]);

  // Real-time task data updates
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      updateLiveTaskData();
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  const updateLiveTaskData = () => {
    // Real-time task updates will be handled by actual API calls
    setLastUpdate(new Date());
  };

  // Force refresh tasks from database
  const forceRefreshTasks = async () => {
    setIsRefreshing(true);
    try {
      // Clear current tasks
      setTasks([]);
      
      // Reload from database
      await loadTasksFromDatabase();
      
      // Reload completed tasks and other data
      await loadCompletedTasks();
      await loadTaskStreak();
      await loadDailyCheckIn();
      
      addNotification({
        type: 'success',
        title: 'Tasks Refreshed!',
        message: 'Tasks refreshed from database successfully! 🎉'
      });
    } catch (error) {
      console.error('Error force refreshing tasks:', error);
      addNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh tasks from database'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle manual refresh with enhanced feedback
  const handleRefresh = async () => {
    await forceRefreshTasks();
  };

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      updateLiveTaskData();
    }
  };

  useEffect(() => {
    loadCompletedTasks();
    loadTaskStreak();
    loadDailyCheckIn();
    loadTodayReferrals();
    startCooldownTimer();
  }, []);

  const loadTaskStreak = async () => {
    if (!telegramId) return;
    
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', telegramId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Calculate streak based on consecutive days
      const dates = data?.map(d => new Date(d.created_at).toDateString()) || [];
      const uniqueDates = [...new Set(dates)];
      const sortedDates = uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let streak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      
      for (let i = 0; i < sortedDates.length; i++) {
        if (sortedDates[i] === today || sortedDates[i] === yesterday) {
          streak++;
        } else {
          break;
        }
      }
      
      setTaskStreak(streak);
    } catch (error) {
      console.error('Error loading task streak:', error);
    }
  };

  const loadDailyCheckIn = async () => {
    if (!telegramId) return;
    
    try {
      const today = new Date().toDateString();
      const { data, error } = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', telegramId)
        .eq('task_type', 'daily_checkin')
        .gte('created_at', new Date(today).toISOString())
        .lt('created_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      
      setDailyCheckIn(data && data.length > 0);
    } catch (error) {
      console.error('Error loading daily check-in:', error);
    }
  };

  const loadTodayReferrals = async () => {
    if (!telegramId) return;
    
    try {
      const today = new Date().toDateString();
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', telegramId)
        .gte('created_at', new Date(today).toISOString())
        .lt('created_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      
      setTodayReferrals(data?.length || 0);
    } catch (error) {
      console.error('Error loading today referrals:', error);
    }
  };

  const startCooldownTimer = () => {
    const interval = setInterval(() => {
      setTaskCooldowns(prev => {
        const newCooldowns = { ...prev };
        Object.keys(newCooldowns).forEach(taskId => {
          if (newCooldowns[taskId] > 0) {
            newCooldowns[taskId]--;
          }
        });
        return newCooldowns;
      });
    }, 1000);

    return () => clearInterval(interval);
  };

  const loadCompletedTasks = async () => {
    if (!telegramId) return;

    const { data, error } = await supabase
      .from('task_completions')
      .select('task_id, completed_at')
      .eq('user_id', telegramId)
      .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error loading completed tasks:', error);
      return;
    }

    const completed: Set<string> = new Set();
    const cooldowns: Record<string, number> = {};
    
    data.forEach(completion => {
      completed.add(completion.task_id);
      
      const task = tasks.find(t => t.id === completion.task_id);
      if (task?.cooldown) {
        const completedAt = new Date(completion.completed_at).getTime();
        const now = Date.now();
        const remainingCooldown = Math.max(0, task.cooldown - Math.floor((now - completedAt) / 1000));
        cooldowns[completion.task_id] = remainingCooldown;
      }
    });
    
    setCompletedTasks(completed);
    setTaskCooldowns(cooldowns);
  };

  const handleTaskAction = async (task: Task) => {
    if (!telegramId) {
      addNotification({
        type: 'error',
        title: 'Login Required',
        message: 'Please login first to complete tasks'
      });
      return;
    }

    if (completedTasks.has(task.id)) {
      addNotification({
        type: 'info',
        title: 'Task Already Completed',
        message: 'Task already completed!'
      });
      return;
    }

    if (taskCooldowns[task.id] > 0) {
      addNotification({
        type: 'warning',
        title: 'Cooldown Active',
        message: `Please wait ${formatTime(taskCooldowns[task.id])} before completing this task again`
      });
      return;
    }

    try {
      // Show loading state
      addNotification({
        type: 'info',
        title: 'Processing Task',
        message: 'Processing task completion...'
      });

      // Handle special tasks
      if (task.special) {
        if (task.type === 'trading_platform' || task.type === 'bonus' || task.type === 'special') {
          // For special tasks, first redirect to external link, then show UID input
          if (task.url) {
            // Open external link first
            window.open(task.url, '_blank');
            
            // Show notification about external signup
            addNotification({
              type: 'info',
              title: 'External Signup Opened',
              message: 'External signup page opened in new tab. Complete the signup and return here to submit your UID.'
            });
            
            // Show UID input modal after a short delay
            setTimeout(() => {
              setCurrentSpecialTask(task);
              setShowSpecialTask(true);
            }, 2000);
          } else {
            // No URL provided, show UID input directly
            setCurrentSpecialTask(task);
            setShowSpecialTask(true);
          }
        } else {
          addNotification({
            type: 'info',
            title: 'Special Task',
            message: 'Special task requires admin verification. Please contact support.'
          });
        }
        return;
      }

      // Handle social tasks with URL
      if (task.type === 'social' && task.url) {
        // Open URL in new tab
        window.open(task.url, '_blank');
        
        // Mark task as completed after opening URL
        setTimeout(async () => {
          await completeTask(task);
        }, 1000);
        return;
      }

      // Handle daily check-in
      if (task.type === 'checkin') {
        await completeTask(task);
        return;
      }

      // Handle other tasks
      await completeTask(task);

    } catch (error) {
      console.error('Error completing task:', error);
      addNotification({
        type: 'error',
        title: 'Task Completion Failed',
        message: `Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Helper function to complete tasks
  const completeTask = async (task: Task) => {
    try {
      const completionData = {
          user_id: telegramId,
          task_id: task.id,
          task_type: task.type,
          reward_amount: task.reward,
          completed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('task_completions')
        .insert([completionData]);

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Update user balance in database
      const { error: balanceError } = await supabase
        .from('users')
        .update({ 
          balance: balance + task.reward,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', telegramId);

      if (balanceError) {
        console.error('Balance update error:', balanceError);
      } else {
        // Update store balance
        await updateBalance(task.reward);
      }

      // Update local state
      setCompletedTasks(prev => new Set([...prev, task.id]));

      // Set cooldown if applicable
      if (task.cooldown) {
        setTaskCooldowns(prev => ({
          ...prev,
          [task.id]: task.cooldown!
        }));
      }

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Task Completed! 🎉',
        message: `Task completed! Earned ৳${task.reward}`
      });

      // Update task completion count
      setTaskCompletionCounts(prev => {
        const newCounts = { ...prev };
        newCounts[task.id] = (prev[task.id] || 0) + 1;
        return newCounts;
      });

      // Refresh user data after a short delay
      setTimeout(() => {
        loadCompletedTasks();
        loadTaskStreak();
        loadDailyCheckIn();
        // Force refresh user data
        forceUpdate();
      }, 1000);

    } catch (error) {
      throw error;
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `৳${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `৳${(num / 1000).toFixed(1)}K`;
    return `৳${num}`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const calculateProgress = () => {
    const completed = Array.from(completedTasks).filter(Boolean).length;
    return (completed / tasks.length) * 100;
  };

  const filteredTasks = tasks.filter(task => {
    switch (activeTab) {
      case 'daily':
        return task.type === 'daily' || task.type === 'checkin';
      case 'social':
        return task.type === 'social';
      case 'special':
        return task.special || task.type === 'trading_platform' || task.type === 'referral' || task.type === 'bonus';
      default:
        return true;
    }
  });

  // Mock data for enhanced stats - REMOVED
  // const referralData = {
  //   today: 3,
  //   thisWeek: 12,
  //   thisMonth: 28,
  //   total: stats.referralsCount || 0,
  //   earnings: stats.referralsCount * 50 || 0,
  //   pending: 2,
  //   level: Math.floor((stats.referralsCount || 0) / 10) + 1
  // };

  // Trading Platform Referral Task State
  const [showTradingTask, setShowTradingTask] = useState(false);
  const [tradingUID, setTradingUID] = useState('');
  const [tradingStatus, setTradingStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [tradingSubmissionTime, setTradingSubmissionTime] = useState<string | null>(null);

  // Special Task Modal State
  const [showSpecialTask, setShowSpecialTask] = useState(false);
  const [currentSpecialTask, setCurrentSpecialTask] = useState<Task | null>(null);
  const [specialTaskUID, setSpecialTaskUID] = useState('');
  const [specialTaskStatus, setSpecialTaskStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [specialTaskSubmissionTime, setSpecialTaskSubmissionTime] = useState<string | null>(null);
  const [specialTaskSubmissionId, setSpecialTaskSubmissionId] = useState<string | null>(null);
  const [isCheckingUID, setIsCheckingUID] = useState(false);

  // Trading referral link should come from actual configuration
  const tradingReferralLink = '';

  const handleTradingUIDSubmit = async () => {
    if (!tradingUID.trim()) return;

    try {
      const { error } = await supabase
        .from('user_activities')
        .insert({
          user_id: telegramId,
          activity_type: 'trading_uid',
          activity_data: JSON.stringify({ uid: tradingUID, status: 'pending' }),
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setTradingStatus('pending');
      setTradingSubmissionTime(new Date().toISOString());
      alert('UID submitted for verification!');
      setShowTradingTask(false);
      setTradingUID('');

    } catch (error) {
      console.error('Error submitting trading UID:', error);
      alert('Failed to submit UID. Please try again.');
    }
  };

  // Handle special task UID submission
  const handleSpecialTaskUIDSubmit = async () => {
    if (!specialTaskUID.trim() || !currentSpecialTask) return;

    try {
      setIsCheckingUID(true);

      // Check if UID has been used globally by ANY user
      const globalUIDCheck = await checkUIDSubmissionGlobal(specialTaskUID.trim(), currentSpecialTask.id);
      
      if (globalUIDCheck && globalUIDCheck.exists) {
        if (globalUIDCheck.usedByOtherUser) {
          // UID was used by another user - this is not allowed
          addNotification({
            type: 'error',
            title: 'UID Already Used',
            message: 'This UID has already been used by another user. Each UID can only be used once in the entire system.'
          });
          return;
        } else if (globalUIDCheck.isCurrentUser) {
          // UID was used by current user
          const submission = globalUIDCheck.submission;
          
          if (submission.status === 'pending') {
            addNotification({
              type: 'warning',
              title: 'UID Already Submitted',
              message: 'This UID is already submitted and pending admin approval.'
            });
            return;
          } else if (submission.status === 'verified') {
            addNotification({
              type: 'info',
              title: 'UID Already Verified',
              message: 'This UID has already been verified and rewarded.'
            });
            return;
          } else if (submission.status === 'rejected') {
            addNotification({
              type: 'warning',
              title: 'UID Previously Rejected',
              message: 'This UID was previously rejected. Please use a different UID or contact support.'
            });
            return;
          }
        }
      }

      // Show loading state
      addNotification({
        type: 'info',
        title: 'Submitting UID',
        message: 'Submitting your UID for verification...'
      });

      // Insert into special task submissions table
      const { data, error } = await supabase
        .from('special_task_submissions')
        .insert({
          user_id: telegramId,
          task_id: currentSpecialTask.id,
          task_type: currentSpecialTask.type,
          uid_submitted: specialTaskUID.trim(),
          status: 'pending',
          reward_amount: currentSpecialTask.reward,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state with submission details
      setSpecialTaskStatus('pending');
      setSpecialTaskSubmissionTime(new Date().toISOString());
      setSpecialTaskSubmissionId(data.id);
      
      // Show success notification
      addNotification({
        type: 'success',
        title: 'UID Successfully Submitted! 🎉',
        message: 'Your UID has been submitted for admin approval. You will be notified of the result.'
      });

      // Don't close modal yet - show the pending status
      // setShowSpecialTask(false);
      // setCurrentSpecialTask(null);
      // setSpecialTaskUID('');

      // Refresh user data
      forceUpdate();

    } catch (error) {
      console.error('Error submitting special task UID:', error);
      addNotification({
        type: 'error',
        title: 'Submission Failed',
        message: 'Failed to submit UID. Please try again.'
      });
    } finally {
      setIsCheckingUID(false);
    }
  };

  // Check if user has already submitted this UID
  const checkUIDSubmission = async (uid: string, taskId: string) => {
    if (!telegramId) return false;
    
    try {
      const { data, error } = await supabase
        .from('special_task_submissions')
        .select('id, status, created_at')
        .eq('user_id', telegramId)
        .eq('uid_submitted', uid.trim())
        .eq('task_id', taskId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows returned (UID not submitted before)
        console.error('Error checking UID submission:', error);
        return false;
      }

      if (data) {
        // UID already submitted by this user
        return {
          exists: true,
          submission: data
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking UID submission:', error);
      return false;
    }
  };

  // Check if UID has already been submitted globally (by any user)
  const checkUIDSubmissionGlobal = async (uid: string, taskId: string) => {
    if (!telegramId) return false;
    
    try {
      // Check if this UID has been used by ANY user globally
      const { data, error } = await supabase
        .from('special_task_submissions')
        .select('id, status, created_at, user_id')
        .eq('uid_submitted', uid.trim())
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking global UID submission:', error);
        return false;
      }

      if (data && data.length > 0) {
        const submission = data[0];
        
        // Check if this UID was submitted by the current user
        if (submission.user_id === telegramId) {
          return {
            exists: true,
            isCurrentUser: true,
            submission: submission
          };
        } else {
          // UID was used by another user
          return {
            exists: true,
            isCurrentUser: false,
            submission: submission,
            usedByOtherUser: true
          };
        }
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking global UID submission:', error);
      return false;
    }
  };

  // Check current UID submission status
  const checkCurrentUIDStatus = async () => {
    if (!telegramId || !currentSpecialTask) return;
    
    try {
      const { data, error } = await supabase
        .from('special_task_submissions')
        .select('id, status, admin_notes, verified_at, created_at')
        .eq('user_id', telegramId)
        .eq('task_id', currentSpecialTask.id)
        .eq('uid_submitted', specialTaskUID.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking UID status:', error);
        return;
      }

      if (data) {
        setSpecialTaskStatus(data.status);
        setSpecialTaskSubmissionId(data.id);
        setSpecialTaskSubmissionTime(data.created_at);
        
        // If verified, show success message and close modal after delay
        if (data.status === 'verified') {
          addNotification({
            type: 'success',
            title: 'UID Verified! 🎉',
            message: `Your UID has been verified! You received ৳${currentSpecialTask.reward} reward.`
          });
          
          setTimeout(() => {
            setShowSpecialTask(false);
            setCurrentSpecialTask(null);
            setSpecialTaskUID('');
            setSpecialTaskStatus('pending');
            setSpecialTaskSubmissionId(null);
            setSpecialTaskSubmissionTime(null);
          }, 3000);
        }
        
        // If rejected, show rejection message
        if (data.status === 'rejected') {
          addNotification({
            type: 'error',
            title: 'UID Rejected ❌',
            message: `Your UID was rejected. Reason: ${data.admin_notes || 'No reason provided'}`
          });
        }
      }
    } catch (error) {
      console.error('Error checking UID status:', error);
    }
  };

  // Check status when UID changes
  useEffect(() => {
    if (specialTaskUID.trim() && currentSpecialTask) {
      const timer = setTimeout(() => {
        checkCurrentUIDStatus();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [specialTaskUID, currentSpecialTask]);

  // Real-time status checking for submitted UIDs
  useEffect(() => {
    if (specialTaskSubmissionId && specialTaskStatus === 'pending') {
      const interval = setInterval(() => {
        checkCurrentUIDStatus();
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [specialTaskSubmissionId, specialTaskStatus]);

  // Debug function to check current state
  const debugTaskState = () => {
    console.log('=== TASK DEBUG INFO ===');
    console.log('telegramId:', telegramId);
    console.log('balance:', balance);
    console.log('completedTasks:', Array.from(completedTasks));
    console.log('taskCooldowns:', taskCooldowns);
    console.log('dailyCheckIn:', dailyCheckIn);
    console.log('todayReferrals:', todayReferrals);
    console.log('=== DATABASE TASKS ===');
    console.log('Tasks loaded from database:', tasks);
    console.log('Task count:', tasks.length);
    console.log('Daily check-in task:', tasks.find(t => t.type === 'checkin'));
    console.log('========================');
  };

  // Add debug button in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Add debug function to window for console access
      (window as any).debugTasks = debugTaskState;
    }
  }, [telegramId, balance, completedTasks, taskCooldowns, dailyCheckIn, todayReferrals]);

  // Test database connection and user data
  const testDatabaseConnection = async () => {
    if (!telegramId) {
      addNotification({
        type: 'error',
        title: 'No Telegram ID',
        message: 'No telegram ID found'
      });
      return;
    }

    try {
      // Test user data fetch
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (userError) {
        console.error('User fetch error:', userError);
        addNotification({
          type: 'error',
          title: 'User Error',
          message: `User fetch error: ${userError.message}`
        });
        return;
      }

      console.log('User data:', userData);
      addNotification({
        type: 'success',
        title: 'Database Connected',
        message: `Database connected! User: ${userData.first_name || 'Unknown'}`
      });

      // Test task completions table
      const { data: completions, error: completionsError } = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', telegramId)
        .limit(5);

      if (completionsError) {
        console.error('Completions fetch error:', completionsError);
        addNotification({
          type: 'warning',
          title: 'Completions Error',
          message: `Completions table error: ${completionsError.message}`
        });
      } else {
        console.log('Task completions:', completions);
        addNotification({
          type: 'info',
          title: 'Task Completions Found',
          message: `Found ${completions?.length || 0} task completions`
        });
      }

    } catch (error) {
      console.error('Database test error:', error);
      addNotification({
        type: 'error',
        title: 'Database Test Failed',
        message: `Database test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Check user authentication status
  useEffect(() => {
    console.log('=== USER AUTH STATUS ===');
    console.log('telegramId:', telegramId);
    console.log('balance:', balance);
    console.log('isAuthenticated:', !!telegramId);
    
    if (!telegramId) {
      addNotification({
        type: 'warning',
        title: 'Login Required',
        message: 'Please login with Telegram to access tasks'
      });
    }
  }, [telegramId, balance, addNotification]);

  // Real-time task synchronization
  const [lastTaskUpdate, setLastTaskUpdate] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync tasks every 30 seconds
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (!isSyncing) {
        await syncTasksFromDatabase();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(syncInterval);
  }, []);

  // Enhanced task loading with real-time sync
  const syncTasksFromDatabase = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const { data: taskTemplates, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error syncing tasks:', error);
        return;
      }

      if (taskTemplates && taskTemplates.length > 0) {
        const formattedTasks: Task[] = taskTemplates.map(template => ({
          id: template.id,
          title: template.title,
          subtitle: template.subtitle || '',
          reward: template.reward,
          type: template.type,
          icon: template.icon || 'gift',
          buttonText: template.button_text || 'COMPLETE',
          cooldown: template.cooldown || 0,
          description: template.description || '',
          isActive: template.is_active || true,
          completionCount: 0,
          maxCompletions: template.max_completions || 1,
          url: template.url || '',
          special: template.type === 'trading_platform' || template.type === 'referral'
        }));
        
        // Check if tasks have changed
        const currentTaskIds = tasks.map(t => t.id).sort().join(',');
        const newTaskIds = formattedTasks.map(t => t.id).sort().join(',');
        const currentRewards = tasks.map(t => `${t.id}:${t.reward}`).sort().join(',');
        const newRewards = formattedTasks.map(t => `${t.id}:${t.reward}`).sort().join(',');
        
        if (currentTaskIds !== newTaskIds || currentRewards !== newRewards) {
          console.log('🔄 Tasks updated from database - syncing...');
          
          // Detect specific changes for better notifications
          const addedTasks = formattedTasks.filter(t => !tasks.find(ct => ct.id === t.id));
          const updatedTasks = formattedTasks.filter(t => {
            const current = tasks.find(ct => ct.id === t.id);
            return current && (current.reward !== t.reward || current.title !== t.title);
          });
          const removedTasks = tasks.filter(t => !formattedTasks.find(nt => nt.id === t.id));
          
          // Update tasks
          setTasks(formattedTasks);
          setLastTaskUpdate(new Date());
          
          // Show detailed notifications
          if (addedTasks.length > 0) {
            addNotification({
              type: 'info',
              title: '🆕 New Tasks Available!',
              message: `Admin added ${addedTasks.length} new task(s): ${addedTasks.map(t => t.title).join(', ')}`
            });
          }
          
          if (updatedTasks.length > 0) {
            const updateDetails = updatedTasks.map(t => {
              const current = tasks.find(ct => ct.id === t.id);
              if (current) {
                const changes = [];
                if (current.reward !== t.reward) changes.push(`Reward: ৳${current.reward} → ৳${t.reward}`);
                if (current.title !== t.title) changes.push(`Title: "${current.title}" → "${t.title}"`);
                return `${t.title}: ${changes.join(', ')}`;
              }
              return t.title;
            });
            
            addNotification({
              type: 'info',
              title: '✏️ Tasks Updated!',
              message: `Admin updated ${updatedTasks.length} task(s): ${updateDetails.join('; ')}`
            });
          }
          
          if (removedTasks.length > 0) {
            addNotification({
              type: 'warning',
              title: '🗑️ Tasks Removed',
              message: `Admin removed ${removedTasks.length} task(s): ${removedTasks.map(t => t.title).join(', ')}`
            });
          }
          
          // Auto-refresh related data
          setTimeout(() => {
            loadCompletedTasks();
            loadTaskStreak();
            loadDailyCheckIn();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error syncing tasks:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Load tasks from database
  const loadTasksFromDatabase = async () => {
    try {
      const { data: taskTemplates, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading tasks:', error);
        addNotification({
          type: 'error',
          title: 'Task Loading Failed',
          message: 'Failed to load tasks from database'
        });
        return;
      }

      if (taskTemplates && taskTemplates.length > 0) {
        const formattedTasks: Task[] = taskTemplates.map(template => ({
          id: template.id,
          title: template.title,
          subtitle: template.subtitle || '',
          reward: template.reward,
          type: template.type,
          icon: template.icon || 'gift',
          buttonText: template.button_text || 'COMPLETE',
          cooldown: template.cooldown || 0,
          description: template.description || '',
          isActive: template.is_active || true,
          completionCount: 0,
          maxCompletions: template.max_completions || 1,
          url: template.url || '',
          special: template.type === 'trading_platform' || template.type === 'referral'
        }));
        
        setTasks(formattedTasks);
        setLastTaskUpdate(new Date());
        addNotification({
          type: 'success',
          title: 'Tasks Loaded',
          message: `Loaded ${formattedTasks.length} tasks from database`
        });
      } else {
        // Fallback to default tasks if database is empty
        const defaultTasks: Task[] = [
          {
            id: '1',
            title: 'Daily Check-in',
            subtitle: 'Complete daily check-in to earn real money',
            reward: 50,
            type: 'checkin',
            icon: 'checkin',
            buttonText: 'CHECK IN',
            cooldown: 86400,
            description: 'Check in daily to maintain your streak and earn rewards!',
            isActive: true,
            completionCount: 0,
            maxCompletions: 1,
            url: ''
          },
          {
            id: '2',
            title: 'Join Telegram Channel',
            subtitle: 'BT Community Official',
            reward: 200,
            type: 'social',
            icon: 'social',
            buttonText: 'JOIN CHANNEL',
            description: 'Join our official Telegram channel for updates',
            isActive: true,
            completionCount: 0,
            maxCompletions: 1,
            url: 'https://t.me/bt_community'
          }
        ];
        setTasks(defaultTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      addNotification({
        type: 'error',
        title: 'Task Loading Failed',
        message: 'Failed to load tasks from database'
      });
    }
  };

  // Load tasks when component mounts
  useEffect(() => {
    loadTasksFromDatabase();
  }, []);

  // Check UID availability in real-time
  const checkUIDAvailability = async (uid: string) => {
    if (!uid.trim() || !currentSpecialTask) return;
    
    try {
      const { data, error } = await supabase
        .from('special_task_submissions')
        .select('id, user_id, status')
        .eq('uid_submitted', uid.trim())
        .eq('task_id', currentSpecialTask.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking UID availability:', error);
        return;
      }

      if (data) {
        if (data.user_id === telegramId) {
          // UID used by current user
          return {
            available: false,
            message: 'You have already used this UID',
            type: 'warning'
          };
        } else {
          // UID used by another user
          return {
            available: false,
            message: 'This UID is already used by another user',
            type: 'error'
          };
        }
      }

      return {
        available: true,
        message: 'UID is available',
        type: 'success'
      };
    } catch (error) {
      console.error('Error checking UID availability:', error);
      return null;
    }
  };

  // Real-time UID availability checking
  useEffect(() => {
    if (specialTaskUID.trim() && currentSpecialTask) {
      const timer = setTimeout(async () => {
        const availability = await checkUIDAvailability(specialTaskUID.trim());
        if (availability) {
          // Update UI based on availability
          if (!availability.available) {
            addNotification({
              type: availability.type as 'warning' | 'error',
              title: 'UID Not Available',
              message: availability.message
            });
          }
        }
      }, 1500); // Check after 1.5 seconds of user stopping typing
      
      return () => clearTimeout(timer);
    }
  }, [specialTaskUID, currentSpecialTask]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white p-4 pb-24">
      {/* Dynamic Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <motion.h1 
              className="text-xl font-bold text-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              BT Community Tasks
            </motion.h1>
            <div className="flex items-center gap-2">
              {/* Real-time sync indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isSyncing ? 'bg-blue-400 animate-pulse' : 
                  isUpdating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                }`}></div>
                <span className="text-xs text-gray-400">
                  {isSyncing ? 'Syncing...' : 
                   isUpdating ? 'Updating' : 'Updated'} • {lastTaskUpdate.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Manual sync button */}
            <button
              onClick={syncTasksFromDatabase}
              disabled={isSyncing}
              className="p-2 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              title="Sync tasks from database"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh tasks"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={debugTaskState}
                className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                title="Debug task state"
              >
                🐛
              </button>
            )}
            <button
              onClick={testDatabaseConnection}
              className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
              title="Test database connection"
            >
              🔌
            </button>
            <div className="flex items-center px-3 py-1.5 bg-green-500/20 backdrop-blur-sm rounded-full border border-green-500/30">
              <span className="text-white font-medium">{formatCurrency(balance)}</span>
              <span className="text-green-400 text-xs ml-1">Real Money</span>
            </div>
          </div>
        </div>

        {/* Earn Real Money Banner */}
        <motion.div 
          className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-4 backdrop-blur-sm border border-green-500/30 mb-4"
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
              Earn Real Money in BDT
            </motion.h3>
            <motion.p 
              className="text-sm text-gray-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              Complete tasks and earn real Bangladeshi Taka that you can withdraw anytime!
            </motion.p>
          </div>
        </motion.div>

        {/* Daily Card - Today's Referrals */}
        <motion.div 
          className="bg-gradient-to-r from-gold/20 to-yellow-500/20 rounded-xl p-4 backdrop-blur-sm border border-gold/30 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-gold">Today's Progress</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Daily Check-in</p>
              <p className={`text-lg font-bold ${dailyCheckIn ? 'text-green-400' : 'text-yellow-400'}`}>
                {dailyCheckIn ? '✓ Completed' : '⏰ Pending'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-1" />
              <p className="text-sm text-gray-400">Today's Referrals</p>
              <motion.p 
                className="text-xl font-bold text-blue-400"
                key={todayReferrals}
                initial={{ scale: 1.2, color: '#60a5fa' }}
                animate={{ scale: 1, color: '#60a5fa' }}
                transition={{ duration: 0.3 }}
              >
                {todayReferrals}
              </motion.p>
            </div>
            <div className="text-center">
              <Target className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-sm text-gray-400">Target</p>
              <p className="text-xl font-bold text-green-400">-</p>
            </div>
          </div>
          
          {/* Referral Progress Section */}
          <div className="mt-3 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Referral Progress</span>
              </div>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Track your referral progress
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
              <motion.div 
                className="bg-green-400 h-2 rounded-full transition-all duration-1000"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((todayReferrals / 10) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-400">{todayReferrals} referrals</span>
              <span className="text-green-400">{Math.floor((todayReferrals / 10) * 100)}%</span>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div 
          className="bg-gray-800/30 rounded-xl p-4 backdrop-blur-sm border border-purple-500/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-white">Level {level}</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-500">×{(1 + Math.min(taskStreak * 0.1, 0.5)).toFixed(1)} Streak Bonus</span>
            </div>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${calculateProgress()}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-400">
              {Array.from(completedTasks).filter(Boolean).length}/{tasks.length} Tasks
            </span>
            <span className="text-purple-500">
              {Math.floor(calculateProgress())}% Complete
            </span>
          </div>
        </motion.div>

        {/* Real-time Sync Status Bar */}
        <motion.div 
          className="bg-blue-500/10 rounded-xl p-3 backdrop-blur-sm border border-blue-500/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isSyncing ? 'bg-blue-400 animate-pulse' : 'bg-green-400'
              }`}></div>
              <span className="text-blue-400 text-sm font-medium">
                {isSyncing ? 'Syncing with Admin Panel...' : 'Real-time Sync Active'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span>Last Update: {lastTaskUpdate.toLocaleTimeString()}</span>
              <span>•</span>
              <span>Auto-sync: Every 30s</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            💡 Tasks automatically update when admin makes changes. No need to refresh!
          </div>
        </motion.div>
      </div>

      {/* Task Categories */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'daily', label: 'Daily', description: 'Daily check-in and routine tasks' },
          { id: 'social', label: 'Social', description: 'Social media and community tasks' },
          { id: 'special', label: 'Special', description: 'Trading referral and bonus tasks' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
            }`}
            title={tab.description}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/10 transition-all duration-300 hover:border-purple-500/20"
              onClick={() => setShowTaskInfo(showTaskInfo === task.id ? null : task.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    {task.icon === 'social' && <MessageChat className="w-6 h-6 text-purple-500" />}
                    {task.icon === 'checkin' && <Calendar className="w-6 h-6 text-purple-500" />}
                    {task.icon === 'referral' && <Users className="w-6 h-6 text-purple-500" />}
                    {task.icon === 'video' && <Video className="w-6 h-6 text-purple-500" />}
                    {task.icon === 'share' && <Share2 className="w-6 h-6 text-purple-500" />}
                    {task.icon === 'daily' && <Gift className="w-6 h-6 text-purple-500" />}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{task.title}</h3>
                    <p className="text-gray-400 text-sm">{task.subtitle}</p>
                    {task.special && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-yellow-400">Special Task</span>
                      </div>
                    )}
                  </div>
                </div>
                {taskCooldowns[task.id] > 0 ? (
                  <div className="flex items-center text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTime(taskCooldowns[task.id])}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskAction(task);
                    }}
                    disabled={completedTasks.has(task.id)}
                    className={`px-4 py-1.5 rounded-lg font-medium transition-all duration-300 ${
                      completedTasks.has(task.id)
                        ? 'bg-gray-700/50 text-gray-500'
                        : 'bg-purple-500 text-white hover:bg-purple-600 hover:shadow-lg hover:shadow-purple-500/20'
                    }`}
                  >
                    {completedTasks.has(task.id) ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Done</span>
                      </div>
                    ) : (
                      task.special ? 'Sign Up' : task.buttonText
                    )}
                  </button>
                )}
              </div>

              {/* Task Info Panel */}
              <AnimatePresence>
                {showTaskInfo === task.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 pt-4 border-t border-gray-700/50"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Reward</span>
                        <span className="text-gold">৳{task.reward}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Streak Bonus</span>
                        <span className="text-green-500">+{(taskStreak * 10)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Total Earnings</span>
                        <div className="flex items-center space-x-1">
                          
                          <span className="text-green-400 font-semibold">
                            {formatCurrency(Math.floor(task.reward * (1 + Math.min(taskStreak * 0.1, 0.5))))}
                          </span>
                        </div>
                      </div>
                      {task.cooldown && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Cooldown</span>
                          <span className="text-blue-500">{formatTime(task.cooldown)}</span>
                        </div>
                      )}
                      {task.url && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Task URL</span>
                          <a 
                            href={task.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.special ? 'Sign Up Link' : 'Open Link'}
                          </a>
                        </div>
                      )}
                      {task.special && (
                        <div className="mt-2 p-2 bg-purple-500/10 rounded border border-purple-500/20">
                          <p className="text-xs text-purple-400 text-center">
                            ⭐ Special Task: Sign up externally, then submit UID for verification
                          </p>
                        </div>
                      )}
                      <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                        <p className="text-xs text-green-400 text-center">
                          💰 Earn real money in BDT - withdraw anytime!
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-3 flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="text-green-400 font-semibold">{formatCurrency(task.reward)}</span>
                  <span className="text-gray-400 text-xs">Real Money</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Trading Platform Referral Task Modal */}
      {showTradingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-6 rounded-lg max-w-md w-full border border-white/10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-navy" />
              </div>
              <h3 className="text-xl font-bold text-gold mb-2">Trading Platform Referral</h3>
              <p className="text-gray-300 text-sm">Join our trading platform and earn rewards</p>
            </div>

            {/* Referral Link Section */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Step 1: Join Platform</h4>
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 mb-3">
                <p className="text-sm text-gray-400 mb-2">Referral link will be provided by admin:</p>
                <p className="text-sm text-gray-300">Contact support for referral link</p>
              </div>
              <button
                onClick={() => addNotification({
                  type: 'info',
                  title: 'Referral Link',
                  message: 'Please contact support for the referral link'
                })}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold"
              >
                Contact Support
              </button>
            </div>

            {/* UID Input Section */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Step 2: Enter Your UID</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={tradingUID}
                  onChange={(e) => setTradingUID(e.target.value)}
                  placeholder="Enter your Trading Platform UID"
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border-2 border-gray-600 focus:border-gold focus:outline-none"
                />
                <p className="text-xs text-gray-400">
                  After joining, find your UID in your profile or account settings
                </p>
              </div>
            </div>

            {/* Status Display */}
            {tradingStatus !== 'pending' && (
              <div className="mb-6 p-4 rounded-lg border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  {tradingStatus === 'verified' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`font-semibold ${
                    tradingStatus === 'verified' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tradingStatus === 'verified' ? 'Verified & Approved!' : 'Rejected'}
                  </span>
                </div>
                <p className="text-sm text-gray-300">
                  {tradingStatus === 'verified' 
                    ? 'Your UID has been verified. You will receive ৳200 reward soon!'
                    : 'Your UID verification was rejected. Please check and try again.'
                  }
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowTradingTask(false)}
                className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-300"
              >
                Close
              </button>
              {tradingStatus === 'pending' && (
                <button
                  onClick={handleTradingUIDSubmit}
                  disabled={!tradingUID.trim()}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all duration-300 font-semibold ${
                    tradingUID.trim() 
                      ? 'bg-gradient-to-r from-gold to-yellow-500 text-navy hover:from-yellow-400 hover:to-gold' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit UID
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Special Task Modal */}
      {showSpecialTask && currentSpecialTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-6 rounded-lg max-w-md w-full border border-white/10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{currentSpecialTask.title}</h3>
              <p className="text-gray-300 text-sm">{currentSpecialTask.subtitle}</p>
            </div>

            {/* Step 1: External Signup */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Step 1: Complete External Signup</h4>
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 mb-3">
                <p className="text-sm text-gray-400 mb-2">Task description:</p>
                <p className="text-sm text-gray-300">{currentSpecialTask.description}</p>
              </div>
              
              {currentSpecialTask.url && (
                <div className="space-y-3">
                  <button
                    onClick={() => window.open(currentSpecialTask.url, '_blank')}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold"
                  >
                    🔗 Sign Up Now
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Click "Sign Up Now" to complete the external signup process
                  </p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-xs text-blue-400 text-center">
                  💡 After completing signup, find your UID/Reference number in your profile
                </p>
              </div>
              
              {/* Global UID Restriction Info */}
              <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <span className="text-red-400 text-sm font-medium">Important: Global UID Restriction</span>
                </div>
                <div className="text-xs text-red-300 space-y-1">
                  <div>• Each UID can only be used ONCE in the entire system</div>
                  <div>• If another user has already used a UID, you cannot use it</div>
                  <div>• Make sure your UID is unique and correct before submitting</div>
                  <div>• UIDs are tied to specific tasks and cannot be reused</div>
                </div>
              </div>
            </div>

            {/* Step 2: UID Input */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Step 2: Submit Your UID</h4>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={specialTaskUID}
                    onChange={(e) => setSpecialTaskUID(e.target.value)}
                    placeholder="Enter your UID/Reference number"
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-all duration-300 ${
                      specialTaskStatus !== 'pending' 
                        ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-white border-gray-600 focus:border-purple-500'
                    }`}
                    disabled={specialTaskStatus !== 'pending'}
                  />
                  {/* Real-time UID status indicator */}
                  {specialTaskUID.trim() && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-400 animate-pulse"></div>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-400">
                  After completing the signup, find your UID in your profile or account settings
                </p>
                
                {/* UID Validation Message */}
                {specialTaskUID.trim() && (
                  <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                    <p className="text-xs text-blue-400 text-center">
                      💡 Each UID can only be used ONCE in the entire system by ANY user. Make sure it's correct!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Display */}
            {specialTaskStatus !== 'pending' && (
              <div className="mb-6 p-4 rounded-lg border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  {specialTaskStatus === 'verified' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`font-semibold ${
                    specialTaskStatus === 'verified' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {specialTaskStatus === 'verified' ? 'Verified & Approved!' : 'Rejected'}
                  </span>
                </div>
                <p className="text-sm text-gray-300">
                  {specialTaskStatus === 'verified' 
                    ? `Your UID has been verified! You received ৳${currentSpecialTask.reward} reward.`
                    : 'Your UID verification was rejected. Please check and try again.'
                  }
                </p>
              </div>
            )}

            {/* Success Message After Submission */}
            {specialTaskSubmissionId && specialTaskStatus === 'pending' && (
              <div className="mb-6 p-4 rounded-lg border border-green-500/20 bg-green-500/10">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-green-400">Successfully Submitted! 🎉</span>
                </div>
                <p className="text-sm text-green-300 mb-2">
                  Your UID has been successfully submitted for admin approval.
                </p>
                <div className="text-xs text-green-400 space-y-1">
                  <div>• Status: <span className="font-medium">Pending</span></div>
                  <div>• Reward: <span className="font-medium">৳{currentSpecialTask.reward}</span></div>
                  <div>• Submitted: <span className="font-medium">{specialTaskSubmissionTime ? new Date(specialTaskSubmissionTime).toLocaleString() : 'Just now'}</span></div>
                </div>
                <p className="text-xs text-green-400 mt-2">
                  💡 You will be notified when admin reviews your submission.
                </p>
              </div>
            )}

            {/* Action Buttons */}
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
                className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-300"
              >
                Close
              </button>
              {specialTaskStatus === 'pending' && !specialTaskSubmissionId && (
                <button
                  onClick={handleSpecialTaskUIDSubmit}
                  disabled={!specialTaskUID.trim() || isCheckingUID}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all duration-300 font-semibold ${
                    specialTaskUID.trim() && !isCheckingUID
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isCheckingUID ? 'Checking...' : 'Verify UID'}
                </button>
              )}
              {specialTaskSubmissionId && specialTaskStatus === 'pending' && (
                <button
                  onClick={() => {
                    setShowSpecialTask(false);
                    setCurrentSpecialTask(null);
                    setSpecialTaskUID('');
                    setSpecialTaskStatus('pending');
                    setSpecialTaskSubmissionId(null);
                    setSpecialTaskSubmissionTime(null);
                  }}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 font-semibold"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reward Animation */}
      <AnimatePresence>
        {/* The showRewardAnimation and lastReward state variables were removed, so this block is now empty. */}
      </AnimatePresence>
    </div>
  );
}