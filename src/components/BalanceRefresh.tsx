import React, { useState } from 'react';
import { useFirebaseUserStore } from '../store/firebaseUserStore';

const BalanceRefresh: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { balance, refreshBalance } = useFirebaseUserStore();

  const handleRefresh = async () => {
    setIsLoading(true);
    setMessage('🔄 ব্যালেন্স আপডেট করা হচ্ছে...');
    
    try {
      await refreshBalance();
      setMessage('✅ ব্যালেন্স সফলভাবে আপডেট হয়েছে!');
    } catch (error) {
      setMessage('❌ ব্যালেন্স আপডেট করার সময় সমস্যা হয়েছে');
      console.error('Balance refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">ব্যালেন্স আপডেট</h3>
      <div className="mb-4">
        <p className="text-gray-600 mb-2">বর্তমান ব্যালেন্স:</p>
        <p className="text-2xl font-bold text-green-600">৳{balance}</p>
      </div>
      
      <p className="text-gray-600 mb-4">
        যদি আপনার ব্যালেন্স সঠিকভাবে দেখানো না হয়, তাহলে এই বাটনটি ক্লিক করুন।
      </p>
      
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md text-white font-medium ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isLoading ? 'আপডেট হচ্ছে...' : 'ব্যালেন্স আপডেট করুন'}
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

export default BalanceRefresh;
