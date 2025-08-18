import React, { useState, useEffect } from 'react';
import { Gift, Search, Filter, CheckCircle, Clock, TrendingUp, DollarSign, Users, Activity, Plus, Edit, Trash2, Save, X, Eye, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: number;
  completed_at: string;
  created_at: string;
  user?: {
    first_name?: string;
    username?: string;
  };
}

interface SpecialTaskSubmission {
  id: string;
  user_id: string;
  task_id: string;
  task_type: string;
  uid_submitted: string;
  status: 'pending' | 'verified' | 'rejected';
  reward_amount: number;
  admin_notes?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  user?: {
    first_name?: string;
    username?: string;
    balance?: number;
  };
  task_template?: {
    title: string;
    subtitle?: string;
  };
}

interface TaskTemplate {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  reward: number;
  type: string;
  icon?: string;
  button_text?: string;
  cooldown: number;
  max_completions: number;
  is_active: boolean;
  url?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminTasks() {
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [specialTaskSubmissions, setSpecialTaskSubmissions] = useState<SpecialTaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTaskType, setFilterTaskType] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'social' | 'special'>('daily');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete'>('activate');
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    totalRewards: 0,
    pendingVerification: 0
  });

  // Form state for adding/editing tasks - Updated to match database schema
  const [taskForm, setTaskForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    reward: 50,
    type: 'checkin',
    icon: '',
    button_text: 'COMPLETE',
    cooldown: 0,
    max_completions: 1,
    is_active: true,
    url: ''
  });

  useEffect(() => {
    loadTaskCompletions();
    loadTaskTemplates();
    loadSpecialTaskSubmissions();
  }, []);

  const loadTaskCompletions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          *,
          user:users!task_completions_user_id_fkey(telegram_id)
        `)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setTaskCompletions(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const today = data?.filter(t => 
        new Date(t.completed_at).toDateString() === new Date().toDateString()
      ).length || 0;
      const thisWeek = data?.filter(t => 
        new Date(t.completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0;
      
      // Get task templates to calculate rewards
      const { data: templates } = await supabase
        .from('task_templates')
        .select('id, reward');
      
      const totalRewards = data?.reduce((sum, t) => {
        const template = templates?.find(temp => temp.id === t.task_id);
        return sum + (template?.reward || 0);
      }, 0) || 0;
      
      // Get pending special task submissions count
      const pendingSubmissions = specialTaskSubmissions.filter(s => s.status === 'pending').length;
      
      setStats({ total, today, thisWeek, totalRewards, pendingVerification: pendingSubmissions });
    } catch (error) {
      console.error('Error loading task completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setTaskTemplates(data || []);
    } catch (error) {
      console.error('Error loading task templates:', error);
    }
  };

  const loadSpecialTaskSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('special_task_submissions')
        .select(`
          *,
          user:users!special_task_submissions_user_id_fkey(telegram_id, first_name, username, balance),
          task_template:task_templates!special_task_submissions_task_id_fkey(id, title, subtitle)
        `)
        .order('created_at', { ascending: false });

      if (!error) setSpecialTaskSubmissions(data || []);
    } catch (error) {
      console.error('Error loading special task submissions:', error);
    }
  };

  const filteredTaskCompletions = taskCompletions.filter(completion => {
    const matchesSearch = 
      completion.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      completion.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      completion.user_id.toLowerCase().includes(searchTerm);
    
    const matchesFilter = filterTaskType === 'all' || completion.task_id.toString().includes(filterTaskType);

    return matchesSearch && matchesFilter;
  });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('=== ADD TASK DEBUG ===');
      console.log('Form data:', taskForm);
      console.log('Supabase client:', supabase);
      console.log('Current user:', await supabase.auth.getUser());
      
      const { data, error } = await supabase
        .from('task_templates')
        .insert([taskForm])
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }

      console.log('Task added successfully:', data);
      setTaskTemplates([data, ...taskTemplates]);
      setShowAddTask(false);
      resetTaskForm();
      
      // Update user interface by refreshing task data
      loadTaskCompletions();
    } catch (error) {
      console.error('Error adding task:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      alert('Error adding task: ' + (error as Error).message);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const { data, error } = await supabase
        .from('task_templates')
        .update(taskForm)
        .eq('id', editingTask.id)
        .select()
        .single();

      if (error) throw error;

      setTaskTemplates(taskTemplates.map(t => t.id === editingTask.id ? data : t));
      setEditingTask(null);
      resetTaskForm();
      
      // Update user interface
      loadTaskCompletions();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task: ' + (error as Error).message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTaskTemplates(taskTemplates.filter(t => t.id !== taskId));
      
      // Update user interface
      loadTaskCompletions();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task: ' + (error as Error).message);
    }
  };

  // Bulk action functions
  const handleBulkAction = async () => {
    if (selectedTasks.size === 0) {
      alert('Please select tasks first');
      return;
    }

    if (bulkAction === 'delete' && !confirm(`Are you sure you want to delete ${selectedTasks.size} tasks?`)) {
      return;
    }

    try {
      const taskIds = Array.from(selectedTasks);
      
      if (bulkAction === 'delete') {
        const { error } = await supabase
          .from('task_templates')
          .delete()
          .in('id', taskIds);

        if (error) throw error;
        
        setTaskTemplates(taskTemplates.filter(t => !taskIds.includes(t.id)));
        setSelectedTasks(new Set());
        
        alert(`Successfully deleted ${taskIds.length} tasks`);
      } else {
        const { error } = await supabase
          .from('task_templates')
          .update({ is_active: bulkAction === 'activate' })
          .in('id', taskIds);

        if (error) throw error;
        
        setTaskTemplates(taskTemplates.map(t => 
          taskIds.includes(t.id) ? { ...t, is_active: bulkAction === 'activate' } : t
        ));
        setSelectedTasks(new Set());
        
        alert(`Successfully ${bulkAction === 'activate' ? 'activated' : 'deactivated'} ${taskIds.length} tasks`);
      }
      
      // Update user interface
      loadTaskCompletions();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Error performing bulk action: ' + (error as Error).message);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const selectAllTasks = () => {
    const categoryTasks = getTasksByCategory(activeTab);
    setSelectedTasks(new Set(categoryTasks.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
  };

  // Handle UID verification for special tasks
  const handleUIDVerification = async (submissionId: string, status: 'verified' | 'rejected', adminNotes?: string) => {
    try {
      const submission = specialTaskSubmissions.find(s => s.id === submissionId);
      if (!submission) {
        alert('Submission not found. Please refresh the page.');
        return;
      }

      // Validate UID format if verifying
      if (status === 'verified') {
        if (!submission.uid_submitted || submission.uid_submitted.trim().length < 3) {
          alert('Invalid UID format. UID must be at least 3 characters long.');
          return;
        }
      }

      // Validate rejection reason
      if (status === 'rejected' && (!adminNotes || adminNotes.trim().length < 5)) {
          alert('Please provide a rejection reason (at least 5 characters).');
          return;
      }

      // Show confirmation dialog
      const confirmMessage = status === 'verified' 
        ? `Are you sure you want to verify this UID?\n\nUser: ${submission.user?.first_name || 'Unknown'}\nTask: ${submission.task_template?.title || 'Unknown'}\nUID: ${submission.uid_submitted}\nReward: ৳${submission.reward_amount}`
        : `Are you sure you want to reject this UID?\n\nUser: ${submission.user?.first_name || 'Unknown'}\nTask: ${submission.task_template?.title || 'Unknown'}\nUID: ${submission.uid_submitted}\nReason: ${adminNotes}`;

      if (!confirm(confirmMessage)) {
        return;
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from('special_task_submissions')
        .update({
          status: status,
          admin_notes: adminNotes || '',
          verified_by: 'admin', // In real app, use actual admin ID
          verified_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // If verified, add reward to user balance
      if (status === 'verified') {
        const { error: balanceError } = await supabase
          .from('users')
          .update({ 
            balance: (submission.user?.balance || 0) + submission.reward_amount,
            updated_at: new Date().toISOString()
          })
          .eq('telegram_id', submission.user_id);

        if (balanceError) {
          console.error('Error updating user balance:', balanceError);
          alert('UID verified but failed to update user balance. Please contact support.');
        }

        // Send notification to user
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: submission.user_id,
              title: 'Special Task Verified! 🎉',
              message: `Your UID for "${submission.task_template?.title || 'Special Task'}" has been verified! You received ৳${submission.reward_amount} reward.`,
              type: 'success',
              action_url: '/tasks',
              metadata: { task_id: submission.task_id, reward: submission.reward_amount }
            });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      } else if (status === 'rejected') {
        // Send rejection notification
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: submission.user_id,
              title: 'Special Task Rejected ❌',
              message: `Your UID for "${submission.task_template?.title || 'Special Task'}" was rejected. Reason: ${adminNotes || 'No reason provided'}`,
              type: 'error',
              action_url: '/tasks',
              metadata: { task_id: submission.task_id, reason: adminNotes }
            });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      // Reload submissions
      await loadSpecialTaskSubmissions();
      
      // Show success message
      alert(`UID ${status === 'verified' ? 'verified' : 'rejected'} successfully!`);
      
    } catch (error) {
      console.error('Error verifying UID:', error);
      alert('Error verifying UID: ' + (error as Error).message);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      subtitle: '',
      description: '',
      reward: 50,
      type: 'checkin',
      icon: '',
      button_text: 'COMPLETE',
      cooldown: 0,
      max_completions: 1,
      is_active: true,
      url: ''
    });
  };

  const startEditing = (task: TaskTemplate) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      subtitle: task.subtitle || '',
      description: task.description || '',
      reward: task.reward,
      type: task.type,
      icon: task.icon || '',
      button_text: task.button_text || 'COMPLETE',
      cooldown: task.cooldown,
      max_completions: task.max_completions,
      is_active: task.is_active,
      url: task.url || ''
    });
  };

  const cancelEditing = () => {
    setEditingTask(null);
    resetTaskForm();
  };

  const getTaskTypes = () => {
    const types = [...new Set(taskTemplates.map(t => t.type))];
    return types;
  };

  // Filter tasks by category
  const getTasksByCategory = (category: 'daily' | 'social' | 'special') => {
    switch (category) {
      case 'daily':
        return taskTemplates.filter(task => 
          task.type === 'checkin' || 
          task.type === 'daily' || 
          task.type === 'routine'
        );
      case 'social':
        return taskTemplates.filter(task => 
          task.type === 'social' || 
          task.type === 'social_media' || 
          task.type === 'community'
        );
      case 'special':
        return taskTemplates.filter(task => 
          task.type === 'referral' || 
          task.type === 'trading_platform' || 
          task.type === 'bonus' || 
          task.type === 'special'
        );
      default:
        return taskTemplates;
    }
  };

  // Get category-specific stats
  const getCategoryStats = (category: 'daily' | 'social' | 'special') => {
    const categoryTasks = getTasksByCategory(category);
    const totalRewards = categoryTasks.reduce((sum, task) => sum + task.reward, 0);
    const activeTasks = categoryTasks.filter(task => task.is_active).length;
    
    return {
      total: categoryTasks.length,
      active: activeTasks,
      inactive: categoryTasks.length - activeTasks,
      totalRewards
    };
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

  const getTaskTypeColor = (taskType: string) => {
    const colors = {
      'checkin': 'bg-blue-500/20 text-blue-400',
      'referral': 'bg-green-500/20 text-green-400',
      'trading_platform': 'bg-purple-500/20 text-purple-400',
      'social': 'bg-pink-500/20 text-pink-400',
      'daily': 'bg-gold/20 text-gold'
    };
    return colors[taskType as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
  };

  const getTaskTypeIcon = (taskType: string) => {
    const icons = {
      'checkin': '📅',
      'referral': '👥',
      'trading_platform': '📈',
      'social': '📱',
      'daily': '⭐'
    };
    return icons[taskType as keyof typeof icons] || '📋';
  };

  const getStatusColor = (status: 'pending' | 'verified' | 'rejected') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'verified':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: 'pending' | 'verified' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800/90 backdrop-blur-sm border-r border-white/10 p-4">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
            <Gift className="w-6 h-6 text-navy" />
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
            Tasks Management
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Manage task templates and monitor completions in BT Community
          </motion.p>
          
          {/* Current Category Summary */}
          <motion.div 
            className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {activeTab === 'daily' ? '📅' : activeTab === 'social' ? '📱' : '⭐'}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white capitalize">
                    {activeTab} Tasks Overview
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Manage {activeTab} tasks for users to complete and earn rewards
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gold">
                  {formatCurrency(getCategoryStats(activeTab).totalRewards)}
                </div>
                <div className="text-gray-400 text-sm">Total Rewards</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-gray-400">Total Tasks</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="text-3xl font-bold text-blue-400">{stats.today}</div>
            <div className="text-gray-400">Today</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="text-3xl font-bold text-green-400">{stats.thisWeek}</div>
            <div className="text-gray-400">This Week</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalRewards)}</div>
            <div className="text-gray-400">Total Rewards</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="text-3xl font-bold text-yellow-400">{stats.pendingVerification}</div>
            <div className="text-gray-400">Pending</div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="text-3xl font-bold text-purple-400">{specialTaskSubmissions.length}</div>
            <div className="text-gray-400">Total Submissions</div>
          </motion.div>
        </div>

        {/* Task Templates Section */}
        <div className="glass p-6 border border-white/10 rounded-xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Task Templates</h2>
            <button
              onClick={() => setShowAddTask(true)}
              className="px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add New Task
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'daily', label: 'Daily Tasks', icon: '📅', description: 'Daily check-in and routine tasks' },
              { id: 'social', label: 'Social Tasks', icon: '📱', description: 'Social media and community tasks' },
              { id: 'special', label: 'Special Tasks', icon: '⭐', description: 'Referral, trading, and bonus tasks' }
            ].map((tab) => {
              const stats = getCategoryStats(tab.id as 'daily' | 'social' | 'special');
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'daily' | 'social' | 'special')}
                  className={`px-6 py-3 rounded-lg whitespace-nowrap transition-all border-2 ${
                    activeTab === tab.id
                      ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                      : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:bg-gray-700 hover:border-gray-500'
                  }`}
                  title={tab.description}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {stats.total} tasks • {stats.active} active
                  </div>
                </button>
              );
            })}
          </div>

          {/* Category Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {(() => {
              const stats = getCategoryStats(activeTab);
              return (
                <>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-gray-400 text-sm">Total Tasks</div>
                  </div>
                  <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/30">
                    <div className="text-2xl font-bold text-green-400">{stats.active}</div>
                    <div className="text-green-400 text-sm">Active Tasks</div>
                  </div>
                  <div className="bg-gold/20 p-4 rounded-lg border border-gold/30">
                    <div className="text-2xl font-bold text-gold">{formatCurrency(stats.totalRewards)}</div>
                    <div className="text-gold text-sm">Total Rewards</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Quick Actions for Common Task Types */}
          <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily Check-in Quick Action */}
              <button
                onClick={() => {
                  setTaskForm({
                    title: 'Daily Check-in',
                    subtitle: 'Complete daily check-in to earn real money',
                    description: 'Check in daily to maintain your streak and earn rewards. Higher streaks give bonus rewards!',
                    reward: 50,
                    type: 'checkin',
                    icon: '📅',
                    button_text: 'CHECK IN',
                    cooldown: 86400,
                    max_completions: 1,
                    is_active: true,
                    url: ''
                  });
                  setShowAddTask(true);
                }}
                className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all duration-300 text-left"
              >
                <div className="text-2xl mb-2">📅</div>
                <div className="text-blue-400 font-medium">Daily Check-in</div>
                <div className="text-gray-400 text-sm">৳50 reward, 24h cooldown</div>
              </button>

              {/* Social Media Quick Action */}
              <button
                onClick={() => {
                  setTaskForm({
                    title: 'Join Telegram Channel',
                    subtitle: 'BT Community Official',
                    description: 'Join our official Telegram channel for updates and announcements',
                    reward: 200,
                    type: 'social',
                    icon: '📱',
                    button_text: 'JOIN CHANNEL',
                    cooldown: 0,
                    max_completions: 1,
                    is_active: true,
                    url: 'https://t.me/bt_community'
                  });
                  setShowAddTask(true);
                }}
                className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all duration-300 text-left"
              >
                <div className="text-2xl mb-2">📱</div>
                <div className="text-green-400 font-medium">Social Media</div>
                <div className="text-gray-400 text-sm">৳200 reward, no cooldown</div>
              </button>

              {/* Referral Quick Action */}
              <button
                onClick={() => {
                  setTaskForm({
                    title: 'Refer a Friend',
                    subtitle: 'Earn from referrals',
                    description: 'Invite friends to join BT Community and earn referral bonuses',
                    reward: 300,
                    type: 'referral',
                    icon: '👥',
                    button_text: 'INVITE FRIEND',
                    cooldown: 0,
                    max_completions: 10,
                    is_active: true,
                    url: ''
                  });
                  setShowAddTask(true);
                }}
                className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-all duration-300 text-left"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="text-purple-400 font-medium">Referral Task</div>
                <div className="text-gray-400 text-sm">৳300 reward, unlimited</div>
              </button>
            </div>
          </div>

          {/* Task Templates Table */}
          <div className="overflow-x-auto">
            {/* Bulk Actions Bar */}
            {selectedTasks.size > 0 && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-blue-400 font-medium">
                      {selectedTasks.size} task(s) selected
                    </span>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value as 'activate' | 'deactivate' | 'delete')}
                      className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    >
                      <option value="activate">Activate</option>
                      <option value="deactivate">Deactivate</option>
                      <option value="delete">Delete</option>
                    </select>
                    <button
                      onClick={handleBulkAction}
                      className="px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                    >
                      Apply to {selectedTasks.size} task(s)
                    </button>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTasks.size === getTasksByCategory(activeTab).length && getTasksByCategory(activeTab).length > 0}
                      onChange={selectAllTasks}
                      className="w-4 h-4 text-gold bg-gray-800 border-gray-600 rounded focus:ring-gold focus:ring-2"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">URL/Link</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {getTasksByCategory(activeTab).map((task, index) => (
                  <motion.tr
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="hover:bg-gray-800/30 transition-colors duration-200"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="w-4 h-4 text-gold bg-gray-800 border-gray-600 rounded focus:ring-gold focus:ring-2"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        <div className="text-sm text-gray-400">{task.subtitle}</div>
                        {task.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaskTypeColor(task.type)}`}>
                        {getTaskTypeIcon(task.type)}
                        <span className="ml-1">{task.type.replace('_', ' ').toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-white">{formatCurrency(task.reward)}</div>
                      <div className="text-xs text-gray-400">BDT</div>
                    </td>
                    <td className="px-4 py-4">
                      {task.url ? (
                        <div className="max-w-xs">
                          <a 
                            href={task.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm truncate block"
                          >
                            {task.url}
                          </a>
                          <div className="text-xs text-gray-400">Click to open</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No URL</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {task.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditing(task)}
                          className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                          title="Edit Task"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {/* Empty State */}
            {getTasksByCategory(activeTab).length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-lg mb-2">No {activeTab} tasks found</div>
                <div className="text-gray-500 text-sm">Create your first {activeTab} task to get started</div>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Special Task Submissions Section */}
        <div className="glass p-6 border border-white/10 rounded-xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Special Task UID Submissions</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {specialTaskSubmissions.filter(s => s.status === 'pending').length} pending verification
                </span>
                <span className="text-sm text-gray-400">
                  • {specialTaskSubmissions.filter(s => s.status === 'verified').length} verified
                </span>
                <span className="text-sm text-gray-400">
                  • {specialTaskSubmissions.filter(s => s.status === 'rejected').length} rejected
                </span>
              </div>
              <button
                onClick={loadSpecialTaskSubmissions}
                className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all duration-300 text-sm"
                title="Refresh submissions"
              >
                <RefreshCw className="w-4 h-4 inline mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">UID Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {specialTaskSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-gray-400">
                      No special task submissions found
                    </td>
                  </tr>
                ) : (
                  specialTaskSubmissions.map((submission, index) => (
                    <motion.tr
                      key={submission.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-gray-800/30 transition-colors duration-200"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-semibold text-sm">
                              {submission.user?.first_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{submission.user?.first_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-400">@{submission.user?.username || 'No username'}</div>
                            <div className="text-xs text-gray-500">ID: {submission.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{submission.task_template?.title || 'Unknown Task'}</div>
                          <div className="text-sm text-gray-400">{submission.task_template?.subtitle || ''}</div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(submission.task_type)}`}>
                            {getTaskTypeIcon(submission.task_type)}
                            <span className="ml-1">{submission.task_type.replace('_', ' ').toUpperCase()}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-white font-mono bg-gray-800 px-2 py-1 rounded">
                          {submission.uid_submitted}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Submitted UID</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-white">{formatCurrency(submission.reward_amount)}</div>
                        <div className="text-xs text-gray-400">BDT Reward</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                          {getStatusIcon(submission.status)}
                          <span className="ml-1 capitalize">{submission.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-white">{formatDate(submission.created_at)}</div>
                        {submission.verified_at && (
                          <div className="text-xs text-gray-400">
                            Verified: {formatDate(submission.verified_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          {submission.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUIDVerification(submission.id, 'verified')}
                                className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                                title="Verify UID"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (reason !== null) {
                                    handleUIDVerification(submission.id, 'rejected', reason);
                                  }
                                }}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                title="Reject UID"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {submission.admin_notes && (
                            <div className="text-xs text-gray-400 max-w-xs">
                              <strong>Notes:</strong> {submission.admin_notes}
                            </div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Task Modal */}
        <AnimatePresence>
          {(showAddTask || editingTask) && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass p-8 border border-white/10 rounded-xl w-full max-w-md"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    {editingTask ? 'Edit Task' : 'Add New Task'}
                  </h3>
                  <button
                    onClick={editingTask ? cancelEditing : () => setShowAddTask(false)}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={editingTask ? handleEditTask : handleAddTask} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Task Title</label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      placeholder="Enter task title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Task Subtitle</label>
                    <input
                      type="text"
                      value={taskForm.subtitle}
                      onChange={(e) => setTaskForm({ ...taskForm, subtitle: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      placeholder="Optional subtitle for the task"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      rows={3}
                      placeholder="Describe what users need to do to complete this task"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Task Type</label>
                      <select
                        value={taskForm.type}
                        onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      >
                        <optgroup label="Daily Tasks">
                          <option value="checkin">Daily Check-in</option>
                          <option value="daily">Daily Task</option>
                          <option value="routine">Routine Task</option>
                        </optgroup>
                        <optgroup label="Social Tasks">
                          <option value="social">Social Media</option>
                          <option value="social_media">Social Media Follow</option>
                          <option value="community">Community Join</option>
                        </optgroup>
                        <optgroup label="Special Tasks">
                          <option value="referral">Referral</option>
                          <option value="trading_platform">Trading Platform</option>
                          <option value="bonus">Bonus Task</option>
                          <option value="special">Special Task</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Reward Amount (BDT)</label>
                      <input
                        type="number"
                        value={taskForm.reward}
                        onChange={(e) => setTaskForm({ ...taskForm, reward: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                        min="0"
                        placeholder="50"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
                      <input
                        type="text"
                        value={taskForm.icon}
                        onChange={(e) => setTaskForm({ ...taskForm, icon: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                        placeholder="Icon identifier (e.g., checkin, referral)"
                      />
                      <div className="text-xs text-gray-400 mt-1">Use emoji or icon name</div>
                  </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Button Text</label>
                      <input
                        type="text"
                        value={taskForm.button_text}
                        onChange={(e) => setTaskForm({ ...taskForm, button_text: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                        placeholder="Button text (e.g., COMPLETE, JOIN)"
                        required
                      />
                    </div>
                    </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Cooldown (seconds)</label>
                      <input
                        type="number"
                        value={taskForm.cooldown}
                        onChange={(e) => setTaskForm({ ...taskForm, cooldown: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                        min="0"
                        placeholder="0 for no cooldown"
                      />
                      <div className="text-xs text-gray-400 mt-1">86400 = 24 hours</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Completions</label>
                    <input
                      type="number"
                      value={taskForm.max_completions}
                      onChange={(e) => setTaskForm({ ...taskForm, max_completions: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      min="1"
                        placeholder="1"
                      required
                    />
                      <div className="text-xs text-gray-400 mt-1">How many times a user can complete this task</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Task URL (if applicable)</label>
                    <input
                      type="url"
                      value={taskForm.url}
                      onChange={(e) => setTaskForm({ ...taskForm, url: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      Required for social tasks (Telegram, Twitter, etc.) and trading platform tasks
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={taskForm.is_active}
                      onChange={(e) => setTaskForm({ ...taskForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-gold bg-gray-800 border-gray-600 rounded focus:ring-gold focus:ring-2"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-300">
                      Task is active and visible to users
                    </label>
                  </div>

                  {/* Task Type Specific Hints */}
                  {taskForm.type === 'social' || taskForm.type === 'social_media' ? (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="text-blue-400 text-sm font-medium mb-1">💡 Social Task Tips:</div>
                      <div className="text-blue-300 text-xs space-y-1">
                        <div>• Always provide a valid URL for users to visit</div>
                        <div>• Set appropriate cooldown (usually 0 for social tasks)</div>
                        <div>• Use clear button text like "JOIN CHANNEL" or "FOLLOW TWITTER"</div>
                      </div>
                    </div>
                  ) : taskForm.type === 'referral' || taskForm.type === 'trading_platform' ? (
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="text-purple-400 text-sm font-medium mb-1">💡 Special Task Tips:</div>
                      <div className="text-purple-300 text-xs space-y-1">
                        <div>• Higher rewards for referral and trading tasks</div>
                        <div>• Set max completions based on task type</div>
                        <div>• Consider longer cooldowns for high-value tasks</div>
                      </div>
                    </div>
                  ) : taskForm.type === 'checkin' ? (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="text-green-400 text-sm font-medium mb-1">💡 Daily Check-in Tips:</div>
                      <div className="text-green-300 text-xs space-y-1">
                        <div>• Set cooldown to 86400 seconds (24 hours)</div>
                        <div>• Max completions should be 1 per day</div>
                        <div>• Moderate rewards to encourage daily engagement</div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                    >
                      <Save className="w-4 h-4 inline mr-2" />
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </button>
                    <button
                      type="button"
                      onClick={editingTask ? cancelEditing : () => setShowAddTask(false)}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="glass p-6 border border-white/10 rounded-xl mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                />
              </div>

              {/* Filter */}
              <select
                value={filterTaskType}
                onChange={(e) => setFilterTaskType(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
              >
                <option value="all">All Task Types</option>
                {getTaskTypes().map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
                ))}
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

        {/* Task Completions Table */}
        <div className="glass border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Task Completions</h2>
            <p className="text-gray-400 text-sm">Monitor user task completions and verify rewards</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Task Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Completed At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      Loading tasks...
                    </td>
                  </tr>
                ) : filteredTaskCompletions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      No tasks found
                    </td>
                  </tr>
                ) : (
                  filteredTaskCompletions.map((completion, index) => (
                    <motion.tr
                      key={completion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-gray-800/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
                            <span className="text-navy font-semibold text-sm">
                              {completion.user?.first_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{completion.user?.first_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-400">@{completion.user?.username || 'No username'}</div>
                            <div className="text-xs text-gray-500">ID: {completion.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{getTaskTypeIcon(completion.task_id.toString())}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaskTypeColor(completion.task_id.toString())}`}>
                            {completion.task_id.toString().replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Task #{completion.task_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">
                          {(() => {
                            const template = taskTemplates.find(t => t.id === completion.task_id.toString());
                            return template ? formatCurrency(template.reward) : '৳0';
                          })()}
                        </div>
                        <div className="text-xs text-gray-400">BDT Reward</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{formatDate(completion.completed_at)}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(completion.completed_at).toDateString() === new Date().toDateString() ? 'Today' : 'Earlier'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Removed verify button as per edit hint */}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 