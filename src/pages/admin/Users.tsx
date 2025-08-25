import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, MoreVertical, Eye, Edit, Trash2, UserPlus, Download, Plus, DollarSign, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface User {
  id: string;
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  balance: number;
  level: number;
  referrals_count: number;
  total_earnings: number;
  last_active: string;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState(0);
  const [balanceChangeReason, setBalanceChangeReason] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.telegram_id.toString().includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && user.last_active > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) ||
      (filterStatus === 'inactive' && user.last_active <= new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const matchesBalance = balanceSearch === '' || 
      (balanceFilter === 'all' && user.balance.toString().includes(balanceSearch)) ||
      (balanceFilter === 'above' && user.balance >= Number(balanceSearch)) ||
      (balanceFilter === 'below' && user.balance <= Number(balanceSearch)) ||
      (balanceFilter === 'exact' && user.balance === Number(balanceSearch));

    return matchesSearch && matchesFilter && matchesBalance;
  });

  // Balance Management Functions
  const handleBalanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const oldBalance = selectedUser.balance;
      const balanceChange = newBalance - oldBalance;

      // Update user balance
      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log the balance change
      await logBalanceChange(Number(selectedUser.id), oldBalance, newBalance, balanceChangeReason);

      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, balance: newBalance } : u
      ));

      // Close modal and reset
      setShowBalanceModal(false);
      setSelectedUser(null);
      setNewBalance(0);
      setBalanceChangeReason('');

      alert(`Balance updated successfully! New balance: ৳${newBalance.toLocaleString('en-IN')}`);
    } catch (error) {
      console.error('Error updating balance:', error);
      alert('Error updating balance. Please try again.');
    }
  };

  const logBalanceChange = async (userId: number, oldBalance: number, newBalance: number, reason: string) => {
    try {
      await supabase
        .from('user_activities')
        .insert([{
          user_id: userId,
          activity_type: 'balance_modified',
          details: {
            old_balance: oldBalance,
            new_balance: newBalance,
            change_amount: newBalance - oldBalance,
            reason: reason,
            modified_by: 'admin'
          },
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error logging balance change:', error);
    }
  };

  const openBalanceModal = (user: User) => {
    setSelectedUser(user);
    setNewBalance(user.balance);
    setShowBalanceModal(true);
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleUserAction = (action: string, user: User) => {
    setSelectedUser(user);
    // Implement user actions (view, edit, delete)
    console.log(`${action} user:`, user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800/90 backdrop-blur-sm border-r border-white/10 p-4">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
            <Users className="w-6 h-6 text-navy" />
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
            Users Management
          </motion.h1>
          <motion.p 
            className="text-gray-400 text-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Manage all Cash Points users and their activities
          </motion.p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-3xl font-bold text-white">{users.length}</div>
            <div className="text-gray-400">Total Users</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="text-3xl font-bold text-white">
              {users.filter(u => u.last_active > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).length}
            </div>
            <div className="text-gray-400">Active Today</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="text-3xl font-bold text-white">
              {formatCurrency(users.reduce((sum, user) => sum + (user.balance || 0), 0))}
            </div>
            <div className="text-gray-400">Total Balance</div>
          </motion.div>
          
          <motion.div 
            className="glass p-6 border border-white/10 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="text-3xl font-bold text-white">
              {users.reduce((sum, user) => sum + (user.referrals_count || 0), 0)}
            </div>
            <div className="text-gray-400">Total Referrals</div>
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                />
              </div>

              {/* Balance Search */}
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Balance amount..."
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                  className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                />
                <select
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                >
                  <option value="all">All</option>
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                  <option value="exact">Exact</option>
                </select>
              </div>

              {/* Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300">
                <Plus className="w-4 h-4 inline mr-2" />
                Add User
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300">
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Referrals</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-gray-800/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
                            <span className="text-navy font-semibold text-sm">
                              {user.first_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-gray-400">@{user.username || 'No username'}</div>
                            <div className="text-xs text-gray-500">ID: {user.telegram_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{formatCurrency(user.balance || 0)}</div>
                        <div className="text-xs text-gray-400">৳{user.total_earnings || 0} earned</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold/20 text-gold">
                          Level {user.level || 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{user.referrals_count || 0}</div>
                        <div className="text-xs text-gray-400">referrals</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{formatDate(user.last_active)}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(user.last_active) > new Date(Date.now() - 24 * 60 * 60 * 1000) ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleUserAction('view', user)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                            title="View User"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUserAction('edit', user)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openBalanceModal(user)}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                            title="Modify Balance"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUserAction('delete', user)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Balance Modification Modal */}
        {showBalanceModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass p-8 border border-white/10 rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Modify User Balance</h3>
                <button
                  onClick={() => setShowBalanceModal(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-300 mb-2">
                  <strong>User:</strong> {selectedUser.first_name} (@{selectedUser.username})
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>Current Balance:</strong> {formatCurrency(selectedUser.balance)}
                </p>
              </div>

              <form onSubmit={handleBalanceUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Balance (BDT)</label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Change</label>
                  <textarea
                    value={balanceChangeReason}
                    onChange={(e) => setBalanceChangeReason(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                    rows={3}
                    placeholder="Enter reason for balance modification..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-lg font-semibold hover:scale-105 transition-all duration-300"
                  >
                    Update Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBalanceModal(false)}
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