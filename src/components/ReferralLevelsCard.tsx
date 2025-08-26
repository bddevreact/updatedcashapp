import React from 'react';
import { motion } from 'framer-motion';
import { Target, Trophy, Star, Users, Gift } from 'lucide-react';

interface ReferralLevelsCardProps {
  currentLevel: number;
  currentReferrals: number;
}

const ReferralLevelsCard: React.FC<ReferralLevelsCardProps> = ({ 
  currentLevel, 
  currentReferrals 
}) => {
  const referralLevels = [
    {
      level: 1,
      required: 100,
      bonus: 200,
      xp: 100,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20',
      bengaliRequired: '১০০',
      bengaliBonus: '২০০'
    },
    {
      level: 2,
      required: 1000,
      bonus: 500,
      xp: 200,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/20',
      bengaliRequired: '১০০০',
      bengaliBonus: '৫০০'
    },
    {
      level: 3,
      required: 5000,
      bonus: 1500,
      xp: 500,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/20',
      bengaliRequired: '৫০০০',
      bengaliBonus: '১৫০০'
    },
    {
      level: 4,
      required: 10000,
      bonus: 3000,
      xp: 1000,
      color: 'text-gold',
      bgColor: 'bg-gold/10',
      borderColor: 'border-gold/20',
      bengaliRequired: '১০০০০',
      bengaliBonus: '৩০০০'
    }
  ];

  const getCurrentLevelInfo = () => {
    return referralLevels.find(level => level.level === currentLevel) || referralLevels[0];
  };

  const getNextLevelInfo = () => {
    return referralLevels.find(level => level.level === currentLevel + 1);
  };

  const currentLevelInfo = getCurrentLevelInfo();
  const nextLevelInfo = getNextLevelInfo();

  const progressToNext = nextLevelInfo 
    ? Math.min((currentReferrals / nextLevelInfo.required) * 100, 100)
    : 100;

  return (
    <motion.div 
      className="glass p-6 rounded-xl border border-gold/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gold flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Referral Levels
        </h3>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-gold" />
          <span className="text-sm text-gold font-semibold">Level {currentLevel}</span>
        </div>
      </div>

      {/* Current Level Status */}
      <div className={`${currentLevelInfo.bgColor} ${currentLevelInfo.borderColor} border rounded-lg p-4 mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`font-semibold ${currentLevelInfo.color}`}>
            Current Level {currentLevel}
          </span>
          <span className="text-sm text-gray-400">
            {currentReferrals} / {currentLevelInfo.required} members
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-4 h-4 text-gold" />
          <span className="text-sm text-gray-300">
            Bonus: ৳{currentLevelInfo.bonus} + {currentLevelInfo.xp} XP
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`${currentLevelInfo.color.replace('text-', 'bg-')} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min((currentReferrals / currentLevelInfo.required) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Next Level Progress */}
      {nextLevelInfo && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">
              Progress to Level {nextLevelInfo.level}
            </span>
            <span className="text-sm text-gray-400">
              {currentReferrals} / {nextLevelInfo.required}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-gold to-yellow-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {nextLevelInfo.required - currentReferrals > 0 
              ? `${nextLevelInfo.required - currentReferrals} more members needed for Level ${nextLevelInfo.level}`
              : 'Level up achieved! 🎉'
            }
          </p>
        </div>
      )}

      {/* All Levels Overview */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">All Levels:</h4>
        {referralLevels.map((level) => (
          <div 
            key={level.level}
            className={`flex items-center justify-between p-2 rounded-lg ${
              level.level === currentLevel 
                ? `${level.bgColor} ${level.borderColor} border` 
                : 'bg-gray-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className={`w-3 h-3 ${level.color}`} />
              <span className={`text-sm font-medium ${level.color}`}>
                Level {level.level}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {level.required.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Gift className="w-3 h-3" />
                ৳{level.bonus}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total Potential Earnings */}
      <div className="mt-4 p-3 bg-gradient-to-r from-gold/10 to-yellow-500/10 border border-gold/20 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gold">Total Potential Earnings:</span>
          <span className="text-lg font-bold text-gold">৳5,200</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Complete all levels to earn maximum rewards!
        </p>
      </div>
    </motion.div>
  );
};

export default ReferralLevelsCard;
