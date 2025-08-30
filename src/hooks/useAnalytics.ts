import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { formatCurrency } from '../utils/currency';

interface AnalyticsData {
  monthlyData: MonthlyData[];
  sourceData: SourceData[];
  performanceMetrics: PerformanceMetrics;
  isLoading: boolean;
  error: string | null;
}

interface MonthlyData {
  month: string;
  total: number;
  task: number;
  referral: number;
  bonus: number;
}

interface SourceData {
  source: string;
  total: number;
  count: number;
  percentage: number;
}

interface PerformanceMetrics {
  totalMonths: number;
  averagePerMonth: number;
  totalEarnings: number;
  growthRate: number;
}

interface UseAnalyticsOptions {
  telegramId: string;
  period: '3months' | '6months' | '1year';
  type: 'earnings' | 'referrals' | 'tasks';
}

export const useAnalytics = ({ telegramId, period, type }: UseAnalyticsOptions): AnalyticsData => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyticsData = useCallback(async () => {
    if (!telegramId) return;

    setIsLoading(true);
    setError(null);

    try {
      const months = period === '3months' ? 3 : period === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const collectionName = type === 'earnings' ? 'earnings' : 
                           type === 'referrals' ? 'referrals' : 'task_completions';

      const q = query(
        collection(db, collectionName),
        where('user_id', '==', telegramId),
        orderBy('created_at', 'desc'),
        limit(months * 30)
      );

      const querySnapshot = await getDocs(q);
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      // Process monthly data
      const monthlyMap = new Map<string, MonthlyData>();
      
      data.forEach((item: any) => {
        const date = new Date(item.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthName,
            total: 0,
            task: 0,
            referral: 0,
            bonus: 0
          });
        }

        const monthData = monthlyMap.get(monthKey)!;
        const amount = item.amount || item.reward_amount || 0;
        monthData.total += amount;

        const source = item.source || item.task_type || 'unknown';
        switch (source) {
          case 'task':
            monthData.task += amount;
            break;
          case 'referral':
            monthData.referral += amount;
            break;
          case 'bonus':
            monthData.bonus += amount;
            break;
        }
      });

      // Convert to array and sort
      const monthlyArray = Array.from(monthlyMap.values()).sort((a, b) => {
        const [aYear, aMonth] = a.month.split(' ');
        const [bYear, bMonth] = b.month.split(' ');
        return new Date(`${aMonth} 1, ${aYear}`).getTime() - new Date(`${bMonth} 1, ${bYear}`).getTime();
      });

      setMonthlyData(monthlyArray);

      // Process source data
      const sourceMap = new Map<string, { total: number; count: number }>();
      const totalAmount = data.reduce((sum, item) => sum + (item.amount || item.reward_amount || 0), 0);

      data.forEach((item: any) => {
        const source = item.source || item.task_type || 'unknown';
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { total: 0, count: 0 });
        }

        const sourceInfo = sourceMap.get(source)!;
        sourceInfo.total += item.amount || item.reward_amount || 0;
        sourceInfo.count += 1;
      });

      const sourceArray = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        total: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? Math.round((data.total / totalAmount) * 100) : 0
      })).sort((a, b) => b.total - a.total);

      setSourceData(sourceArray);

    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [telegramId, period, type]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const performanceMetrics: PerformanceMetrics = {
    totalMonths: monthlyData.length,
    averagePerMonth: monthlyData.length > 0 
      ? Math.round(monthlyData.reduce((sum, m) => sum + m.total, 0) / monthlyData.length)
      : 0,
    totalEarnings: monthlyData.reduce((sum, m) => sum + m.total, 0),
    growthRate: monthlyData.length >= 2 
      ? ((monthlyData[monthlyData.length - 1].total - monthlyData[0].total) / monthlyData[0].total) * 100
      : 0
  };

  return {
    monthlyData,
    sourceData,
    performanceMetrics,
    isLoading,
    error
  };
};
