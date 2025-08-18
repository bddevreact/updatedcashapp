import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, Gift, Target, Save, Plus, Edit, Trash2, X, Users, Activity, TrendingUp, Bot } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import BotConfiguration from '../../components/BotConfiguration';
import useSystemSettings from '../../hooks/useSystemSettings';

interface PaymentConfig {
  id: string;
  task_type: string;
  reward_amount: number;
  xp_earned: number;
  is_active: boolean;
}

interface ReferralConfig {
  id: string;
  level: number;
  referrals_required: number;
  bonus_amount: number;
  xp_bonus: number;
  is_active: boolean;
}

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export default function AdminSettings() {
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);
  const [referralConfigs, setReferralConfigs] = useState<ReferralConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payment');
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [showAddSystemSetting, setShowAddSystemSetting] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentConfig | null>(null);
  const [editingReferral, setEditingReferral] = useState<ReferralConfig | null>(null);
  const [editingSystemSetting, setEditingSystemSetting] = useState<SystemSetting | null>(null);

  // Use system settings hook
  const { 
    settings: systemSettings, 
    loading: settingsLoading, 
    refreshSettings: refreshSystemSettings 
  } = useSystemSettings();

  const [paymentForm, setPaymentForm] = useState({
    task_type: 'daily_checkin',
    reward_amount: 50,
    xp_earned: 10,
    is_active: true
  });

  const [referralForm, setReferralForm] = useState({
    level: 1,
    referrals_required: 50,
    bonus_amount: 100,
    xp_bonus: 20,
    is_active: true
  });

  const [systemSettingForm, setSystemSettingForm] = useState({
    setting_key: '',
    setting_value: '',
    description: ''
  });

  useEffect(() => {
    loadAllConfigs();
  }, []);

  const loadAllConfigs = async () => {
    try {
      setLoading(true);
      
      // Load payment configurations
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!paymentsError) setPaymentConfigs(payments || []);

      // Load referral configurations
      const { data: referrals, error: referralsError } = await supabase
        .from('referral_configs')
        .select('*')
        .order('level', { ascending: true });

      if (!referralsError) setReferralConfigs(referrals || []);

    } catch (error) {
      console.error('Error loading configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Payment Configuration Handlers
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('payment_configs')
        .insert([paymentForm])
        .select()
        .single();

      if (error) throw error;

      setPaymentConfigs([data, ...paymentConfigs]);
      setShowAddPayment(false);
      resetPaymentForm();
    } catch (error) {
      console.error('Error adding payment config:', error);
    }
  };

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    try {
      const { data, error } = await supabase
        .from('payment_configs')
        .update(paymentForm)
        .eq('id', editingPayment.id)
        .select()
        .single();

      if (error) throw error;

      setPaymentConfigs(paymentConfigs.map(p => p.id === editingPayment.id ? data : p));
      setEditingPayment(null);
      resetPaymentForm();
    } catch (error) {
      console.error('Error updating payment config:', error);
    }
  };

  const handleDeletePayment = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this payment configuration?')) return;

    try {
      const { error } = await supabase
        .from('payment_configs')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      setPaymentConfigs(paymentConfigs.filter(p => p.id !== configId));
    } catch (error) {
      console.error('Error deleting payment config:', error);
    }
  };

  // Referral Configuration Handlers
  const handleAddReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('referral_configs')
        .insert([referralForm])
        .select()
        .single();

      if (error) throw error;

      setReferralConfigs([data, ...referralConfigs]);
      setShowAddReferral(false);
      resetReferralForm();
    } catch (error) {
      console.error('Error adding referral config:', error);
    }
  };

  const handleEditReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReferral) return;

    try {
      const { data, error } = await supabase
        .from('referral_configs')
        .update(referralForm)
        .eq('id', editingReferral.id)
        .select()
        .single();

      if (error) throw error;

      setReferralConfigs(referralConfigs.map(r => r.id === editingReferral.id ? data : r));
      setEditingReferral(null);
      resetReferralForm();
    } catch (error) {
      console.error('Error updating referral config:', error);
    }
  };

  const handleDeleteReferral = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this referral configuration?')) return;

    try {
      const { error } = await supabase
        .from('referral_configs')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      setReferralConfigs(referralConfigs.filter(r => r.id !== configId));
    } catch (error) {
      console.error('Error deleting referral config:', error);
    }
  };

  // System Settings Handlers
  const handleAddSystemSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .insert([{
          ...systemSettingForm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      refreshSystemSettings(); // Refresh settings after adding
      setShowAddSystemSetting(false);
      resetSystemSettingForm();
    } catch (error) {
      console.error('Error adding system setting:', error);
    }
  };

  const handleEditSystemSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSystemSetting) return;

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          ...systemSettingForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSystemSetting.id)
        .select()
        .single();

      if (error) throw error;

      refreshSystemSettings(); // Refresh settings after updating
      setEditingSystemSetting(null);
      resetSystemSettingForm();
    } catch (error) {
      console.error('Error updating system setting:', error);
    }
  };

  const handleDeleteSystemSetting = async (settingId: string) => {
    if (!confirm('Are you sure you want to delete this system setting?')) return;

    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', settingId);

      if (error) throw error;

      refreshSystemSettings(); // Refresh settings after deleting
    } catch (error) {
      console.error('Error deleting system setting:', error);
    }
  };

  // Create sample system settings
  const createSampleSettings = async () => {
    try {
      const sampleSettings = [
        {
          setting_key: 'app_name',
          setting_value: 'BT Community',
          description: 'Application name displayed throughout the app'
        },
        {
          setting_key: 'app_version',
          setting_value: '1.0.0',
          description: 'Current application version'
        },
        {
          setting_key: 'maintenance_mode',
          setting_value: 'false',
          description: 'Enable/disable maintenance mode for the app'
        },
        {
          setting_key: 'max_referrals_per_user',
          setting_value: '100',
          description: 'Maximum number of referrals a user can have'
        },
        {
          setting_key: 'min_withdrawal_amount',
          setting_value: '100',
          description: 'Minimum withdrawal amount in BDT'
        },
        {
          setting_key: 'referral_reward_amount',
          setting_value: '50',
          description: 'Default reward amount for each referral in BDT'
        },
        {
          setting_key: 'daily_task_limit',
          setting_value: '10',
          description: 'Maximum number of daily tasks a user can complete'
        },
        {
          setting_key: 'auto_approval_enabled',
          setting_value: 'false',
          description: 'Enable automatic approval for certain tasks'
        }
      ];

      const { error } = await supabase
        .from('system_settings')
        .insert(sampleSettings.map(setting => ({
          ...setting,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })));

      if (error) throw error;

      refreshSystemSettings();
      alert('Sample system settings created successfully!');
    } catch (error) {
      console.error('Error creating sample settings:', error);
      alert('Failed to create sample settings');
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      task_type: 'daily_checkin',
      reward_amount: 50,
      xp_earned: 10,
      is_active: true
    });
  };

  const resetReferralForm = () => {
    setReferralForm({
      level: 1,
      referrals_required: 50,
      bonus_amount: 100,
      xp_bonus: 20,
      is_active: true
    });
  };

  const resetSystemSettingForm = () => {
    setSystemSettingForm({
      setting_key: '',
      setting_value: '',
      description: ''
    });
  };

  const startEditingPayment = (config: PaymentConfig) => {
    setEditingPayment(config);
    setPaymentForm({
      task_type: config.task_type,
      reward_amount: config.reward_amount,
      xp_earned: config.xp_earned,
      is_active: config.is_active
    });
  };

  const startEditingReferral = (config: ReferralConfig) => {
    setEditingReferral(config);
    setReferralForm({
      level: config.level,
      referrals_required: config.referrals_required,
      bonus_amount: config.bonus_amount,
      xp_bonus: config.xp_bonus,
      is_active: config.is_active
    });
  };

  const startEditingSystemSetting = (setting: SystemSetting) => {
    setEditingSystemSetting(setting);
    setSystemSettingForm({
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      description: setting.description
    });
  };

  const cancelEditing = () => {
    setEditingPayment(null);
    setEditingReferral(null);
    setEditingSystemSetting(null);
    resetPaymentForm();
    resetReferralForm();
    resetSystemSettingForm();
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800/90 backdrop-blur-sm border-r border-white/10 p-4">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
            <Settings className="w-6 h-6 text-navy" />
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
            Admin Settings
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Configure payment settings, referral bonuses, and system parameters
          </motion.p>
        </div>

        {/* Settings Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">Payment Configs</span>
            </div>
            <div className="text-3xl font-bold text-white">{paymentConfigs.length}</div>
            <div className="mt-2 text-sm text-gray-400">Active configurations</div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">Referral Levels</span>
            </div>
            <div className="text-3xl font-bold text-white">{referralConfigs.length}</div>
            <div className="mt-2 text-sm text-gray-400">Level configurations</div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">System Settings</span>
            </div>
            <div className="text-3xl font-bold text-white">{systemSettings.length}</div>
            <div className="mt-2 text-sm text-gray-400">Active settings</div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-navy" />
              </div>
              <span className="text-xs text-gray-400">Total Rewards</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(paymentConfigs.reduce((sum, p) => sum + (p.reward_amount || 0), 0))}
            </div>
            <div className="mt-2 text-sm text-gray-400">Configured rewards</div>
          </motion.div>
        </div>

        {/* Settings Tabs */}
        <div className="glass border border-white/10 rounded-xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'payment'
                  ? 'text-gold border-b-2 border-gold bg-gold/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Gift className="w-4 h-4 inline mr-2" />
              Payment Configuration
            </button>
            <button
              onClick={() => setActiveTab('referral')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'referral'
                  ? 'text-gold border-b-2 border-gold bg-gold/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Referral Bonuses
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'system'
                  ? 'text-gold border-b-2 border-gold bg-gold/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              System Settings
            </button>
            <button
              onClick={() => setActiveTab('bot')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'bot'
                  ? 'text-gold border-b-2 border-gold bg-gold/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Bot className="w-4 h-4 inline mr-2" />
              Bot Configuration
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Payment Configuration Tab */}
            {activeTab === 'payment' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Payment Configuration</h2>
                  <button
                    onClick={() => setShowAddPayment(true)}
                    className="px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Payment Config
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Task Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reward</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">XP</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {paymentConfigs.map((config, index) => (
                        <motion.tr
                          key={config.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="hover:bg-gray-800/30 transition-colors duration-200"
                        >
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-white capitalize">
                              {config.task_type.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-white">{formatCurrency(config.reward_amount)}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gold">{config.xp_earned}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              config.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {config.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => startEditingPayment(config)}
                                className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                                title="Edit Config"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePayment(config.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                title="Delete Config"
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
              </motion.div>
            )}

            {/* Referral Bonuses Tab */}
            {activeTab === 'referral' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Referral Bonus Configuration</h2>
                  <button
                    onClick={() => setShowAddReferral(true)}
                    className="px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Referral Level
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Level</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Referrals Required</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bonus Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">XP Bonus</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {referralConfigs.map((config, index) => (
                        <motion.tr
                          key={config.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="hover:bg-gray-800/30 transition-colors duration-200"
                        >
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-white">Level {config.level}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-white">{config.referrals_required}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-white">{formatCurrency(config.bonus_amount)}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gold">{config.xp_bonus}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              config.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {config.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => startEditingReferral(config)}
                                className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                                title="Edit Config"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReferral(config.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                title="Delete Config"
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
              </motion.div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'system' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">System Settings</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={createSampleSettings}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Create Sample Settings
                    </button>
                    <button
                      onClick={() => setShowAddSystemSetting(true)}
                      className="px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Add System Setting
                    </button>
                  </div>
                </div>

                {settingsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading system settings...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {systemSettings.map((setting, index) => (
                        <motion.div
                          key={setting.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="glass p-6 border border-white/10 rounded-xl"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">{setting.setting_key}</h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditingSystemSetting(setting)}
                                className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                                title="Edit Setting"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSystemSetting(setting.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                title="Delete Setting"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-300 mb-3">{setting.description}</p>
                          <div className="text-sm font-medium text-gold break-all">{setting.setting_value}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            Last updated: {new Date(setting.updated_at).toLocaleDateString()}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {systemSettings.length === 0 && (
                      <div className="text-center py-12">
                        <Settings className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-400 mb-2">No System Settings</h3>
                        <p className="text-gray-500 mb-4">Add your first system setting to get started.</p>
                        <button
                          onClick={createSampleSettings}
                          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                        >
                          <Plus className="w-4 h-4 inline mr-2" />
                          Create Sample Settings
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Bot Configuration Tab */}
            {activeTab === 'bot' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BotConfiguration />
              </motion.div>
            )}
          </div>
        </div>

        {/* Add/Edit Payment Config Modal */}
        {(showAddPayment || editingPayment) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass p-8 border border-white/10 rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingPayment ? 'Edit Payment Config' : 'Add Payment Configuration'}
                </h3>
                <button
                  onClick={editingPayment ? cancelEditing : () => setShowAddPayment(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={editingPayment ? handleEditPayment : handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Task Type</label>
                  <select
                    value={paymentForm.task_type}
                    onChange={(e) => setPaymentForm({ ...paymentForm, task_type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                    required
                  >
                    <option value="daily_checkin">Daily Check-in</option>
                    <option value="referral_bonus">Referral Bonus</option>
                    <option value="trading_platform">Trading Platform</option>
                    <option value="level_up">Level Up</option>
                    <option value="special_task">Special Task</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Reward (BDT)</label>
                    <input
                      type="number"
                      value={paymentForm.reward_amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reward_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">XP Earned</label>
                    <input
                      type="number"
                      value={paymentForm.xp_earned}
                      onChange={(e) => setPaymentForm({ ...paymentForm, xp_earned: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="payment_is_active"
                    checked={paymentForm.is_active}
                    onChange={(e) => setPaymentForm({ ...paymentForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-gold bg-gray-800 border-gray-600 rounded focus:ring-gold focus:ring-2"
                  />
                  <label htmlFor="payment_is_active" className="ml-2 text-sm text-gray-300">
                    Configuration is active
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    {editingPayment ? 'Update Config' : 'Create Config'}
                  </button>
                  <button
                    type="button"
                    onClick={editingPayment ? cancelEditing : () => setShowAddPayment(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add/Edit Referral Config Modal */}
        {(showAddReferral || editingReferral) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass p-8 border border-white/10 rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingReferral ? 'Edit Referral Level' : 'Add Referral Level'}
                </h3>
                <button
                  onClick={editingReferral ? cancelEditing : () => setShowAddReferral(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={editingReferral ? handleEditReferral : handleAddReferral} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Level</label>
                    <input
                      type="number"
                      value={referralForm.level}
                      onChange={(e) => setReferralForm({ ...referralForm, level: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Referrals Required</label>
                    <input
                      type="number"
                      value={referralForm.referrals_required}
                      onChange={(e) => setReferralForm({ ...referralForm, referrals_required: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bonus Amount (BDT)</label>
                    <input
                      type="number"
                      value={referralForm.bonus_amount}
                      onChange={(e) => setReferralForm({ ...referralForm, bonus_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">XP Bonus</label>
                    <input
                      type="number"
                      value={referralForm.xp_bonus}
                      onChange={(e) => setReferralForm({ ...referralForm, xp_bonus: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="referral_is_active"
                    checked={referralForm.is_active}
                    onChange={(e) => setReferralForm({ ...referralForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-gold bg-gray-800 border-gray-600 rounded focus:ring-gold focus:ring-2"
                  />
                  <label htmlFor="referral_is_active" className="ml-2 text-sm text-gray-300">
                    Level is active
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    {editingReferral ? 'Update Level' : 'Create Level'}
                  </button>
                  <button
                    type="button"
                    onClick={editingReferral ? cancelEditing : () => setShowAddReferral(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add/Edit System Setting Modal */}
        {(showAddSystemSetting || editingSystemSetting) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass p-8 border border-white/10 rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingSystemSetting ? 'Edit System Setting' : 'Add System Setting'}
                </h3>
                <button
                  onClick={editingSystemSetting ? cancelEditing : () => setShowAddSystemSetting(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={editingSystemSetting ? handleEditSystemSetting : handleAddSystemSetting} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Setting Key</label>
                  <input
                    type="text"
                    value={systemSettingForm.setting_key}
                    onChange={(e) => setSystemSettingForm({ ...systemSettingForm, setting_key: e.target.value })}
                    placeholder="e.g., app_name, max_referrals, maintenance_mode"
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier for the setting (use underscores for spaces)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Setting Value</label>
                  <textarea
                    value={systemSettingForm.setting_value}
                    onChange={(e) => setSystemSettingForm({ ...systemSettingForm, setting_value: e.target.value })}
                    placeholder="Enter the value for this setting"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Can be text, number, JSON, or any configuration value
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={systemSettingForm.description}
                    onChange={(e) => setSystemSettingForm({ ...systemSettingForm, description: e.target.value })}
                    placeholder="Explain what this setting controls"
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Help other admins understand what this setting does
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    {editingSystemSetting ? 'Update Setting' : 'Create Setting'}
                  </button>
                  <button
                    type="button"
                    onClick={editingSystemSetting ? cancelEditing : () => setShowAddSystemSetting(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 