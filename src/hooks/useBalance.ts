import { useState, useEffect, useCallback } from 'react';
import { useFirebaseUserStore } from '../store/firebaseUserStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { formatCurrency } from '../utils/currency';
import { 
  calculateEarningsBreakdown, 
  calculateTimeBasedEarnings, 
  formatEarningsData,
  validateEarningsData 
} from '../utils/balanceHelpers';

interface BalanceData {
  currentBalance: number;
  totalEarnings: number;
  todayEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  earningsBreakdown: {
    task: number;
    referral: number;
    bonus: number;
    total: number;
  };
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date;
}

interface UseBalanceOptions {
  telegramId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useBalance = ({ 
  telegramId, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: UseBalanceOptions): BalanceData => {
  const { balance, totalEarnings, addNotification } = useFirebaseUserStore();
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [thisWeekEarnings, setThisWeekEarnings] = useState(0);
  const [thisMonthEarnings, setThisMonthEarnings] = useState(0);
  const [earningsBreakdown, setEarningsBreakdown] = useState({
    task: 0,
    referral: 0,
    bonus: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadEarningsData = useCallback(async () => {
    if (!telegramId) return;

    setIsLoading(true);
    setError(null);

          try {
        // Load all earnings data in a single query
        const earningsQuery = query(
          collection(db, 'earnings'),
          where('user_id', '==', telegramId),
          orderBy('created_at', 'desc'),
          limit(1000) // Limit to prevent performance issues
        );
        const earningsSnapshot = await getDocs(earningsQuery);
        const rawEarningsData = earningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Format and validate earnings data
        const formattedEarnings = formatEarningsData(rawEarningsData);
        
        if (!validateEarningsData(formattedEarnings)) {
          console.warn('Some earnings data has invalid structure');
        }

        // Calculate time-based earnings using helper function
        const timeBasedEarnings = calculateTimeBasedEarnings(formattedEarnings);
        
        // Calculate earnings breakdown using helper function
        const breakdown = calculateEarningsBreakdown(formattedEarnings);

        setTodayEarnings(timeBasedEarnings.today);
        setThisWeekEarnings(timeBasedEarnings.thisWeek);
        setThisMonthEarnings(timeBasedEarnings.thisMonth);
        setEarningsBreakdown(breakdown);
        setLastUpdate(new Date());

    } catch (err) {
      console.error('Error loading balance data:', err);
      setError('Failed to load balance data');
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load balance data'
      });
    } finally {
      setIsLoading(false);
    }
  }, [telegramId, addNotification]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !telegramId) return;

    const interval = setInterval(() => {
      loadEarningsData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, telegramId, refreshInterval, loadEarningsData]);

  // Initial load
  useEffect(() => {
    loadEarningsData();
  }, [loadEarningsData]);

  return {
    currentBalance: balance || 0,
    totalEarnings: totalEarnings || 0,
    todayEarnings,
    thisWeekEarnings,
    thisMonthEarnings,
    earningsBreakdown,
    isLoading,
    error,
    lastUpdate
  };
};
