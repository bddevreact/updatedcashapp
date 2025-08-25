import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Gift, Settings, LogOut, DollarSign, Target, Zap, Activity, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalBalance: number;
  totalReferrals: number;
  totalPayments: number;
  pendingPayments: number;
  withdrawalRequests: number;
  pendingWithdrawals: number;
  tradingReferrals: number;
  pendingTradingReferrals: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalBalance: 0,
    totalReferrals: 0,
    totalPayments: 0,
    pendingPayments: 0,
    withdrawalRequests: 0,
    pendingWithdrawals: 0,
    tradingReferrals: 0,
    pendingTradingReferrals: 0
  });
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [recentTradingReferrals, setRecentTradingReferrals] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    loadRecentWithdrawals();
    loadRecentTradingReferrals();
  }, []);

  const loadStats = async () => {
    try {
      // Load users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Load referrals
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('*');

      if (referralsError) throw referralsError;

      // Load withdrawal requests
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*');

      if (withdrawalsError) throw withdrawalsError;

      // Load trading platform referrals
      const { data: tradingReferrals, error: tradingError } = await supabase
        .from('trading_platform_referrals')
        .select('*');

      if (tradingError) throw tradingError;

      // Load task completions for payment calculations
      const { data: taskCompletions, error: tasksError } = await supabase
        .from('task_completions')
        .select('*');

      if (tasksError) throw tasksError;

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.last_active > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).length,
        totalBalance: users.reduce((sum, user) => sum + (user.balance || 0), 0),
        totalReferrals: referrals.length,
        totalPayments: taskCompletions.reduce((sum, task) => sum + (task.reward_amount || 0), 0),
        pendingPayments: taskCompletions.filter(t => !t.verified).reduce((sum, task) => sum + (task.reward_amount || 0), 0),
        withdrawalRequests: withdrawals.length,
        pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
        tradingReferrals: tradingReferrals.length,
        pendingTradingReferrals: tradingReferrals.filter(t => t.status === 'pending').length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          user:users!withdrawal_requests_user_id_fkey(first_name, username)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error) setRecentWithdrawals(data || []);
    } catch (error) {
      console.error('Error loading recent withdrawals:', error);
    }
  };

  const loadRecentTradingReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_platform_referrals')
        .select(`
          *,
          user:users!trading_platform_referrals_user_id_fkey(first_name, username)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error) setRecentTradingReferrals(data || []);
    } catch (error) {
      console.error('Error loading recent trading referrals:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
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
            Cash Points
          </motion.h1>
        </div>

        <nav className="space-y-2">
          <button className="w-full flex items-center px-4 py-3 text-white bg-gradient-to-r from-gold to-yellow-500 rounded-lg shadow-lg">
            <TrendingUp className="w-5 h-5 mr-3" />
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/admin/users')}
            className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-300"
          >
            <Users className="w-5 h-5 mr-3" />
            Users
          </button>
          <button 
            onClick={() => navigate('/admin/referrals')}
            className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-300"
          >
            <Target className="w-5 h-5 mr-3" />
            Referrals
          </button>
          <button 
            onClick={() => navigate('/admin/tasks')}
            className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-300"
          >
            <Gift className="w-5 h-5 mr-3" />
            Tasks
          </button>
          <button 
            onClick={() => navigate('/admin/withdrawals')}
            className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-300"
          >
            <DollarSign className="w-5 h-5 mr-3" />
            Withdrawals
          </button>
          <button 
            onClick={() => navigate('/admin/trading-referrals')}
            className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-300"
          >
            <TrendingUp className="w-5 h-5 mr-3" />
            Trading Referrals
          </button>
          <button 
            onClick={() => navigate('/admin/settings')}
            className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-300"
          >
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </button>
        </nav>

        <button
          onClick={handleLogout}
          className="absolute bottom-4 left-4 right-4 flex items-center justify-center px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Animated Header */}
        <div className="mb-8">
          <motion.h1 
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Admin Dashboard
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Complete control over BT Community platform and real money earnings
          </motion.p>
        </div>

        {/* Earn Real Money Banner */}
        <motion.div 
          className="glass p-6 mb-8 border border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="text-center">
            <motion.div 
              className="text-4xl mb-3"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
            >
              💰
            </motion.div>
            <motion.h3 
              className="text-xl font-semibold text-green-400 mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              Admin Control Center
            </motion.h3>
            <motion.p 
              className="text-gray-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              Monitor and manage the BT Community platform where users earn real money in BDT
            </motion.p>
          </div>
        </motion.div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl hover:border-gold/30 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">Total Users</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatNumber(stats.totalUsers)}</div>
            <div className="mt-2 text-sm text-gray-400">
              {formatNumber(stats.activeUsers)} active today
            </div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl hover:border-gold/30 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">Total Balance</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalBalance)}</div>
            <div className="mt-2 text-sm text-gray-400">User Balances</div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl hover:border-gold/30 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-navy" />
              </div>
              <span className="text-xs text-gray-400">Total Referrals</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatNumber(stats.totalReferrals)}</div>
            <div className="mt-2 text-sm text-gray-400">Successful Referrals</div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl hover:border-gold/30 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">System Status</span>
            </div>
            <div className="text-3xl font-bold text-white">Active</div>
            <div className="mt-2 text-sm text-green-500">All systems operational</div>
          </motion.div>
        </div>

        {/* Database Test Section */}
        <motion.div 
          className="glass p-6 border border-white/10 rounded-xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h3 className="text-xl font-bold text-white mb-4">Database Connection Test</h3>
          <div className="flex gap-4">
            <button
              onClick={async () => {
                try {
                  console.log('Testing database connection...');
                  const { data, error } = await supabase
                    .from('task_templates')
                    .select('count')
                    .limit(1);
                  
                  if (error) {
                    console.error('Database test failed:', error);
                    alert('Database connection failed: ' + error.message);
                  } else {
                    console.log('Database test successful:', data);
                    alert('Database connection successful!');
                  }
                } catch (err) {
                  console.error('Database test error:', err);
                  alert('Database test error: ' + (err as Error).message);
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              Test Database Connection
            </button>
            
            <button
              onClick={async () => {
                try {
                  console.log('Testing task_templates table...');
                  const { data, error } = await supabase
                    .from('task_templates')
                    .select('*')
                    .limit(5);
                  
                  if (error) {
                    console.error('Task templates test failed:', error);
                    alert('Task templates test failed: ' + error.message);
                  } else {
                    console.log('Task templates test successful:', data);
                    alert(`Task templates test successful! Found ${data?.length || 0} templates.`);
                  }
                } catch (err) {
                  console.error('Task templates test error:', err);
                  alert('Task templates test error: ' + (err as Error).message);
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              Test Task Templates
            </button>
          </div>
        </motion.div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">Total Payments</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalPayments)}</div>
            <div className="mt-2 text-sm text-gray-400">All time rewards</div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">Pending Payments</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{formatCurrency(stats.pendingPayments)}</div>
            <div className="mt-2 text-sm text-gray-400">Awaiting verification</div>
          </motion.div>

          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-400">Pending Withdrawals</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{stats.pendingWithdrawals}</div>
            <div className="mt-2 text-sm text-gray-400">Need approval</div>
          </motion.div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Withdrawals */}
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-6 h-6 text-gold" />
              <h2 className="text-xl font-bold text-white">Recent Withdrawals</h2>
              <span className="ml-auto text-sm text-gray-400">
                {stats.pendingWithdrawals} pending
              </span>
            </div>
            <div className="space-y-4">
              {recentWithdrawals.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No withdrawal requests</p>
              ) : (
                recentWithdrawals.map((withdrawal, index) => (
                  <div key={withdrawal.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">
                          {withdrawal.user?.first_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatCurrency(withdrawal.amount)} • {withdrawal.method}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(withdrawal.status)}
                        <span className={`text-sm ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => navigate('/admin/withdrawals')}
              className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              View All Withdrawals
            </button>
          </motion.div>

          {/* Recent Trading Referrals */}
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-gold" />
              <h2 className="text-xl font-bold text-white">Trading Referrals</h2>
              <span className="ml-auto text-sm text-gray-400">
                {stats.pendingTradingReferrals} pending
              </span>
            </div>
            <div className="space-y-4">
              {recentTradingReferrals.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No trading referrals</p>
              ) : (
                recentTradingReferrals.map((referral, index) => (
                  <div key={referral.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">
                          {referral.user?.first_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-400">
                          UID: {referral.trading_uid} • {referral.platform_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(referral.status)}
                        <span className={`text-sm ${getStatusColor(referral.status)}`}>
                          {referral.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => navigate('/admin/trading-referrals')}
              className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              View All Trading Referrals
            </button>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div 
          className="glass p-6 border border-white/10 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.3 }}
        >
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/admin/settings')}
              className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold hover:scale-105 transition-all duration-300"
            >
              <Settings className="w-6 h-6 mx-auto mb-2" />
              Payment Settings
            </button>
            <button 
              onClick={() => navigate('/admin/users')}
              className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white font-semibold hover:scale-105 transition-all duration-300"
            >
              <Users className="w-6 h-6 mx-auto mb-2" />
              Manage Users
            </button>
            <button 
              onClick={() => navigate('/admin/tasks')}
              className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white font-semibold hover:scale-105 transition-all duration-300"
            >
              <Gift className="w-6 h-6 mx-auto mb-2" />
              Task Management
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}