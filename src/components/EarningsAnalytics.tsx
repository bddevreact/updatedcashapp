import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Target, DollarSign, Activity, PieChart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

interface EarningsAnalyticsProps {
  telegramId: string;
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

export default function EarningsAnalytics({ telegramId }: EarningsAnalyticsProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year'>('3months');

  useEffect(() => {
    loadAnalyticsData();
  }, [telegramId, selectedPeriod]);

  const loadAnalyticsData = async () => {
    if (!telegramId) return;

    setIsLoading(true);
    try {
      // Load monthly earnings data
      const months = selectedPeriod === '3months' ? 3 : selectedPeriod === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: earnings, error } = await supabase
        .from('earnings')
        .select('*')
        .eq('user_id', telegramId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process monthly data
      const monthlyMap = new Map<string, MonthlyData>();
      
      earnings?.forEach((earning: any) => {
        const date = new Date(earning.created_at);
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
        monthData.total += earning.amount || 0;

        switch (earning.source) {
          case 'task':
            monthData.task += earning.amount || 0;
            break;
          case 'referral':
            monthData.referral += earning.amount || 0;
            break;
          case 'bonus':
            monthData.bonus += earning.amount || 0;
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
      const totalAmount = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      earnings?.forEach((earning: any) => {
        const source = earning.source || 'unknown';
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { total: 0, count: 0 });
        }

        const sourceInfo = sourceMap.get(source)!;
        sourceInfo.total += earning.amount || 0;
        sourceInfo.count += 1;
      });

      const sourceArray = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        total: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? Math.round((data.total / totalAmount) * 100) : 0
      })).sort((a, b) => b.total - a.total);

      setSourceData(sourceArray);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  const getMaxAmount = () => {
    if (monthlyData.length === 0) return 100;
    return Math.max(...monthlyData.map(m => m.total));
  };

  if (isLoading) {
    return (
      <div className="glass p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4"></div>
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="glass p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold" />
          Earnings Analytics
        </h3>
        <div className="flex gap-2">
          {(['3months', '6months', '1year'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-gold text-navy'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {period === '3months' ? '3 Months' : period === '6months' ? '6 Months' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyData.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" />
            Monthly Earnings Trend
          </h3>
          <div className="space-y-4">
            {monthlyData.map((month, index) => (
              <div key={month.month} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">{month.month}</span>
                  <span className="text-sm text-gold font-semibold">{formatCurrency(month.total)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-gold to-yellow-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(month.total / getMaxAmount()) * 100}%` }}
                  ></div>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>Task: {formatCurrency(month.task)}</span>
                  <span>Referral: {formatCurrency(month.referral)}</span>
                  <span>Bonus: {formatCurrency(month.bonus)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Breakdown */}
      {sourceData.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-gold" />
            Earnings by Source
          </h3>
          <div className="space-y-3">
            {sourceData.map((source, index) => (
              <motion.div
                key={source.source}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gold"></div>
                  <div>
                    <p className="font-medium text-white">{source.source}</p>
                    <p className="text-xs text-gray-400">{source.count} entries</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gold">{formatCurrency(source.total)}</p>
                  <p className="text-xs text-gray-400">{source.percentage}%</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-4 text-center">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-white text-sm">📊</span>
          </div>
          <p className="text-sm text-gray-400">Total Months</p>
          <p className="text-lg font-semibold text-white">{monthlyData.length}</p>
        </div>
        <div className="glass p-4 text-center">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-white text-sm">💰</span>
          </div>
          <p className="text-sm text-gray-400">Average/Month</p>
          <p className="text-lg font-semibold text-green-400">
            {monthlyData.length > 0 
              ? formatCurrency(Math.round(monthlyData.reduce((sum, m) => sum + m.total, 0) / monthlyData.length))
              : formatCurrency(0)
            }
          </p>
        </div>
      </div>

      {/* No Data State */}
      {monthlyData.length === 0 && (
        <div className="glass p-6 text-center">
          <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No Analytics Data</h3>
          <p className="text-sm text-gray-500">
            Start earning to see your analytics and trends
          </p>
        </div>
      )}
    </div>
  );
}
