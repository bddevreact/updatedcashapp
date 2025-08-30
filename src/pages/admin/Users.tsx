import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, MoreVertical, Eye, Edit, Trash2, UserPlus, Download, Plus, DollarSign, X, UserX } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, doc, updateDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

interface User {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name: string;
  balance: number;
  level: number;
  total_referrals: number;
  total_earnings: number;
  last_active: string | { seconds: number };
  created_at: string | { seconds: number };
  referral_code?: string;
  referred_by?: string;
  is_active?: boolean;
  banned_at?: any;
  banned_reason?: string;
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
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalBalance: 0,
    totalReferrals: 0,
    totalReferralCodes: 0,
    activeReferralCodes: 0
  });

  useEffect(() => {
    loadUsers();
    loadEnhancedStats();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('created_at', 'desc')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // User Management Functions
  const handleUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleBanUser = (user: User) => {
    setSelectedUser(user);
    setShowBanConfirm(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const confirmBanUser = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        is_active: false,
        banned_at: serverTimestamp(),
        banned_reason: 'Banned by admin'
      });
      
      console.log('✅ User banned successfully:', selectedUser.first_name);
      setShowBanConfirm(false);
      setSelectedUser(null);
      loadUsers(); // Reload users
      loadEnhancedStats(); // Reload stats
    } catch (error) {
      console.error('❌ Error banning user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      await deleteDoc(doc(db, 'users', selectedUser.id));
      
      console.log('✅ User deleted successfully:', selectedUser.first_name);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      loadUsers(); // Reload users
      loadEnhancedStats(); // Reload stats
    } catch (error) {
      console.error('❌ Error deleting user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const loadEnhancedStats = async () => {
    try {
      // Load users stats
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];

      // Load referrals stats
      const referralsSnapshot = await getDocs(collection(db, 'referrals'));
      const referralsData = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Load referral codes stats
      const codesSnapshot = await getDocs(collection(db, 'referral_codes'));
      const codesData = codesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const activeUsers = usersData?.filter(u => u.is_active !== false).length || 0;
      const totalBalance = usersData?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;
      const totalReferrals = referralsData?.length || 0;
      const totalReferralCodes = codesData?.length || 0;
      const activeReferralCodes = codesData?.filter((c: any) => c.is_active).length || 0;

      setStats({
        totalUsers,
        activeUsers,
        totalBalance,
        totalReferrals,
        totalReferralCodes,
        activeReferralCodes
      });
    } catch (error) {
      console.error('Error loading enhanced stats:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.telegram_id.toString().includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && (() => {
        const lastActive = typeof user.last_active === 'string' ? new Date(user.last_active) : new Date(user.last_active.seconds * 1000);
        return lastActive > new Date(Date.now() - 24 * 60 * 60 * 1000);
      })()) ||
      (filterStatus === 'inactive' && (() => {
        const lastActive = typeof user.last_active === 'string' ? new Date(user.last_active) : new Date(user.last_active.seconds * 1000);
        return lastActive <= new Date(Date.now() - 24 * 60 * 60 * 1000);
      })());

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
      await updateDoc(doc(db, 'users', selectedUser.id), {
        balance: newBalance,
        updated_at: serverTimestamp()
      });

      // Log the balance change
      await logBalanceChange(selectedUser.telegram_id, oldBalance, newBalance, balanceChangeReason);

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

  const logBalanceChange = async (userId: string, oldBalance: number, newBalance: number, reason: string) => {
    try {
      await addDoc(collection(db, 'user_activities'), {
        user_id: userId,
        activity_type: 'balance_modified',
        details: {
          old_balance: oldBalance,
          new_balance: newBalance,
          change_amount: newBalance - oldBalance,
          reason: reason,
          modified_by: 'admin'
        },
        created_at: serverTimestamp()
      });
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

  const formatDate = (dateString: string | { seconds: number }) => {
    if (!dateString) return 'Never';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString.seconds * 1000);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
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
            Manage all Cash Points users and their activities with enhanced referral tracking
          </motion.p>
        </div>

        {/* Enhanced Stats Dashboard */}
        <motion.div 
          className="glass p-6 border border-white/10 rounded-xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" />
              Enhanced User Statistics
            </h3>
            <button
              onClick={() => { loadUsers(); loadEnhancedStats(); }}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300"
            >
              <span className="text-sm">🔄 Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{stats.totalUsers}</div>
              <div className="text-sm text-gray-400">Total Users</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{stats.activeUsers}</div>
              <div className="text-sm text-gray-400">Active Users</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-gold">{formatCurrency(stats.totalBalance)}</div>
              <div className="text-sm text-gray-400">Total Balance</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{stats.totalReferrals}</div>
              <div className="text-sm text-gray-400">Total Referrals</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">{stats.totalReferralCodes}</div>
              <div className="text-sm text-gray-400">Referral Codes</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{stats.activeReferralCodes}</div>
              <div className="text-sm text-gray-400">Active Codes</div>
            </div>
          </div>
        </motion.div>

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
              {users.filter(u => {
                const lastActive = typeof u.last_active === 'string' ? new Date(u.last_active) : new Date(u.last_active.seconds * 1000);
                return lastActive > new Date(Date.now() - 24 * 60 * 60 * 1000);
              }).length}
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
              {users.reduce((sum, user) => sum + (user.total_referrals || 0), 0)}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Referral Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
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
                          <div className="w-10 h-10 rounded-full mr-3 overflow-hidden">
                            {user.telegram_id ? (
                              <>
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.telegram_id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                                  alt={`${user.first_name}'s avatar`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center hidden">
                                  <span className="text-navy font-semibold text-sm">
                                    {user.first_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center">
                                <span className="text-navy font-semibold text-sm">
                                  {user.first_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
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
                        <div className="text-sm font-medium text-white">{user.total_referrals || 0}</div>
                        <div className="text-xs text-gray-400">referrals</div>
                        {user.referral_code && (
                          <div className="text-xs text-blue-400 font-mono">Code: {user.referral_code}</div>
                        )}
                        {user.referred_by && (
                          <div className="text-xs text-green-400">Referred by: {user.referred_by}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.referral_code ? (
                          <div className="text-sm font-medium text-blue-400 font-mono">{user.referral_code}</div>
                        ) : (
                          <div className="text-sm text-gray-500">No code</div>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active !== false 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {user.is_active !== false ? 'Active' : 'Banned'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{formatDate(user.last_active)}</div>
                        <div className="text-xs text-gray-400">
                          {(() => {
                            const lastActive = typeof user.last_active === 'string' ? new Date(user.last_active) : new Date(user.last_active.seconds * 1000);
                            return lastActive > new Date(Date.now() - 24 * 60 * 60 * 1000) ? 'Active' : 'Inactive';
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleUserDetails(user)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openBalanceModal(user)}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                            title="Modify Balance"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          {user.is_active !== false ? (
                            <button
                              onClick={() => handleBanUser(user)}
                              className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-all duration-200"
                              title="Ban User"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              className="glass border border-white/10 rounded-xl p-6 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">User Details</h3>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    {selectedUser.telegram_id ? (
                      <>
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.telegram_id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                          alt={`${selectedUser.first_name}'s avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center hidden">
                          <span className="text-navy font-semibold text-xl">
                            {selectedUser.first_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center">
                        <span className="text-navy font-semibold text-xl">
                          {selectedUser.first_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">{selectedUser.first_name} {selectedUser.last_name}</h4>
                    <p className="text-gray-400">@{selectedUser.username || 'no_username'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Balance</p>
                    <p className="text-gold font-semibold">৳{(selectedUser.balance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedUser.is_active !== false 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedUser.is_active !== false ? 'Active' : 'Banned'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Referrals</p>
                    <p className="text-white font-medium">{selectedUser.total_referrals || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Level</p>
                    <p className="text-white font-medium">{selectedUser.level || 1}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Telegram ID</p>
                  <p className="text-white font-mono">{selectedUser.telegram_id || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Joined</p>
                  <p className="text-white">
                    {selectedUser.created_at 
                      ? formatDate(selectedUser.created_at)
                      : 'Unknown'
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Last Active</p>
                  <p className="text-white">
                    {selectedUser.last_active 
                      ? formatDate(selectedUser.last_active)
                      : 'Never'
                    }
                  </p>
                </div>

                {selectedUser.referral_code && (
                  <div>
                    <p className="text-sm text-gray-400">Referral Code</p>
                    <p className="text-blue-400 font-mono">{selectedUser.referral_code}</p>
                  </div>
                )}

                {selectedUser.referred_by && (
                  <div>
                    <p className="text-sm text-gray-400">Referred By</p>
                    <p className="text-green-400">{selectedUser.referred_by}</p>
                  </div>
                )}

                {selectedUser.banned_reason && (
                  <div>
                    <p className="text-sm text-gray-400">Ban Reason</p>
                    <p className="text-red-400">{selectedUser.banned_reason}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Ban User Confirmation Modal */}
        {showBanConfirm && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              className="glass border border-orange-500/30 bg-orange-500/10 rounded-xl p-6 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-orange-400">Ban User</h3>
                <button
                  onClick={() => setShowBanConfirm(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-300 mb-2">
                  Are you sure you want to ban this user?
                </p>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {selectedUser.telegram_id ? (
                      <>
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.telegram_id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                          alt={`${selectedUser.first_name}'s avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center hidden">
                          <span className="text-navy font-semibold text-sm">
                            {selectedUser.first_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center">
                        <span className="text-navy font-semibold text-sm">
                          {selectedUser.first_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedUser.first_name || 'Unknown'}</p>
                    <p className="text-gray-400 text-sm">@{selectedUser.username || 'no_username'}</p>
                  </div>
                </div>
                <p className="text-orange-300 text-sm mt-3">
                  This will prevent the user from accessing the platform.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBanConfirm(false)}
                  className="flex-1 px-4 py-2 glass border border-white/10 text-gray-300 rounded-lg hover:text-white hover:border-white/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBanUser}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Banning...' : 'Ban User'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteConfirm && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              className="glass border border-red-500/30 bg-red-500/10 rounded-xl p-6 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-red-400">Delete User</h3>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-300 mb-2">
                  Are you sure you want to permanently delete this user?
                </p>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {selectedUser.telegram_id ? (
                      <>
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.telegram_id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                          alt={`${selectedUser.first_name}'s avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center hidden">
                          <span className="text-navy font-semibold text-sm">
                            {selectedUser.first_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center">
                        <span className="text-navy font-semibold text-sm">
                          {selectedUser.first_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedUser.first_name || 'Unknown'}</p>
                    <p className="text-gray-400 text-sm">@{selectedUser.username || 'no_username'}</p>
                  </div>
                </div>
                <p className="text-red-300 text-sm mt-3">
                  ⚠️ This action cannot be undone. All user data will be permanently deleted.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 glass border border-white/10 text-gray-300 rounded-lg hover:text-white hover:border-white/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
} 
