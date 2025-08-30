
import React from 'react';
import { TrendingUp, Star, Target, Users, Gift, Zap } from 'lucide-react';
import { useReferralLevels } from '../hooks/useReferralLevels';
import StatsCard from './common/StatsCard';
import { REFERRAL_LEVELS } from '../utils/constants';

interface StatsCardsRowProps {
  currentLevel: number;
  totalReferrals: number;
  nextLevelReferrals: number;
}

const StatsCardsRow: React.FC<StatsCardsRowProps> = ({ currentLevel, totalReferrals, nextLevelReferrals }) => {
  const { getCurrentLevelInfo, getNextLevelInfo, calculateProgress } = useReferralLevels();

  const currentLevelInfo = getCurrentLevelInfo(currentLevel);
  const nextLevelInfo = getNextLevelInfo(currentLevel);
  const progressToNext = nextLevelInfo ? calculateProgress(totalReferrals, nextLevelInfo.level) : 100;
  
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
          value={`${nextLevelInfo?.required || 0}`}
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
          {totalReferrals} / {nextLevelInfo?.required || 0} referrals to Level {currentLevel + 1}
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
          <p className="text-sm font-bold text-green-400">+৳{currentLevelInfo.bonus} Bonus</p>
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
          <p className="text-sm font-bold text-blue-400">+৳{nextLevelInfo?.bonus || 0} Bonus</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCardsRow;
