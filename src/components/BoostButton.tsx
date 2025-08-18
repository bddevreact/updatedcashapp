
import React from 'react';
import { Zap } from 'lucide-react';

interface BoostButtonProps {
  multiplier: number;
  duration: number;
  onBoost: () => void;
  disabled?: boolean;
}

const BoostButton: React.FC<BoostButtonProps> = ({ 
  multiplier, 
  duration, 
  onBoost,
  disabled = false
}) => {
  return (
    <button 
      onClick={onBoost}
      disabled={disabled}
      className={`bg-gradient-to-r from-tg-purple to-tg-vivid-purple rounded-xl py-3 px-4 mx-4 mb-6 w-full text-white font-medium flex items-center justify-center ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <Zap size={16} className="mr-2" />
      {multiplier}x Points ({duration}s)
    </button>
  );
};

export default BoostButton;
