import React, { useState } from 'react';
import { useFirebaseUserStore } from '../store/firebaseUserStore';

const SyncReferralCodes: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const syncReferralCodes = useFirebaseUserStore(state => state.syncReferralCodes);

  const handleSync = async () => {
    setIsLoading(true);
    setMessage('🔄 সিঙ্ক করা হচ্ছে...');
    
    try {
      await syncReferralCodes();
      setMessage('✅ রেফারেল কোড সিঙ্ক সম্পন্ন হয়েছে!');
    } catch (error) {
      setMessage('❌ সিঙ্ক করার সময় সমস্যা হয়েছে');
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">রেফারেল কোড সিঙ্ক</h3>
      <p className="text-gray-600 mb-4">
        যদি আপনার রেফারেল কোড Firebase-এ সঠিকভাবে দেখানো না হয়, তাহলে এই বাটনটি ক্লিক করুন।
      </p>
      
      <button
        onClick={handleSync}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md text-white font-medium ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isLoading ? 'সিঙ্ক হচ্ছে...' : 'রেফারেল কোড সিঙ্ক করুন'}
      </button>
      
      {message && (
        <div className={`mt-4 p-3 rounded-md ${
          message.includes('✅') ? 'bg-green-100 text-green-800' :
          message.includes('❌') ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default SyncReferralCodes;
