import React from 'react';
import { DivideIcon as LucideIcon, DollarSign } from 'lucide-react';

interface TaskCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  reward: number;
  isCompleted: boolean;
  onAction: () => void;
  buttonText?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  reward,
  isCompleted,
  onAction,
  buttonText = 'Start'
}) => {
  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `৳${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `৳${(num / 1000).toFixed(1)}K`;
    return `৳${num}`;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-white font-medium">{title}</h3>
            <p className="text-gray-400 text-sm">{subtitle}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-1">
          
          <div className="text-green-400 font-semibold">+{formatCurrency(reward)}</div>
          <span className="text-gray-400 text-xs">Real Money</span>
        </div>
        
        <button
          onClick={onAction}
          disabled={isCompleted}
          className={`px-4 py-1.5 rounded-lg font-medium transition-all ${
            isCompleted
              ? 'bg-gray-700/50 text-gray-500'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
        >
          {isCompleted ? 'Completed' : buttonText}
        </button>
      </div>
    </div>
  );
}