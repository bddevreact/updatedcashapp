
import React from 'react';
import { Share2, TrendingUp, DollarSign } from 'lucide-react';

interface BalanceCardProps {
  balance: number;
  fiatValue: number;
  percentChange: number;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ balance, fiatValue, percentChange }) => {
  const isPositive = percentChange >= 0;
  
  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };
  
  return (
    <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-4 mx-4 mb-4 border border-green-500/30">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-white/80 text-sm">Total Balance</p>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-white text-3xl font-bold">{formatCurrency(balance)}</h2>
          </div>
          <p className="text-white/80 text-xs mt-1">Real Money in BDT</p>
        </div>
        <div className="flex flex-col items-end">
          <button className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
            <Share2 size={18} className="text-white" />
          </button>
          <div className={`flex items-center mt-2 ${isPositive ? 'text-green-300' : 'text-red-300'} text-sm font-medium`}>
            <TrendingUp size={14} className={`${isPositive ? '' : 'transform rotate-180'} mr-0.5`} />
            <span>{isPositive ? '+' : ''}{percentChange}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;
