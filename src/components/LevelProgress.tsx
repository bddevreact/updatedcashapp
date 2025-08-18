
import React from 'react';

interface LevelProgressProps {
  currentLevel: number;
  nextLevel: number;
  progress: number;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ currentLevel, nextLevel, progress }) => {
  return (
    <div className="mx-4 mb-6">
      <div className="flex justify-between items-center mb-1">
        <div className="text-gray-300 text-sm">Progress to Level {nextLevel}</div>
        <div className="text-tg-purple text-sm font-medium">{progress}%</div>
      </div>
      <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
        <div 
          className="h-full level-progress-gradient rounded-full"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default LevelProgress;
