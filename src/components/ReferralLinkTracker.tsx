import React, { useState, useEffect } from 'react';
import { Users, Link, TrendingUp, UserPlus, Activity, Share2, Copy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface ReferralLinkTrackerProps {
  telegramId: string;
  referralCode: string;
  groupUsername: string;
}

interface ReferralStats {
  totalJoins: number;
  todayJoins: number;
  thisWeekJoins: number;
  thisMonthJoins: number;
  recentJoins: ReferralJoin[];
}

interface ReferralJoin {
  id: string;
  user_id: string;
  username?: string;
  first_name?: string;
  joined_at: string;
  group_username: string;
  referral_code: string;
  status: 'active' | 'left' | 'kicked';
}

export default function ReferralLinkTracker({
  telegramId,
  referralCode,
  groupUsername
}: ReferralLinkTrackerProps) {
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const referralLink = `https://t.me/${groupUsername}?ref=${referralCode}`;

  useEffect(() => {
    if (telegramId && referralCode) {
      loadReferralStats();
    }
  }, [telegramId, referralCode, selectedPeriod]);

  const loadReferralStats = async () => {
    if (!telegramId || !referralCode) return;

    setIsLoading(true);
    try {
      // Get referral joins based on selected period
      let dateFilter = '';
      switch (selectedPeriod) {
        case 'today':
          dateFilter = 'AND joined_at >= CURRENT_DATE';
          break;
        case 'week':
          dateFilter = 'AND joined_at >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case 'month':
          dateFilter = 'AND joined_at >= CURRENT_DATE - INTERVAL \'30 days\'';
          break;
        default:
          dateFilter = '';
      }

      // Get total joins count
      const { data: totalJoins, error: totalError } = await supabase
        .rpc('get_referral_joins_count', {
          p_referral_code: referralCode,
          p_referrer_id: telegramId,
          p_group_username: groupUsername,
          p_date_filter: dateFilter
        });

      if (totalError) throw totalError;

      // Get recent joins
      const { data: recentJoins, error: recentError } = await supabase
        .from('referral_joins')
        .select(`
          id,
          user_id,
          username,
          first_name,
          joined_at,
          group_username,
          referral_code,
          status
        `)
        .eq('referral_code', referralCode)
        .eq('referrer_id', telegramId)
        .eq('group_username', groupUsername)
        .order('joined_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      // Get period-specific counts
      const { data: todayJoins, error: todayError } = await supabase
        .rpc('get_referral_joins_count', {
          p_referral_code: referralCode,
          p_referrer_id: telegramId,
          p_group_username: groupUsername,
          p_date_filter: 'AND joined_at >= CURRENT_DATE'
        });

      const { data: weekJoins, error: weekError } = await supabase
        .rpc('get_referral_joins_count', {
          p_referral_code: referralCode,
          p_referrer_id: telegramId,
          p_group_username: groupUsername,
          p_date_filter: 'AND joined_at >= CURRENT_DATE - INTERVAL \'7 days\''
        });

      const { data: monthJoins, error: monthError } = await supabase
        .rpc('get_referral_joins_count', {
          p_referral_code: referralCode,
          p_referrer_id: telegramId,
          p_group_username: groupUsername,
          p_date_filter: 'AND joined_at >= CURRENT_DATE - INTERVAL \'30 days\''
        });

      const stats: ReferralStats = {
        totalJoins: totalJoins || 0,
        todayJoins: todayJoins || 0,
        thisWeekJoins: weekJoins || 0,
        thisMonthJoins: monthJoins || 0,
        recentJoins: recentJoins || []
      };

      setReferralStats(stats);

    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const shareReferralLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join our Telegram group!',
        text: `Join ${groupUsername} using my referral link!`,
        url: referralLink
      });
    } else {
      copyReferralLink();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="glass p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4"></div>
        <p className="text-gray-400">Loading referral stats...</p>
      </div>
    );
  }

  return (
    <div className="glass p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <Link className="w-6 h-6 text-gold" />
        <h3 className="text-lg font-semibold">Referral Link Tracker</h3>
      </div>

      {/* Referral Link Display */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-400">Your Referral Link:</span>
          <div className="flex gap-2">
            <button
              onClick={copyReferralLink}
              className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
              title="Copy link"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={shareReferralLink}
              className="p-1 text-green-400 hover:text-green-300 transition-colors"
              title="Share link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600/30">
          <code className="text-sm text-blue-400 break-all">{referralLink}</code>
        </div>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-gold text-navy'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {period === 'today' ? 'Today' : 
               period === 'week' ? 'This Week' : 
               period === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      {referralStats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div 
            className="glass p-4 text-center border border-blue-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">Total Joins</p>
            <p className="text-2xl font-bold text-blue-400">{referralStats.totalJoins}</p>
          </motion.div>

          <motion.div 
            className="glass p-4 text-center border border-green-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-400">Period Joins</p>
            <p className="text-2xl font-bold text-green-400">
              {selectedPeriod === 'today' ? referralStats.todayJoins :
               selectedPeriod === 'week' ? referralStats.thisWeekJoins :
               selectedPeriod === 'month' ? referralStats.thisMonthJoins :
               referralStats.totalJoins}
            </p>
          </motion.div>
        </div>
      )}

      {/* Recent Joins */}
      {referralStats && referralStats.recentJoins.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gold" />
            Recent Joins ({selectedPeriod === 'all' ? 'All Time' : selectedPeriod})
          </h4>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {referralStats.recentJoins.map((join, index) => (
                <motion.div
                  key={join.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`p-3 rounded-lg border transition-all duration-300 ${
                    join.status === 'active' 
                      ? 'border-green-500/30 bg-green-500/10' 
                      : 'border-red-500/30 bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        join.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {join.first_name || join.username || `User ${join.user_id.slice(-4)}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(join.joined_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        join.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {join.status === 'active' ? 'Active' : 'Left'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* No Joins State */}
      {referralStats && referralStats.recentJoins.length === 0 && (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-400 mb-2">No Joins Yet</h4>
          <p className="text-sm text-gray-500 mb-4">
            Share your referral link to start tracking joins!
          </p>
          <button
            onClick={shareReferralLink}
            className="px-4 py-2 bg-gold text-navy rounded-lg font-medium hover:bg-yellow-400 transition-colors"
          >
            Share Referral Link
          </button>
        </div>
      )}

      {/* Information */}
      <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">How it works</span>
        </div>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Share your referral link with others</li>
          <li>• When someone joins using your link, it's tracked here</li>
          <li>• Only group joins count, not just link clicks</li>
          <li>• Track performance by different time periods</li>
        </ul>
      </div>
    </div>
  );
} 