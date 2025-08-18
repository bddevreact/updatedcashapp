import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Filter, CheckCircle, XCircle, Eye, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { sendUserNotification } from '../../lib/notifications';

interface WithdrawalRequest {
  id: string;
  user_id: number;
  amount: number;
  method: string;
  account_number: string;
  account_name: string;
  bank_name?: string;
  crypto_symbol?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  processed_at: string | null;
  user: {
    first_name: string;
    username: string;
    balance: number;
  };
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isValidRejection, setIsValidRejection] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          user:users!withdrawal_requests_user_id_fkey(first_name, username, balance)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      setWithdrawals(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(w => w.status === 'pending').length || 0;
      const approved = data?.filter(w => w.status === 'approved').length || 0;
      const rejected = data?.filter(w => w.status === 'rejected').length || 0;
      const totalAmount = data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
      const pendingAmount = data?.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
      
      setStats({ total, pending, approved, rejected, totalAmount, pendingAmount });
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = 
      withdrawal.user?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.user_id.toString().includes(searchTerm) ||
      withdrawal.method.toLowerCase().includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || withdrawal.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleStatusUpdate = async (withdrawalId: string, newStatus: 'approved' | 'rejected', isValidRejection: boolean = false, rejectionReason: string = '') => {
    try {
      const withdrawal = withdrawals.find(w => w.id === withdrawalId);
      if (!withdrawal) return;

      // If rejecting, ask for confirmation and reason
      if (newStatus === 'rejected') {
        if (!rejectionReason.trim()) {
          rejectionReason = prompt('Please provide a reason for rejection (optional):') || 'No reason provided';
          if (rejectionReason === null) return; // User cancelled
        }
        
        // Confirm rejection with user
        const confirmRejection = confirm(
          `Are you sure you want to reject this withdrawal?\n\n` +
          `Amount: ${formatCurrency(withdrawal.amount)}\n` +
          `User: ${withdrawal.user?.first_name || 'Unknown'}\n` +
          `Reason: ${rejectionReason}\n` +
          `Valid Rejection: ${isValidRejection ? 'YES' : 'NO'}\n\n` +
          `${isValidRejection 
            ? 'User will NOT receive a refund (legitimate rejection)' 
            : 'User will receive automatic refund (standard rejection)'
          }`
        );
        
        if (!confirmRejection) return;
      }

      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ 
          status: newStatus, 
          processed_at: new Date().toISOString(),
          admin_notes: newStatus === 'rejected' ? rejectionReason || 'No reason provided' : null
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      if (newStatus === 'approved') {
        // If approved, deduct from user balance
        const { error: balanceError } = await supabase
          .from('users')
          .update({ 
            balance: (withdrawal.user?.balance || 0) - withdrawal.amount 
          })
          .eq('telegram_id', withdrawal.user_id);

        if (balanceError) throw balanceError;
        
        console.log(`Withdrawal approved: ${withdrawal.amount} deducted from user ${withdrawal.user_id}`);
        
        // Send notification to user
        await sendUserNotification(
          withdrawal.user_id.toString(),
          'success',
          'Withdrawal Approved! 💰',
          `Your withdrawal of ${formatCurrency(withdrawal.amount)} has been approved and processed successfully.`
        );
        
      } else if (newStatus === 'rejected') {
        if (isValidRejection) {
          // Valid rejection - NO refund
          console.log(`Withdrawal rejected (valid): ${withdrawal.amount} NOT refunded to user ${withdrawal.user_id}`);
          
          // Send notification to user
          await sendUserNotification(
            withdrawal.user_id.toString(),
            'error',
            'Withdrawal Rejected ❌',
            `Your withdrawal of ${formatCurrency(withdrawal.amount)} was rejected: ${rejectionReason}`
          );
          
        } else {
          // Standard rejection - WITH refund
          const { error: balanceError } = await supabase
            .from('users')
            .update({ 
              balance: (withdrawal.user?.balance || 0) + withdrawal.amount 
            })
            .eq('telegram_id', withdrawal.user_id);

          if (balanceError) throw balanceError;
          
          console.log(`Withdrawal rejected (standard): ${withdrawal.amount} refunded to user ${withdrawal.user_id}`);
          
          // Send notification to user
          await sendUserNotification(
            withdrawal.user_id.toString(),
            'warning',
            'Withdrawal Rejected & Refunded ⚠️',
            `Your withdrawal of ${formatCurrency(withdrawal.amount)} was rejected but the amount has been refunded to your balance.`
          );
        }
      }
      
      // Reload withdrawals
      loadWithdrawals();
      
      // Show success notification
      const action = newStatus === 'approved' ? 'approved' : 'rejected';
      let message = '';
      
      if (newStatus === 'approved') {
        message = `Withdrawal approved. Amount deducted from user balance.`;
      } else if (newStatus === 'rejected') {
        if (isValidRejection) {
          message = `Withdrawal rejected (valid reason). No refund given.`;
        } else {
          message = `Withdrawal rejected. Amount refunded to user balance.`;
        }
      }
      
      alert(`Withdrawal ${action} successfully!\n\n${message}`);
      
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      alert('Error updating withdrawal status. Please try again.');
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'bkash': return '📱';
      case 'nagad': return '📱';
      case 'rocket': return '📱';
      case 'bank_transfer': return '🏦';
      case 'crypto': return '₿';
      default: return '💳';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800/90 backdrop-blur-sm border-r border-white/10 p-4">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
            <DollarSign className="w-6 h-6 text-navy" />
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
            Withdrawals Management
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Manage and process withdrawal requests in BT Community
          </motion.p>
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
            <div className="text-gray-400">Total Requests</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-gray-400">Pending</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="text-3xl font-bold text-green-400">{stats.approved}</div>
            <div className="text-gray-400">Approved</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="text-3xl font-bold text-red-400">{stats.rejected}</div>
            <div className="text-gray-400">Rejected</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalAmount)}</div>
            <div className="text-gray-400">Total Amount</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="text-3xl font-bold text-yellow-400">{formatCurrency(stats.pendingAmount)}</div>
            <div className="text-gray-400">Pending Amount</div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="glass p-6 border border-white/10 rounded-xl mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search withdrawals..."
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
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
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

        {/* Withdrawals Table */}
        <div className="glass border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Account Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      Loading withdrawals...
                    </td>
                  </tr>
                ) : filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      No withdrawals found
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map((withdrawal, index) => (
                    <motion.tr
                      key={withdrawal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-gray-800/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
                            <span className="text-navy font-semibold text-sm">
                              {withdrawal.user?.first_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{withdrawal.user?.first_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-400">@{withdrawal.user?.username || 'No username'}</div>
                            <div className="text-xs text-gray-500">Balance: {formatCurrency(withdrawal.user?.balance || 0)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-bold text-white">{formatCurrency(withdrawal.amount)}</div>
                        <div className="text-xs text-gray-400">BDT</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{getMethodIcon(withdrawal.method)}</span>
                          <span className="text-sm font-medium text-white capitalize">
                            {withdrawal.method.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {/* Account Name */}
                          {withdrawal.account_name && (
                            <div className="text-sm text-white">
                              <span className="text-gray-400">Name:</span> {withdrawal.account_name}
                            </div>
                          )}
                          {/* Account Number */}
                          {withdrawal.account_number && (
                            <div className="text-sm text-blue-400">
                              <span className="text-gray-400">Number:</span> {withdrawal.account_number}
                            </div>
                          )}
                          {/* Bank Name */}
                          {withdrawal.bank_name && (
                            <div className="text-sm text-green-400">
                              <span className="text-gray-400">Bank:</span> {withdrawal.bank_name}
                            </div>
                          )}
                          {/* Crypto Symbol */}
                          {withdrawal.crypto_symbol && (
                            <div className="text-sm text-yellow-400">
                              <span className="text-gray-400">Crypto:</span> {withdrawal.crypto_symbol}
                            </div>
                          )}
                          {/* Fallback if no specific details */}
                          {!withdrawal.account_name && !withdrawal.account_number && !withdrawal.bank_name && !withdrawal.crypto_symbol && (
                            <div className="text-sm text-gray-400">No account details</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                          {getStatusIcon(withdrawal.status)}
                          <span className="ml-1 capitalize">{withdrawal.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{formatDate(withdrawal.created_at)}</div>
                        {withdrawal.processed_at && (
                          <div className="text-xs text-gray-400">
                            Processed: {formatDate(withdrawal.processed_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(withdrawal.id, 'approved')}
                                className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                                title="Approve Withdrawal"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(withdrawal.id, 'rejected')}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                title="Reject Withdrawal"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setShowDetailsModal(true);
                            }}
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
      </div>

      {/* Withdrawal Details Modal */}
      {showDetailsModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass p-8 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Withdrawal Details</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedWithdrawal(null);
                }}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* User Information */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  👤 User Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm">Name:</span>
                    <div className="text-white font-medium">{selectedWithdrawal.user?.first_name || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Username:</span>
                    <div className="text-white font-medium">@{selectedWithdrawal.user?.username || 'No username'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">User ID:</span>
                    <div className="text-white font-medium">{selectedWithdrawal.user_id}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Current Balance:</span>
                    <div className="text-white font-medium">{formatCurrency(selectedWithdrawal.user?.balance || 0)}</div>
                  </div>
                </div>
              </div>

              {/* Withdrawal Information */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  💰 Withdrawal Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm">Amount:</span>
                    <div className="text-2xl font-bold text-gold">{formatCurrency(selectedWithdrawal.amount)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Method:</span>
                    <div className="text-white font-medium capitalize">{selectedWithdrawal.method.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedWithdrawal.status)}`}>
                      {getStatusIcon(selectedWithdrawal.status)}
                      <span className="ml-1 capitalize">{selectedWithdrawal.status}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Request Date:</span>
                    <div className="text-white font-medium">{formatDate(selectedWithdrawal.created_at)}</div>
                  </div>
                </div>
                
                {/* Important Note */}
                {selectedWithdrawal.status === 'pending' && (
                  <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Rejection Options:</span>
                    </div>
                    <div className="text-blue-300 text-xs mt-2 space-y-1">
                      <p>• <strong>Standard Rejection:</strong> User gets automatic refund (for admin mistakes)</p>
                      <p>• <strong>Valid Rejection:</strong> No refund given (for fraud, invalid details, etc.)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Details */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  🏦 Account Details
                </h4>
                <div className="space-y-3">
                  {selectedWithdrawal.account_name && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Account Name:</span>
                      <span className="text-white font-medium">{selectedWithdrawal.account_name}</span>
                    </div>
                  )}
                  {selectedWithdrawal.account_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Account Number:</span>
                      <span className="text-blue-400 font-medium">{selectedWithdrawal.account_number}</span>
                    </div>
                  )}
                  {selectedWithdrawal.bank_name && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Bank Name:</span>
                      <span className="text-green-400 font-medium">{selectedWithdrawal.bank_name}</span>
                    </div>
                  )}
                  {selectedWithdrawal.crypto_symbol && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cryptocurrency:</span>
                      <span className="text-yellow-400 font-medium">{selectedWithdrawal.crypto_symbol}</span>
                    </div>
                  )}
                  {!selectedWithdrawal.account_name && !selectedWithdrawal.account_number && !selectedWithdrawal.bank_name && !selectedWithdrawal.crypto_symbol && (
                    <div className="text-gray-400 text-center py-4">No account details available</div>
                  )}
                </div>
              </div>

              {/* Processing Information */}
              {selectedWithdrawal.processed_at && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    ⏰ Processing Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400 text-sm">Processed Date:</span>
                      <div className="text-white font-medium">{formatDate(selectedWithdrawal.processed_at)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Processing Time:</span>
                      <div className="text-white font-medium">
                        {Math.round((new Date(selectedWithdrawal.processed_at).getTime() - new Date(selectedWithdrawal.created_at).getTime()) / (1000 * 60 * 60))} hours
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedWithdrawal.admin_notes && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    📝 Admin Notes
                  </h4>
                  <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                    <p className="text-white text-sm">{selectedWithdrawal.admin_notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-4 pt-4">
                {selectedWithdrawal.status === 'pending' && (
                  <>
                    {/* Rejection Reason Input */}
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Rejection Details</h4>
                      
                      <div className="space-y-3">
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Enter reason for rejection..."
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none resize-none"
                          rows={3}
                        />
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="validRejection"
                            checked={isValidRejection}
                            onChange={(e) => setIsValidRejection(e.target.checked)}
                            className="w-4 h-4 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                          />
                          <label htmlFor="validRejection" className="text-sm text-gray-300">
                            This is a valid rejection (user will NOT receive refund)
                          </label>
                        </div>
                        
                        {isValidRejection && (
                          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2 text-red-400 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium">Valid Rejection:</span>
                            </div>
                            <p className="text-red-300 text-xs mt-1">
                              User will NOT receive a refund. This should only be used for legitimate rejections (fraud, invalid details, etc.).
                            </p>
                          </div>
                        )}
                        
                        {!isValidRejection && (
                          <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium">Standard Rejection:</span>
                            </div>
                            <p className="text-yellow-300 text-xs mt-1">
                              User will receive automatic refund. Use this for admin mistakes or invalid rejections.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleStatusUpdate(selectedWithdrawal.id, 'approved');
                          setShowDetailsModal(false);
                          setSelectedWithdrawal(null);
                          setRejectionReason('');
                        }}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                      >
                        <CheckCircle className="w-4 h-4 inline mr-2" />
                        Approve Withdrawal
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(
                            `Are you sure you want to reject this withdrawal?\n\n` +
                            `Amount: ${formatCurrency(selectedWithdrawal.amount)}\n` +
                            `User: ${selectedWithdrawal.user?.first_name || 'Unknown'}\n` +
                            `Reason: ${rejectionReason || 'No reason provided'}\n` +
                            `Valid Rejection: ${isValidRejection ? 'YES' : 'NO'}\n\n` +
                            `${isValidRejection 
                              ? 'User will NOT receive a refund (legitimate rejection)' 
                              : 'User will receive automatic refund (standard rejection)'
                            }`
                          )) {
                            handleStatusUpdate(selectedWithdrawal.id, 'rejected', isValidRejection, rejectionReason);
                            setShowDetailsModal(false);
                            setSelectedWithdrawal(null);
                            setRejectionReason('');
                            setIsValidRejection(false);
                          }
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold hover:scale-105 transition-all duration-300 ${
                          isValidRejection 
                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
                            : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        }`}
                      >
                        <XCircle className="w-4 h-4 inline mr-2" />
                        {isValidRejection ? 'Reject (No Refund)' : 'Reject & Refund'}
                      </button>
                    </div>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedWithdrawal(null);
                    setRejectionReason('');
                    setIsValidRejection(false);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 