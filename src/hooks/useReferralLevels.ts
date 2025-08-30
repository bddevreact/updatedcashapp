import { useMemo } from 'react';
import { REFERRAL_LEVELS } from '../utils/constants';

interface LevelInfo {
  level: number;
  required: number;
  bonus: number;
  xp: number;
  color: string;
  bgColor: string;
  borderColor: string;
  bengaliRequired: string;
  bengaliBonus: string;
  opportunities: string;
}

interface UseReferralLevelsReturn {
  getCurrentLevelInfo: (currentLevel: number) => LevelInfo;
  getNextLevelInfo: (currentLevel: number) => LevelInfo | null;
  getLevelInfo: (level: number) => LevelInfo;
  calculateProgress: (currentReferrals: number, targetLevel: number) => number;
  getNextLevelTarget: (currentLevel: number) => number;
  getRemainingReferrals: (currentReferrals: number, currentLevel: number) => number;
}

export const useReferralLevels = (): UseReferralLevelsReturn => {
  const getLevelInfo = (level: number): LevelInfo => {
    return REFERRAL_LEVELS.find(l => l.level === level) || REFERRAL_LEVELS[0];
  };

  const getCurrentLevelInfo = (currentLevel: number): LevelInfo => {
    return getLevelInfo(currentLevel);
  };

  const getNextLevelInfo = (currentLevel: number): LevelInfo | null => {
    return REFERRAL_LEVELS.find(l => l.level === currentLevel + 1) || null;
  };

  const getNextLevelTarget = (currentLevel: number): number => {
    const nextLevel = getNextLevelInfo(currentLevel);
    return nextLevel ? nextLevel.required : REFERRAL_LEVELS[0].required;
  };

  const calculateProgress = (currentReferrals: number, targetLevel: number): number => {
    const targetInfo = getLevelInfo(targetLevel);
    return Math.min((currentReferrals / targetInfo.required) * 100, 100);
  };

  const getRemainingReferrals = (currentReferrals: number, currentLevel: number): number => {
    const nextLevel = getNextLevelInfo(currentLevel);
    if (!nextLevel) return 0;
    return Math.max(0, nextLevel.required - currentReferrals);
  };

  return {
    getCurrentLevelInfo,
    getNextLevelInfo,
    getLevelInfo,
    calculateProgress,
    getNextLevelTarget,
    getRemainingReferrals
  };
};
