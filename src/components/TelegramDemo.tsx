import React from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { motion } from 'framer-motion';
import { Smartphone, Globe, Zap, Shield, Users, DollarSign } from 'lucide-react';

export default function TelegramDemo() {
  const {
    isAvailable,
    isReady,
    user,
    theme,
    showMainButton,
    hideMainButton,
    hapticFeedback,
    notificationFeedback
  } = useTelegram();

  const handleMainButtonClick = () => {
    hapticFeedback('medium');
    notificationFeedback('success');
    alert('মেইন বাটন ক্লিক করা হয়েছে!');
  };

  const handleHapticTest = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    hapticFeedback(style);
  };

  const handleNotificationTest = (type: 'error' | 'success' | 'warning') => {
    notificationFeedback(type);
  };

  return (
    <div className="p-6 space-y-6">
      {/* হেডার */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          টেলিগ্রাম মিনি অ্যাপ ডেমো
        </h2>
        <p className="text-gray-600">
          টেলিগ্রাম WebApp API এর ফিচারগুলো টেস্ট করুন
        </p>
      </motion.div>

      {/* স্ট্যাটাস কার্ডস */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div 
          className="bg-white p-4 rounded-lg shadow-md border"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-semibold">টেলিগ্রাম WebApp</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {isAvailable ? 'উপলব্ধ' : 'অনুপলব্ধ'}
          </p>
        </motion.div>

        <motion.div 
          className="bg-white p-4 rounded-lg shadow-md border"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="font-semibold">অ্যাপ স্ট্যাটাস</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {isReady ? 'প্রস্তুত' : 'লোড হচ্ছে...'}
          </p>
        </motion.div>
      </div>

      {/* ইউজার ইনফরমেশন */}
      {user && (
        <motion.div 
          className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            টেলিগ্রাম ইউজার ইনফরমেশন
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">ইউজার ID</p>
              <p className="font-mono text-lg font-semibold">{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">নাম</p>
              <p className="text-lg font-semibold">{user.first_name} {user.last_name || ''}</p>
            </div>
            {user.username && (
              <div>
                <p className="text-sm text-gray-600">ইউজারনেম</p>
                <p className="text-lg font-semibold">@{user.username}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">থিম</p>
              <p className="text-lg font-semibold capitalize">{theme}</p>
            </div>
          </div>

          {user.photo_url && (
            <div className="mt-4 text-center">
              <img 
                src={user.photo_url} 
                alt="Profile" 
                className="w-20 h-20 rounded-full mx-auto border-4 border-white shadow-lg"
              />
            </div>
          )}
        </motion.div>
      )}

      {/* টেস্টিং কন্ট্রোলস */}
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          টেস্টিং কন্ট্রোলস
        </h3>

        <div className="space-y-4">
          {/* মেইন বাটন কন্ট্রোল */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">মেইন বাটন</h4>
            <div className="flex gap-2">
              <button
                onClick={() => showMainButton('টেস্ট বাটন', handleMainButtonClick)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                বাটন দেখান
              </button>
              <button
                onClick={hideMainButton}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                বাটন লুকান
              </button>
            </div>
          </div>

          {/* হ্যাপটিক ফিডব্যাক */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">হ্যাপটিক ফিডব্যাক</h4>
            <div className="flex flex-wrap gap-2">
              {(['light', 'medium', 'heavy', 'rigid', 'soft'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => handleHapticTest(style)}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* নোটিফিকেশন ফিডব্যাক */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">নোটিফিকেশন ফিডব্যাক</h4>
            <div className="flex gap-2">
              {(['error', 'success', 'warning'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleNotificationTest(type)}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                    type === 'success' ? 'bg-green-500 hover:bg-green-600' :
                    'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ফিচার লিস্ট */}
      <motion.div 
        className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          উপলব্ধ ফিচারগুলো
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm">ইউজার অথেনটিকেশন</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm">থিম অ্যাডাপ্টেশন</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm">হ্যাপটিক ফিডব্যাক</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm">মেইন বাটন কন্ট্রোল</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm">ব্যাক বাটন কন্ট্রোল</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm">অ্যাপ এক্সপ্যানশন</span>
          </div>
        </div>
      </motion.div>

      {/* ডেমো মোড নোট */}
      {!isAvailable && (
        <motion.div 
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800">ডেমো মোড</span>
          </div>
          <p className="text-yellow-700 text-sm">
            আপনি বর্তমানে ডেমো মোডে আছেন। টেলিগ্রাম মিনি অ্যাপ হিসেবে ব্যবহার করতে 
            টেলিগ্রাম বট থেকে অ্যাপ খুলুন।
          </p>
        </motion.div>
      )}
    </div>
  );
} 