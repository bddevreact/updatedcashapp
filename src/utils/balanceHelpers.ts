/**
 * Balance and Earnings Helper Functions
 * Centralized logic for balance and earnings calculations
 */

export interface EarningsBreakdown {
  task: number;
  referral: number;
  bonus: number;
  total: number;
}

export interface TimeBasedEarnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
}

/**
 * Calculate earnings breakdown from raw earnings data
 */
export const calculateEarningsBreakdown = (earnings: any[]): EarningsBreakdown => {
  const breakdown: EarningsBreakdown = {
    task: 0,
    referral: 0,
    bonus: 0,
    total: 0
  };

  earnings.forEach((earning: any) => {
    const amount = earning.amount || 0;
    breakdown.total += amount;

    // Handle both 'source' and 'type' fields for compatibility
    const source = earning.source || earning.type || 'unknown';
    switch (source) {
      case 'task':
      case 'task_completion':
        breakdown.task += amount;
        break;
      case 'referral':
      case 'referral_bonus':
        breakdown.referral += amount;
        break;
      case 'bonus':
      case 'level_bonus':
        breakdown.bonus += amount;
        break;
    }
  });

  return breakdown;
};

/**
 * Calculate time-based earnings from raw earnings data
 */
export const calculateTimeBasedEarnings = (earnings: any[]): TimeBasedEarnings => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const todayEarnings = earnings
    .filter((earning: any) => new Date(earning.created_at) >= today)
    .reduce((sum: number, earning: any) => sum + (earning.amount || 0), 0);

  const weekEarnings = earnings
    .filter((earning: any) => new Date(earning.created_at) >= weekAgo)
    .reduce((sum: number, earning: any) => sum + (earning.amount || 0), 0);

  const monthEarnings = earnings
    .filter((earning: any) => new Date(earning.created_at) >= monthAgo)
    .reduce((sum: number, earning: any) => sum + (earning.amount || 0), 0);

  const totalEarnings = earnings
    .reduce((sum: number, earning: any) => sum + (earning.amount || 0), 0);

  return {
    today: todayEarnings,
    thisWeek: weekEarnings,
    thisMonth: monthEarnings,
    total: totalEarnings
  };
};

/**
 * Calculate referral bonus based on total referrals
 */
export const calculateReferralBonus = (totalReferrals: number, bonusPerReferral: number = 2): number => {
  return totalReferrals * bonusPerReferral;
};

/**
 * Calculate task earnings from total earnings and referral bonus
 */
export const calculateTaskEarnings = (totalEarnings: number, referralBonus: number): number => {
  return Math.max(0, totalEarnings - referralBonus);
};

/**
 * Validate earnings data structure
 */
export const validateEarningsData = (earnings: any[]): boolean => {
  return earnings.every((earning: any) => {
    return (
      earning.amount !== undefined &&
      earning.amount >= 0 &&
      (earning.source || earning.type) &&
      earning.created_at
    );
  });
};

/**
 * Format earnings data for consistent structure
 */
export const formatEarningsData = (earnings: any[]): any[] => {
  return earnings.map((earning: any) => ({
    id: earning.id || earning.docId,
    amount: earning.amount || earning.reward_amount || 0,
    source: earning.source || earning.type || 'unknown',
    created_at: earning.created_at || earning.completed_at || new Date().toISOString(),
    description: earning.description || earning.task_type || '',
    ...earning
  }));
};
