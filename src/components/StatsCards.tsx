
import React from 'react';
import { TrendingUp, Star, Target, Users, Gift, Zap } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color = "text-white" }) => (
  <div className="bg-gray-700/30 rounded-xl p-3 flex-1 mx-1 border border-gray-600/30 hover:border-gold/50 transition-all duration-300">
    <div className="flex items-center justify-center mb-2">
      {icon && <span className="mr-1">{icon}</span>}
    <p className="text-gray-400 text-xs">{title}</p>
    </div>
    <p className={`font-bold mt-1 text-center ${color}`}>{value}</p>
  </div>
);

interface StatsCardsRowProps {
  currentLevel: number;
  totalReferrals: number;
  nextLevelReferrals: number;
}

const StatsCardsRow: React.FC<StatsCardsRowProps> = ({ currentLevel, totalReferrals, nextLevelReferrals }) => {
  // Referral-based leveling system
  const getLevelInfo = (level: number) => {
    switch (level) {
      case 1:
        return {
          referralsNeeded: 50,
          bonus: '৳100',
          opportunities: 'Basic Referral Bonus',
          color: 'text-green-400'
        };
      case 2:
        return {
          referralsNeeded: 100,
          bonus: '৳250',
          opportunities: 'Enhanced Rewards + VIP Access',
          color: 'text-blue-400'
        };
      case 3:
        return {
          referralsNeeded: 200,
          bonus: '৳500',
          opportunities: 'Premium Features + Priority Support',
          color: 'text-purple-400'
        };
      case 4:
        return {
          referralsNeeded: 500,
          bonus: '৳1,000',
          opportunities: 'Elite Status + Exclusive Bonuses',
          color: 'text-gold'
        };
      case 5:
        return {
          referralsNeeded: 1000,
          bonus: '৳2,500',
          opportunities: 'Legendary Status + Maximum Benefits',
          color: 'text-red-400'
        };
      default:
        return {
          referralsNeeded: 50,
          bonus: '৳100',
          opportunities: 'Basic Referral Bonus',
          color: 'text-green-400'
        };
    }
  };

  const currentLevelInfo = getLevelInfo(currentLevel);
  const nextLevelInfo = getLevelInfo(currentLevel + 1);
  const progressToNext = Math.min((totalReferrals / nextLevelInfo.referralsNeeded) * 100, 100);
  
  return (
    <div className="mx-4 mb-4">
      {/* Level System Cards */}
      <div className="flex justify-between mb-3">
        <StatsCard 
          title="Current Level" 
          value={`Level ${currentLevel}`}
          icon={<Star className="w-3 h-3 text-gold" />}
          color="text-gold"
        />
        <StatsCard 
          title="Total Referrals" 
          value={`${totalReferrals}`}
          icon={<Users className="w-3 h-3 text-blue-400" />}
          color="text-blue-400"
        />
        <StatsCard 
          title="Next Level" 
          value={`${nextLevelInfo.referralsNeeded}`}
          icon={<Target className="w-3 h-3 text-green-400" />}
          color="text-green-400"
        />
      </div>
      
      {/* Level Progress Bar */}
      <div className="bg-gray-700/50 rounded-full h-2 mx-1 mb-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-gold to-yellow-400 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressToNext}%` }}
        />
      </div>
      
      {/* Progress Text */}
      <div className="text-center mx-1 mb-3">
        <p className="text-xs text-gray-400">
          {totalReferrals} / {nextLevelInfo.referralsNeeded} referrals to Level {currentLevel + 1}
        </p>
        <p className="text-xs text-gold font-medium">
          {progressToNext.toFixed(1)}% Complete
        </p>
      </div>

      {/* Current Level Benefits */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-3 mx-1 mb-3 border border-gray-600/30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gift className="w-4 h-4 text-gold" />
          <h4 className="text-sm font-semibold text-gold">Level {currentLevel} Benefits</h4>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-300 mb-1">{currentLevelInfo.opportunities}</p>
          <p className="text-sm font-bold text-green-400">+{currentLevelInfo.bonus} Bonus</p>
        </div>
      </div>

      {/* Next Level Preview */}
      <div className="bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-lg p-3 mx-1 border border-gray-600/30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-semibold text-blue-400">Next Level Preview</h4>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-300 mb-1">{nextLevelInfo.opportunities}</p>
          <p className="text-sm font-bold text-blue-400">+{nextLevelInfo.bonus} Bonus</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCardsRow;
