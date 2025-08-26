import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, Filter, CheckCircle, XCircle, Eye, Clock, AlertCircle, Plus, Edit, Trash2, Save, X, Copy, Settings, RefreshCw, Link, Users, DollarSign, Target, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../store/userStore';

interface TradingReferral {
  id: string;
  user_id: number;
  platform_name: string;
  trading_uid: string;
  referral_link: string;
  status: 'pending' | 'verified' | 'rejected';
  reward_amount: number;
  verification_date: string | null;
  created_at: string;
  user: {
    first_name: string;
    username: string;
    balance: number;
  };
}

interface TradingPlatform {
  id: string;
  name: string;
  referral_link: string;
  reward_amount: number;
  is_active: boolean;
  created_at: string;
}

// Add individual referral system interface
interface IndividualReferralConfig {
  base_url: string;
  referral_reward: number;
  is_active: boolean;
  tracking_params: string;
}

interface ReferralConfig {
  base_url: string;
  referral_reward: number;
  is_active: boolean;
  unique_link_enabled: boolean;
  link_format: 'telegram_id' | 'referral_code' | 'both';
  group_link: string;
  tracking_enabled: boolean;
}

export default function AdminTradingReferrals() {
  const { addNotification } = useUserStore();
  const [tradingReferrals, setTradingReferrals] = useState<TradingReferral[]>([]);
  const [tradingPlatforms, setTradingPlatforms] = useState<TradingPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<TradingPlatform | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    totalRewards: 0,
    pendingRewards: 0
  });

  // Form state for adding/editing platforms
  const [platformForm, setPlatformForm] = useState({
    name: '',
    referral_link: '',
    reward_amount: 100,
    is_active: true
  });

  // Add individual referral system state
  const [individualReferralConfig, setIndividualReferralConfig] = useState<IndividualReferralConfig>({
    base_url: '',
    referral_reward: 2, // Updated to 2 taka as per new system
    is_active: true,
    tracking_params: '?ref={USER_ID}&source=bt_app&tracking=referral'
  });

  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalRewards: 0,
    activeReferrers: 0,
    todayReferrals: 0
  });

  // Add users list for individual referral management
  const [users, setUsers] = useState<any[]>([]);
  const [showUserReferralLinks, setShowUserReferralLinks] = useState(false);
  const [config, setConfig] = useState<ReferralConfig>({
    base_url: '',
    referral_reward: 2,
    is_active: true,
    unique_link_enabled: true,
    link_format: 'both',
    group_link: 'https://t.me/BTCommunityGroup',
    tracking_enabled: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTradingReferrals();
    loadTradingPlatforms();
    loadIndividualReferralConfig(); // Load individual referral config
    loadReferralStats(); // Load referral statistics
    loadUsers(); // Load users for individual referral management
    loadConfig(); // Load referral configuration
  }, []);

  const loadTradingReferrals = async () => {
    try {
      setLoading(true);
      
      // First, load trading referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('trading_platform_referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;

      // Then, load user data for each referral
      const referralsWithUsers = await Promise.all(
        (referralsData || []).map(async (referral) => {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('first_name, username, balance')
              .eq('telegram_id', referral.user_id)
              .single();

            if (userError) {
              console.warn(`User not found for referral ${referral.id}:`, userError);
              return {
                ...referral,
                user: {
                  first_name: 'Unknown User',
                  username: 'unknown',
                  balance: 0
                }
              };
            }

            return {
              ...referral,
              user: userData
            };
          } catch (error) {
            console.warn(`Error loading user for referral ${referral.id}:`, error);
            return {
              ...referral,
              user: {
                first_name: 'Error Loading User',
                username: 'error',
                balance: 0
              }
            };
          }
        })
      );

      setTradingReferrals(referralsWithUsers);
      
      // Calculate stats
      const total = referralsWithUsers.length;
      const pending = referralsWithUsers.filter(r => r.status === 'pending').length;
      const verified = referralsWithUsers.filter(r => r.status === 'verified').length;
      const rejected = referralsWithUsers.filter(r => r.status === 'rejected').length;
      const totalRewards = referralsWithUsers.reduce((sum, r) => sum + (r.reward_amount || 0), 0);
      const pendingRewards = referralsWithUsers.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.reward_amount || 0), 0);
      
      setStats({ total, pending, verified, rejected, totalRewards, pendingRewards });
    } catch (error) {
      console.error('Error loading trading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTradingPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_platforms')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setTradingPlatforms(data || []);
    } catch (error) {
      console.error('Error loading trading platforms:', error);
    }
  };

  const filteredTradingReferrals = tradingReferrals.filter(referral => {
    const matchesSearch = 
      referral.user?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.platform_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.trading_uid.toLowerCase().includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || referral.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleStatusUpdate = async (referralId: string, newStatus: 'verified' | 'rejected') => {
    try {
      const referral = tradingReferrals.find(r => r.id === referralId);
      if (!referral) return;

      // For UID verification, we need to check if the UID is valid
      if (newStatus === 'verified') {
        // Here you can add additional UID validation logic
        // For example, checking against external APIs or validation rules
        const isValidUID = await validateTradingUID(referral.trading_uid, referral.platform_name);
        if (!isValidUID) {
          alert('Invalid UID. Please verify the trading platform UID before approving.');
          return;
        }
      }

      const { error } = await supabase
        .from('trading_platform_referrals')
        .update({ 
          status: newStatus, 
          verification_date: new Date().toISOString() 
        })
        .eq('id', referralId);

      if (error) throw error;

      // If verified, add reward to user balance
      if (newStatus === 'verified') {
        const { error: balanceError } = await supabase
          .from('users')
          .update({ 
            balance: (referral.user?.balance || 0) + referral.reward_amount 
          })
          .eq('id', referral.user_id);

        if (balanceError) throw balanceError;

        // Log the successful verification
        await logUserActivity(referral.user_id, 'trading_referral_verified', {
          platform: referral.platform_name,
          uid: referral.trading_uid,
          reward: referral.reward_amount
        });
      }
      
      // Reload referrals
      loadTradingReferrals();
    } catch (error) {
      console.error('Error updating referral status:', error);
    }
  };

  // UID Validation Function
  const validateTradingUID = async (uid: string, platform: string): Promise<boolean> => {
    // This is a placeholder for actual UID validation
    // In production, you would integrate with trading platform APIs
    // For now, we'll do basic validation
    
    if (!uid || uid.length < 3) return false;
    
    // Add platform-specific validation rules
    switch (platform.toLowerCase()) {
      case 'binance':
        return uid.length >= 6 && /^[0-9]+$/.test(uid);
      case 'okx':
        return uid.length >= 4 && /^[0-9]+$/.test(uid);
      case 'bybit':
        return uid.length >= 5 && /^[0-9]+$/.test(uid);
      default:
        return uid.length >= 3; // Basic validation for unknown platforms
    }
  };

  // User Activity Logging
  const logUserActivity = async (userId: number, activityType: string, details: any) => {
    try {
      await supabase
        .from('user_activities')
        .insert([{
          user_id: userId,
          activity_type: activityType,
          details: details,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  };

  // Enhanced Platform Management
  const handlePlatformRewardUpdate = async (platformId: string, newReward: number) => {
    try {
      const { error } = await supabase
        .from('trading_platforms')
        .update({ reward_amount: newReward })
        .eq('id', platformId);

      if (error) throw error;

      // Update local state
      setTradingPlatforms(tradingPlatforms.map(p => 
        p.id === platformId ? { ...p, reward_amount: newReward } : p
      ));

      // Reload referrals to update reward amounts
      loadTradingReferrals();
    } catch (error) {
      console.error('Error updating platform reward:', error);
    }
  };

  const handleAddPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('trading_platforms')
        .insert([platformForm])
        .select()
        .single();

      if (error) throw error;

      setTradingPlatforms([data, ...tradingPlatforms]);
      setShowAddPlatform(false);
      resetPlatformForm();
    } catch (error) {
      console.error('Error adding platform:', error);
    }
  };

  const handleEditPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlatform) return;

    try {
      const { data, error } = await supabase
        .from('trading_platforms')
        .update(platformForm)
        .eq('id', editingPlatform.id)
        .select()
        .single();

      if (error) throw error;

      setTradingPlatforms(tradingPlatforms.map(p => p.id === editingPlatform.id ? data : p));
      setEditingPlatform(null);
      resetPlatformForm();
    } catch (error) {
      console.error('Error updating platform:', error);
    }
  };

  const handleDeletePlatform = async (platformId: string) => {
    if (!confirm('Are you sure you want to delete this trading platform?')) return;

    try {
      const { error } = await supabase
        .from('trading_platforms')
        .delete()
        .eq('id', platformId);

      if (error) throw error;

      setTradingPlatforms(tradingPlatforms.filter(p => p.id !== platformId));
    } catch (error) {
      console.error('Error deleting platform:', error);
    }
  };

  const resetPlatformForm = () => {
    setPlatformForm({
      name: '',
      referral_link: '',
      reward_amount: 100,
      is_active: true
    });
  };

  const startEditing = (platform: TradingPlatform) => {
    setEditingPlatform(platform);
    setPlatformForm({
      name: platform.name,
      referral_link: platform.referral_link,
      reward_amount: platform.reward_amount,
      is_active: platform.is_active
    });
  };

  const cancelEditing = () => {
    setEditingPlatform(null);
    resetPlatformForm();
  };

  const formatCurrency = (amount: number | undefined | null) => {
    // Handle undefined, null, or NaN values
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '৳0';
    }
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
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Load referral statistics
  const loadReferralStats = async () => {
    try {
      // Get total referrals
      const { data: totalReferrals, error: totalError } = await supabase
        .from('referrals')
        .select('*');

      if (!totalError && totalReferrals) {
        const total = totalReferrals.length;
        const totalRewards = totalReferrals.reduce((sum, ref) => sum + (ref.reward_amount || 0), 0);
        
        // Get unique referrers
        const uniqueReferrers = new Set(totalReferrals.map(ref => ref.referrer_id));
        
        // Get today's referrals
        const today = new Date().toDateString();
        const todayRefs = totalReferrals.filter(ref => 
          new Date(ref.created_at).toDateString() === today
        );

        setReferralStats({
          totalReferrals: total,
          totalRewards: totalRewards,
          activeReferrers: uniqueReferrers.size,
          todayReferrals: todayRefs.length
        });
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  };

  // Load individual referral configuration
  const loadIndividualReferralConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('global_config')
        .select('*')
        .eq('config_key', 'individual_referral_system')
        .single();

      if (!error && data) {
        const config = JSON.parse(data.config_value || '{}');
        setIndividualReferralConfig({
          base_url: config.base_url || '',
          referral_reward: config.referral_reward || 2, // Updated to 2 taka as per new system
          is_active: config.is_active !== false,
          tracking_params: config.tracking_params || '?ref={USER_ID}&source=bt_app&tracking=referral'
        });
      }
    } catch (error) {
      console.error('Error loading individual referral config:', error);
    }
  };

  // Load users for individual referral management
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('telegram_id, first_name, username, balance, created_at')
        .order('created_at', { ascending: false });

      if (!error) {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Save individual referral configuration
  const saveIndividualReferralConfig = async () => {
    try {
      const configData = {
        base_url: individualReferralConfig.base_url,
        referral_reward: individualReferralConfig.referral_reward,
        is_active: individualReferralConfig.is_active,
        tracking_params: individualReferralConfig.tracking_params
      };

      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from('global_config')
        .upsert({
          config_key: 'individual_referral_system',
          config_value: JSON.stringify(configData),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'config_key'
        });

      if (error) throw error;

      // Reload config to update state
      await loadIndividualReferralConfig();

      // Reload referral stats to update statistics
      await loadReferralStats();

      console.log('Individual Referral Config Saved Successfully!');

    } catch (error) {
      console.error('Error saving individual referral config:', error);
      console.error('Failed to save individual referral configuration');
    }
  };

  // Generate individual referral link for a user
  const generateIndividualReferralLink = (telegramId: string) => {
    if (!individualReferralConfig.base_url) return '';
    
    // Replace {USER_ID} placeholder with actual telegram ID
    const trackingParams = individualReferralConfig.tracking_params.replace('{USER_ID}', telegramId);
    
    // Create individual referral link
    const individualLink = `${individualReferralConfig.base_url}${trackingParams}`;
    return individualLink;
  };

  // Copy individual referral link to clipboard
  const copyIndividualReferralLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      // Simple notification for copy success
      console.log('Individual referral link copied to clipboard:', link);
      // You can add a toast notification here if you have a notification system
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  // Simple notification function


  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_config')
        .select('*')
        .eq('config_key', 'individual_referral_system')
        .single();

      if (!error && data) {
        const savedConfig = JSON.parse(data.config_value || '{}');
        setConfig({
          base_url: savedConfig.base_url || '',
          referral_reward: savedConfig.referral_reward || 2,
          is_active: savedConfig.is_active !== false,
          unique_link_enabled: savedConfig.unique_link_enabled !== false,
          link_format: savedConfig.link_format || 'both',
          group_link: savedConfig.group_link || 'https://t.me/BTCommunityGroup',
          tracking_enabled: savedConfig.tracking_enabled !== false
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load referral configuration'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('global_config')
        .upsert({
          config_key: 'individual_referral_system',
          config_value: JSON.stringify(config),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Referral configuration saved successfully!'
      });
    } catch (error) {
      console.error('Error saving config:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save referral configuration'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof ReferralConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const generateSampleLink = () => {
    if (!config.base_url) return 'No base URL configured';
    
    const sampleUserId = '123456789';
    const sampleReferralCode = 'ABC123';
    
    switch (config.link_format) {
      case 'telegram_id':
        return `${config.base_url}?ref=${sampleUserId}&user=${sampleUserId}&source=bt_app&tracking=referral`;
      case 'referral_code':
        return `${config.base_url}?ref=${sampleReferralCode}&user=${sampleUserId}&source=bt_app&tracking=referral`;
      case 'both':
        return `${config.base_url}?ref=${sampleReferralCode}&user=${sampleUserId}&source=bt_app&tracking=referral&unique=${Date.now()}`;
      default:
        return config.base_url;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800/90 backdrop-blur-sm border-r border-white/10 p-4">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
            <TrendingUp className="w-6 h-6 text-navy" />
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
            Referral System Management
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Manage global referral system and trading platform referrals
          </motion.p>
        </div>

        {/* Global Referral System Section */}
        <div className="glass p-6 border border-white/10 rounded-xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Global Referral System</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${individualReferralConfig.is_active ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`text-sm ${individualReferralConfig.is_active ? 'text-green-400' : 'text-red-400'}`}>
                {individualReferralConfig.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base URL Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Base Referral URL
                <span className="text-xs text-gray-500 ml-2">(Global for all users)</span>
              </label>
              <input
                type="url"
                value={individualReferralConfig.base_url}
                onChange={(e) => setIndividualReferralConfig({ ...individualReferralConfig, base_url: e.target.value })}
                placeholder="https://t.me/bt_community"
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
              />
              <div className="text-xs text-gray-500 mt-1">
                This is the main URL that all users will share
              </div>
            </div>

            {/* Referral Reward Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Referral Reward (BDT)
                <span className="text-xs text-gray-500 ml-2">(Per successful referral)</span>
              </label>
              <input
                type="number"
                value={individualReferralConfig.referral_reward}
                onChange={(e) => setIndividualReferralConfig({ ...individualReferralConfig, referral_reward: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                min="0"
              />
              <div className="text-xs text-gray-500 mt-1">
                Amount users earn for each successful referral
              </div>
            </div>
          </div>

          {/* Individual Link Preview */}
          {individualReferralConfig.base_url && (
            <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h4 className="text-sm font-medium text-blue-400 mb-3">Individual Referral Link Preview</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Base URL:</span>
                  <span className="text-xs text-blue-400">{individualReferralConfig.base_url}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Sample Individual Link:</span>
                  <span className="text-xs text-green-400">{generateIndividualReferralLink('123456789')}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  💡 Individual links automatically add user's telegram ID and tracking parameters
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6">
            <button
              onClick={saveIndividualReferralConfig}
              className="px-6 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              Save Referral Configuration
            </button>
          </div>
        </div>

        {/* Individual Referral System Section */}
        <div className="glass p-6 border border-white/10 rounded-xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Individual Referral System</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${individualReferralConfig.is_active ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`text-sm ${individualReferralConfig.is_active ? 'text-green-400' : 'text-red-400'}`}>
                {individualReferralConfig.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base URL Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Base Referral URL
                <span className="text-xs text-gray-500 ml-2">(For individual users)</span>
              </label>
              <input
                type="url"
                value={individualReferralConfig.base_url}
                onChange={(e) => setIndividualReferralConfig({ ...individualReferralConfig, base_url: e.target.value })}
                placeholder="https://t.me/bt_community?ref={USER_ID}&source=bt_app&tracking=referral"
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
              />
              <div className="text-xs text-gray-500 mt-1">
                This is the URL that users will share to invite others.
              </div>
            </div>

            {/* Referral Reward Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Referral Reward (BDT)
                <span className="text-xs text-gray-500 ml-2">(Per successful referral)</span>
              </label>
              <input
                type="number"
                value={individualReferralConfig.referral_reward}
                onChange={(e) => setIndividualReferralConfig({ ...individualReferralConfig, referral_reward: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                min="0"
              />
              <div className="text-xs text-gray-500 mt-1">
                Amount users earn for each successful referral
              </div>
            </div>
          </div>

          {/* Individual Link Preview */}
          {individualReferralConfig.base_url && (
            <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h4 className="text-sm font-medium text-blue-400 mb-3">Individual Referral Link Preview</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Base URL:</span>
                  <span className="text-xs text-blue-400">{individualReferralConfig.base_url}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Sample Individual Link:</span>
                  <span className="text-xs text-green-400">{generateIndividualReferralLink('123456789')}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  💡 Individual links automatically add user's telegram ID and tracking parameters
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6">
            <button
              onClick={saveIndividualReferralConfig}
              className="px-6 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              Save Individual Referral Configuration
            </button>
          </div>
        </div>

        {/* Referral Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-3xl font-bold text-white">{referralStats.totalReferrals}</div>
            <div className="text-gray-400">Total Referrals</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="text-3xl font-bold text-green-400">{referralStats.activeReferrers}</div>
            <div className="text-gray-400">Active Referrers</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="text-3xl font-bold text-yellow-400">{referralStats.todayReferrals}</div>
            <div className="text-gray-400">Today's Referrals</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="text-3xl font-bold text-gold">{formatCurrency(referralStats.totalRewards)}</div>
            <div className="text-gray-400">Total Rewards</div>
          </motion.div>
        </div>

        {/* User Referral Links Management */}
        <div className="glass p-6 border border-white/10 rounded-xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">User Referral Links Management</h2>
            <button
              onClick={() => setShowUserReferralLinks(!showUserReferralLinks)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              {showUserReferralLinks ? 'Hide User Links' : 'Show User Links'}
            </button>
          </div>

          {showUserReferralLinks && (
          <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-400 mb-2">Individual Referral System Info</h4>
                <div className="text-xs text-blue-300 space-y-1">
                  <div>• Each user gets a unique referral link with their telegram ID</div>
                  <div>• Admin sets the base URL and reward amount globally</div>
                  <div>• System automatically generates individual links for each user</div>
                  <div>• Users can copy and share their personal referral links</div>
                </div>
              </div>

              {/* Users Table with Individual Referral Links */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Telegram ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Individual Referral Link</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reward</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {users.map((user, index) => {
                      const individualLink = generateIndividualReferralLink(user.telegram_id);
                      return (
                        <motion.tr
                          key={user.telegram_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="hover:bg-gray-800/30 transition-colors duration-200"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
                                <span className="text-navy font-semibold text-sm">
                                  {user.first_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">{user.first_name || 'Unknown'}</div>
                                <div className="text-sm text-gray-400">@{user.username || 'No username'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-white">{user.telegram_id}</div>
                            <div className="text-xs text-gray-400">ID</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="max-w-xs">
                              {individualLink ? (
                                <div className="text-sm text-blue-400 break-all">{individualLink}</div>
                              ) : (
                                <div className="text-sm text-red-400">Base URL not set</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-white">{formatCurrency(individualReferralConfig.referral_reward)}</div>
                            <div className="text-xs text-gray-400">per referral</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              {individualLink && (
                                <button
                                  onClick={() => copyIndividualReferralLink(individualLink)}
                                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                                  title="Copy Referral Link"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => window.open(individualLink, '_blank')}
                                disabled={!individualLink}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                  individualLink 
                                    ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' 
                                    : 'text-gray-500 cursor-not-allowed'
                                }`}
                                title="Open Referral Link"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const allLinks = users.map(user => {
                      const link = generateIndividualReferralLink(user.telegram_id);
                      return `${user.first_name || 'Unknown'} (@${user.username || 'No username'}): ${link}`;
                    }).join('\n\n');
                    navigator.clipboard.writeText(allLinks);
                    console.log('All referral links copied to clipboard');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                >
                  Copy All Links
                </button>
                <button
                  onClick={() => {
                    const csvData = users.map(user => {
                      const link = generateIndividualReferralLink(user.telegram_id);
                      return `${user.first_name},${user.username},${user.telegram_id},${link}`;
                    }).join('\n');
                    const csvContent = `Name,Username,Telegram ID,Referral Link\n${csvData}`;
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'user_referral_links.csv';
                    a.click();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                >
                  Export CSV
                </button>
              </div>
          </motion.div>
          )}
        </div>

        {/* Trading Platforms Section */}
        <div className="glass p-6 border border-white/10 rounded-xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Trading Platforms</h2>
            <button
              onClick={() => setShowAddPlatform(true)}
              className="px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Platform
            </button>
          </div>

          {/* Trading Platforms Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Referral Link</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {tradingPlatforms.map((platform, index) => (
                  <motion.tr
                    key={platform.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="hover:bg-gray-800/30 transition-colors duration-200"
                  >
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-white">{platform.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-blue-400 max-w-xs truncate">{platform.referral_link}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-white">{formatCurrency(platform.reward_amount)}</div>
                      <button
                        onClick={() => {
                          const newReward = prompt(`Enter new reward amount for ${platform.name}:`, platform.reward_amount.toString());
                          if (newReward && !isNaN(Number(newReward))) {
                            handlePlatformRewardUpdate(platform.id, Number(newReward));
                          }
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
                        title="Click to edit reward"
                      >
                        Edit Reward
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        platform.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {platform.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditing(platform)}
                          className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                          title="Edit Platform"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlatform(platform.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                          title="Delete Platform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Platform Modal */}
        <AnimatePresence>
          {(showAddPlatform || editingPlatform) && (
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
                    {editingPlatform ? 'Edit Platform' : 'Add Trading Platform'}
                  </h3>
                  <button
                    onClick={editingPlatform ? cancelEditing : () => setShowAddPlatform(false)}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={editingPlatform ? handleEditPlatform : handleAddPlatform} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Platform Name</label>
                    <input
                      type="text"
                      value={platformForm.name}
                      onChange={(e) => setPlatformForm({ ...platformForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Referral Link</label>
                    <input
                      type="url"
                      value={platformForm.referral_link}
                      onChange={(e) => setPlatformForm({ ...platformForm, referral_link: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Reward Amount (BDT)</label>
                    <input
                      type="number"
                      value={platformForm.reward_amount}
                      onChange={(e) => setPlatformForm({ ...platformForm, reward_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      min="0"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={platformForm.is_active}
                      onChange={(e) => setPlatformForm({ ...platformForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-gold bg-gray-800 border-gray-600 rounded focus:ring-gold focus:ring-2"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-300">
                      Platform is active
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                    >
                      <Save className="w-4 h-4 inline mr-2" />
                      {editingPlatform ? 'Update Platform' : 'Create Platform'}
                    </button>
                    <button
                      type="button"
                      onClick={editingPlatform ? cancelEditing : () => setShowAddPlatform(false)}
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
                  placeholder="Search referrals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                />
              </div>

              {/* Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trading Referrals Table */}
        <div className="glass border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Trading Referrals</h2>
            <p className="text-gray-400 text-sm">Monitor and verify trading platform referrals</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Trading UID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      Loading referrals...
                    </td>
                  </tr>
                ) : filteredTradingReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      No referrals found
                    </td>
                  </tr>
                ) : (
                  filteredTradingReferrals.map((referral, index) => (
                    <motion.tr
                      key={referral.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-gray-800/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
                            <span className="text-navy font-semibold text-sm">
                              {referral.user?.first_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{referral.user?.first_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-400">@{referral.user?.username || 'No username'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{referral.platform_name}</div>
                        <div className="text-xs text-blue-400 max-w-xs truncate">{referral.referral_link}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{referral.trading_uid}</div>
                        <div className="text-xs text-gray-400">UID</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{formatCurrency(referral.reward_amount)}</div>
                        <div className="text-xs text-gray-400">BDT Reward</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                          {getStatusIcon(referral.status)}
                          <span className="ml-1 capitalize">{referral.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{formatDate(referral.created_at)}</div>
                        {referral.verification_date && (
                          <div className="text-xs text-gray-400">
                            Verified: {formatDate(referral.verification_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {referral.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(referral.id, 'verified')}
                                className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                                title="Verify Referral"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(referral.id, 'rejected')}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                title="Reject Referral"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referral System Configuration Section */}
        <motion.div 
          className="glass p-6 border border-white/10 rounded-xl mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Referral System Configuration</h2>
            <button
              onClick={saveConfig}
              disabled={isSaving}
              className="px-4 py-2 bg-gold hover:bg-yellow-500 disabled:bg-gray-600 text-navy rounded-lg transition-all duration-300 flex items-center gap-2 font-semibold"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base URL Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Link className="w-4 h-4 text-blue-400" />
                Base URL Configuration
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Base URL for Referral Links
                </label>
                <input
                  type="url"
                  value={config.base_url}
                  onChange={(e) => handleInputChange('base_url', e.target.value)}
                  placeholder="https://your-domain.com/join"
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-gold focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This will be the base URL for all referral links
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Group Link (Fallback)
                </label>
                <input
                  type="url"
                  value={config.group_link}
                  onChange={(e) => handleInputChange('group_link', e.target.value)}
                  placeholder="https://t.me/YourGroup"
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-gold focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used when individual referral system is disabled
                </p>
              </div>
            </div>

            {/* Link Format Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-green-400" />
                Link Format Settings
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enable Unique Links
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleInputChange('unique_link_enabled', true)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      config.unique_link_enabled 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    Enabled
                  </button>
                  <button
                    onClick={() => handleInputChange('unique_link_enabled', false)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      !config.unique_link_enabled 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Link Format Type
                </label>
                <select
                  value={config.link_format}
                  onChange={(e) => handleInputChange('link_format', e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-gold focus:outline-none"
                >
                  <option value="telegram_id">Telegram ID Only</option>
                  <option value="referral_code">Referral Code Only</option>
                  <option value="both">Both (Telegram ID + Referral Code)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  How to format the unique identifier in referral links
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enable Tracking
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleInputChange('tracking_enabled', true)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      config.tracking_enabled 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    Enabled
                  </button>
                  <button
                    onClick={() => handleInputChange('tracking_enabled', false)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      !config.tracking_enabled 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    Disabled
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reward Configuration */}
          <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gold" />
              Reward Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Referral Reward (Taka)
                </label>
                <input
                  type="number"
                  value={config.referral_reward}
                  onChange={(e) => handleInputChange('referral_reward', parseInt(e.target.value))}
                  min="0"
                  step="1"
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-gold focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Amount awarded to referrer for each successful referral
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  System Status
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleInputChange('is_active', true)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      config.is_active 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => handleInputChange('is_active', false)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      !config.is_active 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Link Preview */}
          <div className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <h3 className="text-lg font-medium text-blue-400 mb-4 flex items-center gap-2">
              <Link className="w-4 h-4" />
              Sample Link Preview
            </h3>
            
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
              <code className="text-sm text-blue-300 break-all">
                {generateSampleLink()}
              </code>
            </div>
            
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">ref: Unique identifier</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">user: Telegram ID</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">tracking: Analytics data</span>
              </div>
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-gold mb-1">৳{config.referral_reward}</div>
              <div className="text-xs text-gray-400">Referral Reward</div>
            </div>
            
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {config.unique_link_enabled ? '✓' : '✗'}
              </div>
              <div className="text-xs text-gray-400">Unique Links</div>
            </div>
            
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {config.tracking_enabled ? '✓' : '✗'}
              </div>
              <div className="text-xs text-gray-400">Tracking</div>
            </div>
            
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {config.is_active ? '✓' : '✗'}
              </div>
              <div className="text-xs text-gray-400">System Active</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 