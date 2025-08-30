import React, { useState, useEffect } from 'react';
import { useFirebaseUserStore } from '../store/firebaseUserStore';
import { useTelegram } from '../hooks/useTelegram';

const ReferralDebug: React.FC = () => {
  const { 
    telegramId, 
    referralCode, 
    balance, 
    name, 
    loadUserData 
  } = useFirebaseUserStore();
  
  const { 
    isAvailable, 
    isReady, 
    user: telegramUser, 
    webApp 
  } = useTelegram();

  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const gatherDebugInfo = () => {
      const info = {
        // Telegram WebApp Info
        telegramAvailable: isAvailable,
        telegramReady: isReady,
        telegramUser: telegramUser,
        webAppData: webApp?.initDataUnsafe,
        
        // Store Info
        storeUserId: telegramId,
        storeReferralCode: referralCode,
        storeName: name,
        storeBalance: balance,
        
        // Generated Link
        generatedLink: referralCode ? `https://t.me/CashPoinntbot?start=${referralCode}` : 'No referral code',
        
        // Window Telegram Object
        windowTelegram: window.Telegram,
        windowTelegramWebApp: window.Telegram?.WebApp,
        windowTelegramUser: window.Telegram?.WebApp?.initDataUnsafe?.user,
      };
      
      setDebugInfo(info);
      console.log('🐛 Referral Debug Info:', info);
    };

    gatherDebugInfo();
  }, [isAvailable, isReady, telegramUser, webApp, telegramId, referralCode, name, balance]);

  const handleReloadUser = () => {
    if (telegramUser?.id) {
      loadUserData(telegramUser.id.toString());
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-xl font-bold mb-4">🐛 Referral Debug Panel</h1>
      
      <div className="space-y-4">
        {/* Telegram Status */}
        <div className="bg-gray-800 p-3 rounded">
          <h3 className="font-semibold text-blue-400">Telegram WebApp Status</h3>
          <p>Available: <span className={isAvailable ? 'text-green-400' : 'text-red-400'}>{isAvailable ? 'Yes' : 'No'}</span></p>
          <p>Ready: <span className={isReady ? 'text-green-400' : 'text-red-400'}>{isReady ? 'Yes' : 'No'}</span></p>
          <p>User ID: <span className="text-yellow-400">{telegramUser?.id || 'Not found'}</span></p>
        </div>

        {/* Store Status */}
        <div className="bg-gray-800 p-3 rounded">
          <h3 className="font-semibold text-green-400">Store Status</h3>
          <p>User ID: <span className="text-yellow-400">{telegramId || 'Not loaded'}</span></p>
          <p>Name: <span className="text-yellow-400">{name || 'Not loaded'}</span></p>
          <p>Referral Code: <span className="text-yellow-400">{referralCode || 'Not loaded'}</span></p>
          <p>Balance: <span className="text-yellow-400">৳{balance}</span></p>
        </div>

        {/* Referral Link */}
        <div className="bg-gray-800 p-3 rounded">
          <h3 className="font-semibold text-purple-400">Referral Link</h3>
          {referralCode ? (
            <div>
              <p className="text-green-400">✅ Link Generated:</p>
              <p className="text-blue-300 break-all">{`https://t.me/CashPoinntbot?start=${referralCode}`}</p>
            </div>
          ) : (
            <p className="text-red-400">❌ No referral code found</p>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-800 p-3 rounded">
          <h3 className="font-semibold text-orange-400">Actions</h3>
          <button 
            onClick={handleReloadUser}
            className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700"
          >
            🔄 Reload User Data
          </button>
        </div>

        {/* Raw Debug Data */}
        <div className="bg-gray-800 p-3 rounded">
          <h3 className="font-semibold text-red-400">Raw Debug Data</h3>
          <pre className="text-xs overflow-auto max-h-96 bg-black p-2 rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ReferralDebug;
