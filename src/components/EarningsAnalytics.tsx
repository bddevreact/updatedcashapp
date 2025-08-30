import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Target, DollarSign, Activity, PieChart as LucidePieChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAnalytics } from '../hooks/useAnalytics';
import AnalyticsChart from './common/AnalyticsChart';
import StatsCard from './common/StatsCard';
import { formatCurrency } from '../utils/currency';

interface EarningsAnalyticsProps {
  telegramId: string;
}

export default function EarningsAnalytics({ telegramId }: EarningsAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year'>('3months');
  
  const { monthlyData, sourceData, performanceMetrics, isLoading, error } = useAnalytics({
    telegramId,
    period: selectedPeriod,
    type: 'earnings'
  });



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
        <AnalyticsChart
          data={monthlyData.map(month => ({
            label: month.month,
            value: month.total,
            color: 'bg-gradient-to-r from-gold to-yellow-500'
          }))}
          title="Monthly Earnings Trend"
          type="bar"
          showValues={true}
        />
      )}

      {/* Source Breakdown */}
      {sourceData.length > 0 && (
        <AnalyticsChart
          data={sourceData.map(source => ({
            label: source.source,
            value: source.total,
            percentage: source.percentage,
            color: 'bg-gradient-to-r from-gold to-yellow-500'
          }))}
          title="Earnings by Source"
          type="progress"
          showValues={true}
          showPercentages={true}
        />
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <StatsCard
          title="Total Months"
          value={performanceMetrics.totalMonths}
          icon={<span className="text-blue-400">📊</span>}
          color="text-white"
        />
        <StatsCard
          title="Average/Month"
          value={formatCurrency(performanceMetrics.averagePerMonth)}
          icon={<span className="text-green-400">💰</span>}
          color="text-green-400"
        />
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
