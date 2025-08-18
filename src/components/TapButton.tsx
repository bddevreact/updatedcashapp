
import React, { useState } from 'react';
import { Zap } from 'lucide-react';

interface TapButtonProps {
  onTap: () => void;
}

const TapButton: React.FC<TapButtonProps> = ({ onTap }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const handlePress = () => {
    setIsPressed(true);
    onTap();
    setTimeout(() => setIsPressed(false), 150);
  };
  
  return (
    <div className="flex justify-center mb-8">
      <button
        onClick={handlePress}
        className={`w-32 h-32 rounded-full bg-tg-dark-bg border-2 border-tg-purple flex items-center justify-center
        ${isPressed ? 'scale-95' : ''} transition-transform duration-150`}
      >
        <div className="w-28 h-28 rounded-full bg-tg-dark-bg border-2 border-tg-purple/50 flex items-center justify-center animate-pulse-slow">
          <Zap size={60} className="text-tg-purple" />
        </div>
      </button>
    </div>
  );
};

export default TapButton;
