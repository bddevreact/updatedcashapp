import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Medal, Award, TrendingUp, Users, DollarSign, Calendar, Target, Star, Zap, Flame, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { useFirebaseUserStore } from '../store/firebaseUserStore';

interface LeaderboardUser {
  id: string;
  name: string;
  username: string;
  photoUrl: string;
  rank: number;
  referrals: number;
  earnings: number;
  level: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  topReferrers: LeaderboardUser[];
  topEarners: LeaderboardUser[];
  todayTop: LeaderboardUser[];
  thisWeekTop: LeaderboardUser[];
  thisMonthTop: LeaderboardUser[];
  allTimeTop: LeaderboardUser[];
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'referrers' | 'earners' | 'rankings'>('referrers');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'allTime'>('today');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const navigate = useNavigate();
  const leaderboardContentRef = useRef<HTMLDivElement>(null);
  const { telegramId } = useFirebaseUserStore();

  // Scroll to top of leaderboard content when page changes
  useEffect(() => {
    if (leaderboardContentRef.current) {
      leaderboardContentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [currentPage, activeTab, timeFilter]);

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    if (leaderboardContentRef.current) {
      leaderboardContentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Reset to first page when changing tabs or filters
  const handleTabChange = (tab: 'referrers' | 'earners' | 'rankings') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleTimeFilterChange = (filter: 'today' | 'week' | 'month' | 'allTime') => {
    setTimeFilter(filter);
    setCurrentPage(1);
  };

  // Load real leaderboard data from database
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    topReferrers: [],
    topEarners: [],
    todayTop: [],
    thisWeekTop: [],
    thisMonthTop: [],
    allTimeTop: []
  });

  useEffect(() => {
    loadLeaderboardData();
  }, [timeFilter]);

  const loadLeaderboardData = async () => {
    try {
      // Load top referrers
      const referrersQuery = query(
        collection(db, 'referrals'),
        where('status', '==', 'verified'),
        orderBy('created_at', 'desc')
      );
      const referrersSnapshot = await getDocs(referrersQuery);
      const referrers = referrersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Load user data for each referrer
      const referrersWithUsers = await Promise.all(
        referrers.map(async (ref: any) => {
          if (ref.referrer_id) {
            const userQuery = query(
              collection(db, 'users'),
              where('telegram_id', '==', ref.referrer_id)
            );
            const userSnapshot = await getDocs(userQuery);
            const userData = userSnapshot.docs[0]?.data();
            
            return {
              ...ref,
              users: userData
            };
          }
          return ref;
        })
      );

      // Group and count referrals by referrer
      const referralCounts = referrersWithUsers?.reduce((acc: any, ref: any) => {
        const referrerId = ref.referrer_id;
        const userData = ref.users;
        
        if (!acc[referrerId]) {
          acc[referrerId] = {
            id: referrerId,
            name: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim(),
            username: userData?.username || '',
            photoUrl: userData?.photo_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
            rank: 0,
            referrals: 0,
            earnings: 0,
        level: 1,
        isCurrentUser: false
          };
        }
        acc[referrerId].referrals++;
        acc[referrerId].earnings += 50; // 50 BDT per referral
        // New level calculation based on referral system
        const getLevel = (referrals: number) => {
          if (referrals >= 50000) return 4;
          if (referrals >= 10000) return 3;
          if (referrals >= 2000) return 2;
          if (referrals >= 500) return 1;
          return 1;
        };
        acc[referrerId].level = getLevel(acc[referrerId].referrals);
        return acc;
      }, {});

      // Convert to array and sort by referrals
      const topReferrers = Object.values(referralCounts || {})
        .sort((a: any, b: any) => b.referrals - a.referrals)
        .slice(0, 20)
        .map((user: any, index) => ({
          ...user,
          rank: index + 1,
          isCurrentUser: user.id === telegramId
        }));

      setLeaderboardData(prev => ({
        ...prev,
        topReferrers
      }));

    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-300" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <Star className="w-4 h-4 text-blue-400" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-navy';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-navy';
      case 3: return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white';
      default: return 'bg-gray-700 text-white';
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  // Pagination functions
  const getCurrentData = () => {
    let data: LeaderboardUser[] = [];
    
    switch (activeTab) {
      case 'referrers':
        data = leaderboardData.topReferrers;
        break;
      case 'earners':
        data = leaderboardData.topEarners;
        break;
      case 'rankings':
        switch (timeFilter) {
          case 'today':
            data = leaderboardData.todayTop;
            break;
          case 'week':
            data = leaderboardData.thisWeekTop;
            break;
          case 'month':
            data = leaderboardData.thisMonthTop;
            break;
          case 'allTime':
            data = leaderboardData.allTimeTop;
            break;
        }
        break;
    }
    
    return data;
  };

  const getPaginatedData = () => {
    const data = getCurrentData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getCurrentData().length / itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Pagination Controls Component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition-all duration-300 ${
            currentPage === 1
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && goToPage(page)}
            disabled={page === '...'}
            className={`px-3 py-2 rounded-lg transition-all duration-300 ${
              page === currentPage
                ? 'bg-gold text-navy font-semibold'
                : page === '...'
                ? 'text-gray-500 cursor-default'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all duration-300 ${
            currentPage === totalPages
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  // Page Info Component
  const PageInfo = () => {
    const data = getCurrentData();
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, data.length);
    
    return (
      <div className="text-center text-sm text-gray-400 mb-4">
        Showing {startIndex}-{endIndex} of {data.length} users
        {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
      </div>
    );
  };

  const renderUserCard = (user: LeaderboardUser, index: number) => (
    <div key={user.id} className={`glass p-4 border rounded-lg transition-all duration-300 hover:scale-105 ${
      user.isCurrentUser ? 'border-gold bg-gold/10' : 'border-white/10'
    }`}>
      <div className="flex items-center gap-4">
        {/* Rank Badge */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRankColor(user.rank)}`}>
          {getRankIcon(user.rank)}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <img 
              src={user.photoUrl} 
              alt={user.name}
              className="w-10 h-10 rounded-full border-2 border-white/20"
            />
            <div>
              <h4 className={`font-semibold ${user.isCurrentUser ? 'text-gold' : 'text-white'}`}>
                {user.name} {user.isCurrentUser && '(You)'}
              </h4>
              <p className="text-xs text-gray-400">@{user.username}</p>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-400" />
              <span className="text-gray-300">{user.referrals} referrals</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-green-400" />
              <span className="text-gray-300">{formatCurrency(user.earnings)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-purple-400" />
              <span className="text-gray-300">Level {user.level}</span>
            </div>
          </div>
        </div>

        {/* Current User Badge */}
        {user.isCurrentUser && (
          <div className="bg-gold/20 border border-gold/30 rounded-full px-3 py-1">
            <span className="text-gold text-xs font-semibold">YOU</span>
          </div>
        )}
      </div>
    </div>
  );

  // State for live updates
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [totalUsers, setTotalUsers] = useState(1000);
  const [activeUsers, setActiveUsers] = useState(800);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleLive = () => {
    setIsLive(!isLive);
    setLastUpdate(new Date());
    if (!isLive) {
      loadLeaderboardStats();
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLeaderboardStats();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const loadLeaderboardStats = async () => {
    try {
      // Load total users count
      const totalUsersQuery = query(collection(db, 'users'));
      const totalUsersSnapshot = await getDocs(totalUsersQuery);
      const totalUsersCount = totalUsersSnapshot.size;

      // Load active users (users active in last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsersQuery = query(
        collection(db, 'users'),
        where('last_active', '>=', yesterday.toISOString())
      );
      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      const activeUsersCount = activeUsersSnapshot.size;

      setTotalUsers(totalUsersCount || 0);
      setActiveUsers(activeUsersCount || 0);
      setLastUpdate(new Date());

    } catch (error) {
      console.error('Error loading leaderboard stats:', error);
    }
  };

  // Load additional leaderboard data based on time filter
  const loadTimeFilteredData = async () => {
    try {
      let startDate: Date;
      
      switch (timeFilter) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'allTime':
          startDate = new Date(0);
          break;
        default:
          startDate = new Date();
      }

      // Load referrals within time period
      const referralsQuery = query(
        collection(db, 'referrals'),
        where('status', '==', 'verified'),
        where('created_at', '>=', startDate.toISOString()),
        orderBy('created_at', 'desc')
      );
      const referralsSnapshot = await getDocs(referralsQuery);
      const referrals = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Load user data for each referrer
      const referralsWithUsers = await Promise.all(
        referrals.map(async (ref: any) => {
          if (ref.referrer_id) {
            const userQuery = query(
              collection(db, 'users'),
              where('telegram_id', '==', ref.referrer_id)
            );
            const userSnapshot = await getDocs(userQuery);
            const userData = userSnapshot.docs[0]?.data();
            
            return {
              ...ref,
              users: userData
            };
          }
          return ref;
        })
      );

      // Group and count referrals by referrer for the time period
      const referralCounts = referralsWithUsers?.reduce((acc: any, ref: any) => {
        const referrerId = ref.referrer_id;
        const userData = ref.users;
        
        if (!acc[referrerId]) {
          acc[referrerId] = {
            id: referrerId,
            name: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim(),
            username: userData?.username || '',
            photoUrl: userData?.photo_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
            rank: 0,
            referrals: 0,
            earnings: 0,
            level: 1,
            isCurrentUser: false
          };
        }
        acc[referrerId].referrals++;
        acc[referrerId].earnings += 50; // 50 BDT per referral
        // New level calculation based on referral system
        const getLevel = (referrals: number) => {
          if (referrals >= 50000) return 4;
          if (referrals >= 10000) return 3;
          if (referrals >= 2000) return 2;
          if (referrals >= 500) return 1;
          return 1;
        };
        acc[referrerId].level = getLevel(acc[referrerId].referrals);
        return acc;
      }, {});

      // Convert to array and sort by referrals
      const timeFilteredData = Object.values(referralCounts || {})
        .sort((a: any, b: any) => b.referrals - a.referrals)
        .slice(0, 25)
        .map((user: any, index) => ({
          ...user,
          rank: index + 1,
          isCurrentUser: user.id === telegramId
        }));

      // Update the appropriate time filter data
      setLeaderboardData(prev => ({
        ...prev,
        [timeFilter === 'today' ? 'todayTop' : 
         timeFilter === 'week' ? 'thisWeekTop' : 
         timeFilter === 'month' ? 'thisMonthTop' : 'allTimeTop']: timeFilteredData
      }));

    } catch (error) {
      console.error('Error loading time filtered data:', error);
    }
  };

  // Load top earners data
  const loadTopEarners = async () => {
    try {
      // Load users ordered by balance
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('balance', 'desc'),
        limit(25)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Transform to leaderboard format
      const topEarners = users?.map((user, index) => ({
        id: user.telegram_id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
        username: user.username || '',
        photoUrl: user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.telegram_id}`,
        rank: index + 1,
        referrals: 0, // Would be calculated from referrals table
        earnings: user.balance || 0,
        level: user.level || 1,
        isCurrentUser: user.telegram_id === telegramId
      })) || [];

      setLeaderboardData(prev => ({
        ...prev,
        topEarners
      }));

    } catch (error) {
      console.error('Error loading top earners:', error);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'earners') {
      loadTopEarners();
    } else if (activeTab === 'rankings') {
      loadTimeFilteredData();
    }
  }, [activeTab, timeFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white p-4 pb-20">
      {/* Animated Header */}
      <div className="mb-6">
        {/* Header with Live Status */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.h1 
              className="text-3xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Cash Points Leaderboard
            </motion.h1>
            <div className="flex items-center gap-4">
              <motion.p 
                className="text-gray-400 text-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Last updated: {lastUpdate.toLocaleTimeString()}
              </motion.p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={`text-xs ${isLive ? 'text-green-400' : 'text-red-400'}`}>
                  {isLive ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
              <motion.p 
                className="text-gray-300 text-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {totalUsers} total users • {activeUsers} active today
              </motion.p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              onClick={toggleLive}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isLive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {isLive ? 'Stop Live' : 'Start Live'}
            </motion.button>
            
            <motion.button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isRefreshing 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-gold/20 text-gold hover:bg-gold/30 hover:scale-105'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Earn Real Money Banner */}
        <motion.div 
          className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-4 backdrop-blur-sm border border-green-500/30 mb-6"
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
              Compete & Earn Real Money
            </motion.h3>
            <motion.p 
              className="text-sm text-gray-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              Climb the leaderboard by referring more members and earn real BDT rewards!
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="glass p-1 mb-6 border border-white/10">
        <div className="flex bg-gray-800 rounded-lg p-1">
          {[
            { id: 'referrers', label: 'Top Referrers', icon: Users },
            { id: 'earners', label: 'Top Earners', icon: DollarSign },
            { id: 'rankings', label: 'Rankings', icon: Trophy }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex-1 py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-gold to-yellow-500 text-navy font-semibold shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Referrers Tab */}
      {activeTab === 'referrers' && (
        <div className="space-y-4" ref={leaderboardContentRef}>
          <h2 className="text-xl font-semibold text-center text-gold mb-4">🏆 Top Referrers</h2>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-700/30">
            <div className="space-y-4 p-2">
              {getPaginatedData().map((user, index) => renderUserCard(user, index))}
            </div>
          </div>
          <PaginationControls />
          <PageInfo />
        </div>
      )}

      {/* Top Earners Tab */}
      {activeTab === 'earners' && (
        <div className="space-y-4" ref={leaderboardContentRef}>
          <h2 className="text-xl font-semibold text-center text-gold mb-4">💰 Top Earners</h2>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-700/30">
            <div className="space-y-4 p-2">
              {getPaginatedData().map((user, index) => renderUserCard(user, index))}
            </div>
          </div>
          <PaginationControls />
          <PageInfo />
        </div>
      )}

      {/* Rankings Tab */}
      {activeTab === 'rankings' && (
        <>
          {/* Time Filter Buttons */}
          <div className="glass p-1 mb-6 border border-white/10">
            <div className="flex bg-gray-800 rounded-lg p-1">
              {[
                { id: 'today', label: 'Today', icon: Calendar },
                { id: 'week', label: 'This Week', icon: TrendingUp },
                { id: 'month', label: 'This Month', icon: Target },
                { id: 'allTime', label: 'All Time', icon: Flame }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => handleTimeFilterChange(filter.id as any)}
                  className={`flex-1 py-2 px-2 rounded-md transition-all duration-300 flex items-center justify-center gap-1 text-xs ${
                    timeFilter === filter.id 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <filter.icon className="w-3 h-3" />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rankings Content */}
          <div className="space-y-4" ref={leaderboardContentRef}>
            <h2 className="text-xl font-semibold text-center text-gold mb-4">
              {timeFilter === 'today' && '📅 Today\'s Rankings'}
              {timeFilter === 'week' && '📊 This Week\'s Rankings'}
              {timeFilter === 'month' && '🎯 This Month\'s Rankings'}
              {timeFilter === 'allTime' && '🔥 All-Time Rankings'}
            </h2>
            
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-700/30">
              <div className="space-y-4 p-2">
                {getPaginatedData().map((user, index) => renderUserCard(user, index))}
              </div>
            </div>
            <PaginationControls />
            <PageInfo />
          </div>
        </>
      )}

      {/* Achievement Info */}
      <div className="glass p-5 mt-8 border border-white/10">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-center justify-center">
          <Zap className="w-5 h-5 text-gold" />
          How to Climb the Leaderboard
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h4 className="font-semibold text-blue-400 mb-1">Add More Members</h4>
            <p className="text-xs text-gray-400">Invite friends to your group</p>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h4 className="font-semibold text-green-400 mb-1">Earn More Money</h4>
            <p className="text-xs text-gray-400">Complete tasks and earn BDT</p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <h4 className="font-semibold text-purple-400 mb-1">Level Up Fast</h4>
            <p className="text-xs text-gray-400">Reach higher levels for bonuses</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="glass p-4 mt-6 text-center border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent">
        <h4 className="text-gold font-semibold mb-2">Ready to Dominate the Leaderboard?</h4>
        <p className="text-gray-300 text-sm mb-3">Start referring more members and climb to the top!</p>
        <button 
          onClick={() => navigate('/referrals')}
          className="bg-gradient-to-r from-gold to-yellow-500 text-navy px-6 py-2 rounded-lg font-semibold hover:from-yellow-400 hover:to-gold transition-all duration-300 transform hover:scale-105"
        >
          Start Referring Now
        </button>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 w-12 h-12 bg-gradient-to-r from-gold to-yellow-500 text-navy rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-40"
            title="Scroll to top"
          >
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
} 
