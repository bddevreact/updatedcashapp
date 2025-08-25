import React, { useEffect, useState } from 'react';
import { Zap, CheckCircle2, User, Shield, Wallet, Network } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onComplete: () => void;
}

interface LoadingStep {
  id: string;
  text: string;
  description: string;
  status: 'pending' | 'completed' | 'loading';
  icon: any;
}

export default function LoadingScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
            { id: 'init', text: 'Initializing Cash Points', description: 'Setting up your account', icon: Network, status: 'pending' },
    { id: 'user', text: 'Loading User Data', description: 'Fetching your profile', icon: User, status: 'pending' },
    { id: 'wallet', text: 'Connecting Wallet', description: 'Linking your wallet', icon: Wallet, status: 'pending' },
    { id: 'security', text: 'Security Check', description: 'Verifying your account', icon: Shield, status: 'pending' },
    { id: 'ready', text: 'Ready to Earn', description: 'You can start earning now!', icon: Zap, status: 'pending' }
  ]);

  useEffect(() => {
    const totalDuration = 10000; // 10 seconds total
    const stepDuration = totalDuration / (loadingSteps.length + 1); // Reserve 1 step duration for final fade
    let currentStep = 0;

    const updateStep = () => {
      if (currentStep < loadingSteps.length) {
        setLoadingSteps(prev => prev.map((step, index) => ({
          ...step,
          status: index === currentStep ? 'loading' : 
                 index < currentStep ? 'completed' : 'pending'
        })));

        setTimeout(() => {
          setLoadingSteps(prev => prev.map((step, index) => ({
            ...step,
            status: index <= currentStep ? 'completed' : 'pending'
          })));
          currentStep++;
          if (currentStep < loadingSteps.length) {
            updateStep();
          }
        }, stepDuration / 2); // Half step duration for each status change
      }
    };

    updateStep();

    // Progress bar update interval
    const progressInterval = 50; // Update every 50ms for smooth animation
    const progressIncrement = (100 * progressInterval) / totalDuration;
    
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          setTimeout(() => {
            setShowContent(false);
            setTimeout(onComplete, 500);
          }, 500);
          return 100;
        }
        return Math.min(100, prev + progressIncrement);
      });
    }, progressInterval);

    return () => {
      clearInterval(progressTimer);
    };
  }, [onComplete, loadingSteps.length]);

  if (!showContent) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 bg-navy flex flex-col items-center justify-center transition-opacity duration-500 ${
        progress === 100 ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,215,0,0.1)_0%,_transparent_60%)] animate-pulse" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyMCAwIE0gMCAwIEwgMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjE1LCAwLCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
      </div>

      {/* Logo Animation */}
      <div className="relative mb-8 animate-float">
        <div className="absolute inset-0 bg-gold blur-2xl opacity-20 animate-pulse"></div>
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-ring border-2 border-gold rounded-full"></div>
          <div className="absolute inset-0 animate-pulse-ring border-2 border-gold rounded-full" style={{ animationDelay: '0.4s' }}></div>
          <div className="absolute inset-0 animate-pulse-ring border-2 border-gold rounded-full" style={{ animationDelay: '0.8s' }}></div>
          <Zap className="w-20 h-20 text-gold relative z-10" />
        </div>
      </div>

      {/* Cash Points Logo */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center">
            <div className="text-2xl">💰</div>
          </div>
        </div>
        <motion.div 
          className="text-2xl font-bold text-gold tracking-wider relative z-10"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          CASH POINTS
        </motion.div>
      </div>

      {/* Loading Steps */}
      <div className="space-y-4 mb-8">
        {loadingSteps.map((step, index) => (
          <motion.div
            key={step.id}
            className={`flex items-center space-x-3 p-3 rounded-lg ${
              step.status === 'completed' 
                ? 'bg-green-500/20 border border-green-500/30' 
                : step.status === 'pending'
                ? 'bg-yellow-500/20 border border-yellow-500/30'
                : 'bg-gray-800/50 border border-gray-700/50'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step.status === 'completed' 
                ? 'bg-green-500 text-white' 
                : step.status === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-600 text-gray-400'
            }`}>
              {step.status === 'completed' ? '✓' : step.status === 'pending' ? '⏳' : '○'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{step.text}</p>
              <p className="text-sm text-gray-400">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Earn Real Money Text */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="text-4xl font-bold text-white mb-2 animate-scale-fade">Earn Real Money</div>
        <p className="text-gray-400 text-lg">Join our community and start earning in BDT today!</p>
      </motion.div>

      {/* Progress Bar */}
      <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gradient-to-r from-brown via-gold to-brown rounded-full transition-all duration-300 animate-shimmer"
          style={{ 
            width: `${progress}%`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>
      
      <div className="text-gray-400 animate-scale-fade" style={{ animationDelay: '0.8s' }}>
        {progress === 100 ? 'Ready!' : 'Loading...'}
      </div>
    </div>
  );
}