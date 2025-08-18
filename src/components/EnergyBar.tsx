
import React from 'react';
import { Zap } from 'lucide-react';

interface EnergyBarProps {
  current: number;
  max: number;
}

const EnergyBar: React.FC<EnergyBarProps> = ({ current, max }) => {
  const percentage = (current / max) * 100;
  
  return (
    <div className="mx-4 mb-6">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center">
          <Zap size={14} className="text-yellow-400 mr-1" />
          <span className="text-gray-300 text-sm">Energy</span>
        </div>
        <div className="text-gray-300 text-sm">{current}/{max}</div>
      </div>
      <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
        <div 
          className="h-full energy-bar-gradient rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default EnergyBar;
