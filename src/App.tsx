import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config, queryClient } from './lib/wagmi';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import AdminRoute from './components/AdminRoute';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Referrals from './pages/Referrals';
import Wallet from './pages/Wallet';
import Earnings from './pages/Earnings';
import Leaderboard from './pages/Leaderboard';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminReferrals from './pages/admin/Referrals';
import AdminTasks from './pages/admin/Tasks';
import AdminWithdrawals from './pages/admin/Withdrawals';
import AdminTradingReferrals from './pages/admin/TradingReferrals';
import AdminSettings from './pages/admin/Settings';
import { useUserStore } from './store/userStore';

function App() {
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { loadUserData, setUser } = useUserStore();

  // Initialize Telegram Web App and load user data
  useEffect(() => {
    // Check if Telegram WebApp API is available
    if (window.Telegram && window.Telegram.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        
        // Load user data from Telegram and database
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user) {
          setUser({
            name: user.first_name,
            photoUrl: user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
          });
          loadUserData(user.id.toString());
        }
      } catch (error) {
        console.warn('Telegram WebApp API error:', error);
        // Fallback to demo mode
        handleDemoMode();
      }
    } else {
      console.log('Telegram WebApp API not available - running in demo mode');
      // Fallback to demo mode for development/testing
      handleDemoMode();
    }
    
    // Set viewport height for mobile
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Update on resize
    window.addEventListener('resize', () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
  }, [loadUserData, setUser]);

  // Handle demo mode when Telegram API is not available
  const handleDemoMode = () => {
    setIsDemoMode(true);
    // Set demo user data
    setUser({
      name: 'Demo User',
      photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo'
    });
    
    // Load demo data
    loadUserData('demo_user_123');
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <LoadingScreen onComplete={() => setLoading(false)} />
        <div className={`transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}>
          <Router>
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route
                path="/admin/*"
                element={
                  <AdminRoute>
                    <Routes>
                      <Route path="/dashboard" element={<AdminDashboard />} />
                      <Route path="/users" element={<AdminUsers />} />
                      <Route path="/referrals" element={<AdminReferrals />} />
                      <Route path="/tasks" element={<AdminTasks />} />
                      <Route path="/withdrawals" element={<AdminWithdrawals />} />
                      <Route path="/trading-referrals" element={<AdminTradingReferrals />} />
                      <Route path="/settings" element={<AdminSettings />} />
                    </Routes>
                  </AdminRoute>
                }
              />

              {/* User Routes */}
              <Route
                path="/*"
                element={
                  <div className="min-h-[calc(var(--vh,1vh)*100)] bg-navy relative overflow-hidden">
                    {/* Background Decorations */}
                    <div className="fixed inset-0 pointer-events-none">
                      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-gold/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-brown/10 to-transparent" />
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyMCAwIE0gMCAwIEwgMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjE1LCAwLCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <Routes>
                        <Route path="/" element={<Home isDemoMode={isDemoMode} />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/referrals" element={<Referrals />} />
                        <Route path="/wallet" element={<Wallet />} />
                        <Route path="/earnings" element={<Earnings />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                      </Routes>
                      <BottomNav />
                    </div>
                  </div>
                }
              />
            </Routes>
          </Router>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;