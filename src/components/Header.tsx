
import React from 'react';
import { Bell, Settings, Monitor } from 'lucide-react';

interface HeaderProps {
  avatar?: string;
  level: number;
  title?: string; // Add title prop as optional
  isDemoMode?: boolean; // Add demo mode prop
}

const Header: React.FC<HeaderProps> = ({ avatar, level, title, isDemoMode = false }) => {
  // If no title is provided, we'll render the header normally
  // If a title is provided, we'll show the title in the center
  
  if (title) {
    return (
      <header className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-tg-purple to-tg-dark-purple flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="User Avatar" className="w-9 h-9 rounded-full" />
              ) : (
                <span className="text-white font-bold">U</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-tg-dark-bg"></div>
          </div>
          <div className="ml-2 bg-yellow-400/20 px-2 py-0.5 rounded-md flex items-center">
            <span className="text-yellow-400 text-xs mr-1">🏆</span>
            <span className="text-yellow-400 text-xs font-semibold">Level {level}</span>
          </div>
          {title && <h1 className="ml-4 text-white text-lg font-medium">{title}</h1>}
        </div>
        <div className="flex space-x-3">
          {isDemoMode && (
            <div className="flex items-center bg-blue-500/20 px-2 py-1 rounded-md">
              <Monitor size={14} className="text-blue-400 mr-1" />
              <span className="text-blue-400 text-xs font-semibold">Demo Mode</span>
            </div>
          )}
          <button className="w-9 h-9 rounded-full bg-gray-700/50 flex items-center justify-center">
            <Bell size={18} className="text-gray-300" />
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-700/50 flex items-center justify-center">
            <Settings size={18} className="text-gray-300" />
          </button>
        </div>
      </header>
    );
  }
  
  // For Mine page, we'll use a minimal header or no header at all
  return null;
};

export default Header;
