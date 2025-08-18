import React, { useState, useEffect } from 'react';
import { Users, Share2, Award, TrendingUp as Trending, Gift, Sword, Crown, Copy, QrCode, RefreshCw } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

interface Friend {
  id: string;
  name: string;
  mining: number;
  joined: string;
  active: boolean;
  level: number;
  rank: number;
  avatar: string;
  totalCoins: number;
}

export default function Friends() {
  const { telegramId, name: userName, photoUrl: userPhotoUrl, balance, level } = useUserStore();
  const [referralCode] = useState(telegramId || '');
  const [referralLink] = useState(`https://t.me/TRDNetwork_bot?start=REF_${referralCode}`);
  const [selectedTab, setSelectedTab] = useState<'friends' | 'leaderboard'>('friends');
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalEarnings: 0
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFriends, setActiveFriends] = useState(0);

  // Fetch friends and referral data
  useEffect(() => {
    if (!telegramId) return;

    const fetchFriendsAndReferrals = async () => {
      try {
        // Fetch referrals
        const { data: referralData, error: referralError } = await supabase
          .from('referrals')
          .select('referred_id')
          .eq('referrer_id', telegramId);

        if (referralError) throw referralError;

        // Fetch referred users' data
        if (referralData && referralData.length > 0) {
          const referredIds = referralData.map(r => r.referred_id);
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .in('telegram_id', referredIds)
            .order('balance', { ascending: false });

          if (userError) throw userError;

          const friendsList = userData.map((user, index) => ({
            id: user.telegram_id,
            name: `Friend ${index + 1}`, // In real app, get from Telegram
            mining: user.mining_power * 10, // Example calculation
            joined: new Date(user.created_at).toLocaleDateString(),
            active: true, // Could track last_active in users table
            level: user.level,
            rank: index + 1,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.telegram_id}`,
            totalCoins: user.balance
          }));

          setFriends(friendsList);
          setReferralStats({
            totalReferrals: referralData.length,
            totalEarnings: referralData.length * 10000 // 10,000 TRD per referral
          });
          setActiveFriends(friendsList.filter(f => new Date(f.joined).toDateString() === new Date().toDateString()).length);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error fetching friends data:', error);
      }
    };

    fetchFriendsAndReferrals();
  }, [telegramId]);

  // Fetch leaderboard data
  useEffect(() => {
    if (selectedTab !== 'leaderboard') return;

    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('balance', { ascending: false })
          .limit(10);

        if (error) throw error;

        const leaderboardData = data.map((user, index) => ({
          id: user.telegram_id,
          name: `Player ${index + 1}`, // In real app, get from Telegram
          mining: user.mining_power * 10,
          joined: new Date(user.created_at).toLocaleDateString(),
          active: true,
          level: user.level,
          rank: index + 1,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.telegram_id}`,
          totalCoins: user.balance
        }));

        setFriends(leaderboardData);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchLeaderboard();
  }, [selectedTab]);

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BT Community',
          text: 'Join me on BT Community and start earning! Use my referral code to get a bonus!',
          url: 'https://btcommunity.com'
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Share failed:', error);
          await copyReferralLink();
        }
      }
    } else {
      await copyReferralLink();
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      loadFriendsData();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadFriendsData();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing friends data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadFriendsData = async () => {
    if (!telegramId) return;

    try {
      // Load referrals
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('referred_id')
        .eq('referrer_id', telegramId);

      if (referralError) throw referralError;

      // Load referred users' data
      if (referralData && referralData.length > 0) {
        const referredIds = referralData.map(r => r.referred_id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .in('telegram_id', referredIds)
          .order('balance', { ascending: false });

        if (userError) throw userError;

        const friendsList = userData.map((user, index) => ({
          id: user.telegram_id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || `Friend ${index + 1}`,
          mining: user.mining_power * 10, // Example calculation
          joined: new Date(user.created_at).toLocaleDateString(),
          active: true, // Could track last_active in users table
          level: user.level,
          rank: index + 1,
          avatar: user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.telegram_id}`,
          totalCoins: user.balance
        }));

        setFriends(friendsList);
        setReferralStats({
          totalReferrals: referralData.length,
          totalEarnings: referralData.length * 10000 // 10,000 TRD per referral
        });
        setActiveFriends(friendsList.filter(f => new Date(f.joined).toDateString() === new Date().toDateString()).length);
        setLastUpdate(new Date());
      }

      // Load leaderboard data if needed
      if (selectedTab === 'leaderboard') {
        await loadLeaderboardData();
      }

    } catch (error) {
      console.error('Error loading friends data:', error);
    }
  };

  const loadLeaderboardData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('balance', { ascending: false })
        .limit(10);

      if (error) throw error;

      const leaderboardData = data.map((user, index) => ({
        id: user.telegram_id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || `Player ${index + 1}`,
        mining: user.mining_power * 10,
        joined: new Date(user.created_at).toLocaleDateString(),
        active: true,
        level: user.level,
        rank: index + 1,
        avatar: user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.telegram_id}`,
        totalCoins: user.balance
      }));

      setFriends(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (selectedTab === 'leaderboard') {
      loadLeaderboardData();
    } else {
      loadFriendsData();
    }
  }, [selectedTab, telegramId]);

  return (
    <div className="min-h-screen bg-gray-900 p-4 pb-20">
      {/* Copied Message Toast */}
      {showCopiedMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg flex items-center z-50">
          <Copy className="w-4 h-4 mr-2" />
          Link copied!
        </div>
      )}

      {/* Header with Live Status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <motion.h1 
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            BT Community Friends
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
              {friends.length} friends • {activeFriends} active today
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

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <img
            src={userPhotoUrl}
            alt="Profile"
            className="w-10 h-10 rounded-full border-2 border-purple-500"
          />
          <div className="ml-3">
            <h2 className="text-white font-bold">{userName}</h2>
            <div className="text-gray-400 text-sm">Level {level}</div>
          </div>
        </div>
        <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
          <Award className="w-4 h-4 text-purple-500 mr-1" />
          <span className="text-white text-sm font-medium">{formatNumber(balance)}</span>
        </div>
      </div>

      {/* Referral Section */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Share2 className="w-6 h-6 text-purple-500 mr-2" />
            <h2 className="text-lg font-semibold text-white">Your Referral Code</h2>
          </div>
          <button
            onClick={shareReferralLink}
            className="text-purple-500 text-sm font-medium hover:text-purple-400"
          >
            Share
          </button>
        </div>
        
        <div className="relative">
          <div className="bg-gray-900 rounded-lg p-4 mb-4 font-mono text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-purple-500/5 animate-pulse"></div>
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-white text-lg">{referralCode}</span>
              <div className="flex gap-2">
                <button 
                  onClick={copyReferralLink}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <Copy className="w-4 h-4 text-purple-500" />
                </button>
                <button 
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <QrCode className="w-4 h-4 text-purple-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-500">{referralStats.totalReferrals}</div>
            <div className="text-sm text-gray-400">Total Referrals</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-500">{formatNumber(referralStats.totalEarnings)} TRD</div>
            <div className="text-sm text-gray-400">Total Earnings</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedTab('friends')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            selectedTab === 'friends'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          <Users className="w-5 h-5 mx-auto mb-1" />
          Friends
        </button>
        <button
          onClick={() => setSelectedTab('leaderboard')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            selectedTab === 'leaderboard'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          <Crown className="w-5 h-5 mx-auto mb-1" />
          Leaderboard
        </button>
      </div>

      {/* Friends/Leaderboard Content */}
      <div className="space-y-4">
        {friends.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            {selectedTab === 'friends' ? (
              <>
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-lg mb-2">No friends yet</p>
                <p className="text-sm">Share your referral code to invite friends!</p>
              </>
            ) : (
              <>
                <Crown className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-lg mb-2">Loading leaderboard...</p>
              </>
            )}
          </div>
        ) : (
          friends.map((friend, index) => (
            <div 
              key={friend.id} 
              className={`bg-gray-800 rounded-lg p-4 relative overflow-hidden ${
                selectedTab === 'leaderboard' && index === 0 ? 'border border-yellow-500' : ''
              }`}
            >
              {selectedTab === 'leaderboard' && (
                <div className="absolute top-4 right-4 flex items-center">
                  <Crown className={`w-5 h-5 ${
                    index === 0 ? 'text-yellow-500' : 
                    index === 1 ? 'text-gray-400' : 
                    'text-orange-500'
                  }`} />
                  <span className="ml-2 text-lg font-bold text-white">#{friend.rank}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <div className="relative">
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className="w-16 h-16 rounded-lg"
                  />
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                    friend.active ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                </div>
                
                <div className="ml-4 flex-1">
                  <div className="flex items-center">
                    <h3 className="text-white font-medium">{friend.name}</h3>
                    <div className="ml-2 px-2 py-1 rounded-full bg-gray-700 text-xs text-purple-500">
                      Lvl {friend.level}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Earn Real Money</p>
                    <p className="text-lg font-semibold text-gold">{friend.mining} ৳/h</p>
                  </div>
                  <div className="text-green-500 text-sm">
                    {formatNumber(friend.totalCoins)} TRD earned
                  </div>
                </div>

                {selectedTab === 'friends' && (
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
                      <Gift className="w-5 h-5 text-purple-500" />
                    </button>
                    <button className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
                      <Sword className="w-5 h-5 text-purple-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Friend Button */}
      {selectedTab === 'friends' && (
        <button 
          onClick={shareReferralLink}
          className="fixed bottom-24 right-4 w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-600 transition-colors"
        >
          <Users className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
}