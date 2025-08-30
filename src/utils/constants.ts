/**
 * Common constants for the Cash Points app
 */

export const REFERRAL_LEVELS = [
  {
    level: 1,
    required: 100,
    bonus: 200,
    xp: 100,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/20',
    bengaliRequired: '১০০',
    bengaliBonus: '২০০',
    opportunities: 'Level 1 Referral Bonus'
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
    bengaliBonus: '৫০০',
    opportunities: 'Level 2 Referral Bonus'
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
    bengaliBonus: '১৫০০',
    opportunities: 'Level 3 Referral Bonus'
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
    bengaliBonus: '৩০০০',
    opportunities: 'Level 4 Referral Bonus'
  },
  {
    level: 5,
    required: 100000,
    bonus: 10000,
    xp: 5000,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/20',
    bengaliRequired: '১০০০০০',
    bengaliBonus: '১০০০০',
    opportunities: 'Legendary Status + Maximum Benefits'
  }
];

export const NOTIFICATION_TYPES = {
  TASK: 'task',
  REFERRAL: 'referral',
  WITHDRAWAL: 'withdrawal',
  DEPOSIT: 'deposit',
  LEVEL_UP: 'level_up',
  BONUS: 'bonus',
  SPECIAL_TASK: 'special_task'
} as const;

export const ACTIVITY_TYPES = {
  REFERRAL: 'referral',
  TASK: 'task',
  BONUS: 'bonus',
  LEVEL_UP: 'level_up',
  WITHDRAWAL: 'withdrawal',
  DEPOSIT: 'deposit',
  SPECIAL_TASK: 'special_task'
} as const;

export const EARNING_SOURCES = {
  TASK: 'task',
  REFERRAL: 'referral',
  BONUS: 'bonus',
  WITHDRAWAL: 'withdrawal',
  REFUND: 'refund'
} as const;

export const REFERRAL_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
} as const;

export const TASK_TYPES = {
  CHECKIN: 'checkin',
  SOCIAL: 'social',
  REFERRAL: 'referral',
  TRADING_PLATFORM: 'trading_platform',
  DAILY: 'daily',
  SPECIAL: 'special'
} as const;

export const WITHDRAWAL_METHODS = {
  BKASH: 'bkash',
  NAGAD: 'nagad',
  ROCKET: 'rocket',
  UPAY: 'upay',
  BANK: 'bank'
} as const;

export const REFRESH_INTERVALS = {
  REFERRALS: 15000, // 15 seconds
  EARNINGS: 25000,  // 25 seconds
  ACTIVITY: 30000,  // 30 seconds
  BALANCE: 10000    // 10 seconds
} as const;

export const DEFAULT_REWARDS = {
  REFERRAL: 2,      // ৳2 per referral
  TASK: 1,          // ৳1 per task
  DAILY_CHECKIN: 5, // ৳5 daily checkin
  LEVEL_BONUS: 200  // ৳200 level bonus
} as const;
