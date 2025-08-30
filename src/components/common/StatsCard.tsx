import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = "text-white",
  bgColor = "bg-gray-700/30",
  borderColor = "border-gray-600/30",
  subtitle,
  trend,
  onClick,
  className = ""
}) => {
  const baseClasses = `${bgColor} rounded-xl p-3 border ${borderColor} hover:border-gold/50 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`;
  
  return (
    <div className={baseClasses} onClick={onClick}>
      <div className="flex items-center justify-center mb-2">
        {icon && <span className="mr-1">{icon}</span>}
        <p className="text-gray-400 text-xs">{title}</p>
      </div>
      
      <p className={`font-bold mt-1 text-center ${color}`}>
        {typeof value === 'number' && value >= 1000 
          ? value.toLocaleString('en-IN') 
          : value}
      </p>
      
      {subtitle && (
        <p className="text-xs text-gray-500 text-center mt-1">{subtitle}</p>
      )}
      
      {trend && (
        <div className="flex items-center justify-center mt-1">
          <span className={`text-xs ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
