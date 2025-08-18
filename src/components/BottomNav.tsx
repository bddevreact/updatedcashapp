import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Users, CreditCard, TrendingUp, Trophy } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/referrals', icon: Users, label: 'Referrals' },
    { path: '/wallet', icon: CreditCard, label: 'Wallet' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/earnings', icon: TrendingUp, label: 'Earnings' }
    
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-white/10 z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'text-gold bg-gold/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'text-gold' : ''}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-gold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}