import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/currency';

interface ChartData {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface AnalyticsChartProps {
  data: ChartData[];
  title: string;
  type: 'bar' | 'line' | 'progress';
  maxValue?: number;
  showValues?: boolean;
  showPercentages?: boolean;
  height?: number;
  className?: string;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  data,
  title,
  type,
  maxValue,
  showValues = true,
  showPercentages = false,
  height = 200,
  className = ""
}) => {
  const calculatedMaxValue = maxValue || Math.max(...data.map(d => d.value), 1);

  const renderBarChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">{item.label}</span>
            <div className="text-right">
              {showValues && (
                <span className="text-sm text-gold font-semibold">
                  {formatCurrency(item.value)}
                </span>
              )}
              {showPercentages && item.percentage && (
                <span className="text-xs text-gray-400 ml-2">{item.percentage}%</span>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <motion.div
              className={`h-3 rounded-full transition-all duration-500 ${item.color || 'bg-gradient-to-r from-gold to-yellow-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / calculatedMaxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderProgressChart = () => (
    <div className="space-y-4">
      {data.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">{item.label}</span>
            <span className="text-sm text-gold font-semibold">
              {formatCurrency(item.value)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full transition-all duration-500 ${item.color || 'bg-gradient-to-r from-gold to-yellow-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / calculatedMaxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderLineChart = () => (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" className="overflow-visible">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => (
          <line
            key={i}
            x1="0"
            y1={(i * height) / 4}
            x2="100%"
            y2={(i * height) / 4}
            stroke="#374151"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}
        
        {/* Data line */}
        <polyline
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          points={data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = height - (item.value / calculatedMaxValue) * height;
            return `${x}%,${y}`;
          }).join(' ')}
        />
        
        {/* Data points */}
        {data.map((item, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = height - (item.value / calculatedMaxValue) * height;
          return (
            <circle
              key={index}
              cx={`${x}%`}
              cy={y}
              r="4"
              fill="#FFD700"
              stroke="#1F2937"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      
      {/* Labels */}
      <div className="flex justify-between mt-2">
        {data.map((item, index) => (
          <span key={index} className="text-xs text-gray-400">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`glass p-6 rounded-xl border border-gray-600/30 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gold">{title}</h3>
      
      {type === 'bar' && renderBarChart()}
      {type === 'progress' && renderProgressChart()}
      {type === 'line' && renderLineChart()}
      
      {data.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No data available</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsChart;
