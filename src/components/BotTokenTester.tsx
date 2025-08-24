import React, { useState } from 'react';
import { 
  getBotInfo, 
  sendTelegramMessage, 
  getWebAppInfo, 
  setDefaultCommands,
  checkBotStatus,
  validateBotToken 
} from '../lib/telegram';
import { Bot, MessageSquare, Settings, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BotTokenTester() {
  const [isLoading, setIsLoading] = useState(false);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [webAppInfo, setWebAppInfo] = useState<any>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [results, setResults] = useState<Array<{
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }>>([]);

  // বট ইনফরমেশন লোড
  const handleGetBotInfo = async () => {
    setIsLoading(true);
    try {
      const info = await getBotInfo();
      setBotInfo(info);
      addResult('success', `Bot info loaded: ${info.first_name} (@${info.username})`);
    } catch (error: any) {
      addResult('error', `Failed to get bot info: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ওয়েব অ্যাপ ইনফো লোড
  const handleGetWebAppInfo = async () => {
    setIsLoading(true);
    try {
      const info = await getWebAppInfo();
      setWebAppInfo(info);
      addResult('success', 'Web app info loaded successfully');
    } catch (error: any) {
      addResult('error', `Failed to get web app info: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // টেস্ট মেসেজ পাঠানো
  const handleSendTestMessage = async () => {
    if (!testChatId || !testMessage) {
      addResult('error', 'Please enter both chat ID and message');
      return;
    }

    setIsLoading(true);
    try {
      await sendTelegramMessage(testChatId, testMessage);
      addResult('success', 'Test message sent successfully!');
      setTestMessage('');
    } catch (error: any) {
      addResult('error', `Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ডিফল্ট কমান্ড সেট
  const handleSetDefaultCommands = async () => {
    setIsLoading(true);
    try {
      await setDefaultCommands();
      addResult('success', 'Default commands set successfully!');
    } catch (error: any) {
      addResult('error', `Failed to set commands: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // বট স্ট্যাটাস চেক
  const handleCheckBotStatus = async () => {
    setIsLoading(true);
    try {
      const status = await checkBotStatus();
      addResult('info', `Bot status: ${status.bot.isActive ? 'Active' : 'Inactive'}`);
      if (status.webApp.hasWebhook) {
        addResult('info', `Webhook: ${status.webApp.webhookUrl}`);
      }
    } catch (error: any) {
      addResult('error', `Failed to check status: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // টোকেন ভ্যালিডেশন চেক
  const handleValidateToken = () => {
    const isValid = validateBotToken();
    if (isValid) {
      addResult('success', 'Bot token is valid!');
    } else {
      addResult('error', 'Bot token is invalid or missing');
    }
  };

  // রেজাল্ট যোগ করা
  const addResult = (type: 'success' | 'error' | 'info', message: string) => {
    setResults(prev => [{
      type,
      message,
      timestamp: new Date()
    }, ...prev.slice(0, 9)]); // শুধু শেষ 10টি রেজাল্ট রাখা
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
          <Bot className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          টেলিগ্রাম বট টোকেন টেস্টার
        </h2>
        <p className="text-gray-600">
          আপনার বট টোকেন টেস্ট করুন এবং API ফাংশনগুলো চেক করুন
        </p>
      </motion.div>

      {/* টোকেন ভ্যালিডেশন */}
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          টোকেন ভ্যালিডেশন
        </h3>
        
        <div className="space-y-4">
          <button
            onClick={handleValidateToken}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            টোকেন ভ্যালিডেশন চেক
          </button>
          
          <button
            onClick={handleCheckBotStatus}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ml-2"
          >
            বট স্ট্যাটাস চেক
          </button>
        </div>
      </motion.div>

      {/* বট ইনফরমেশন */}
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          বট ইনফরমেশন
        </h3>
        
        <div className="space-y-4">
          <button
            onClick={handleGetBotInfo}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'বট ইনফো লোড'}
          </button>
          
          {botInfo && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">বট ডিটেইলস:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>ID:</strong> {botInfo.id}</p>
                <p><strong>নাম:</strong> {botInfo.first_name}</p>
                <p><strong>ইউজারনেম:</strong> @{botInfo.username}</p>
                <p><strong>স্ট্যাটাস:</strong> {botInfo.is_bot ? 'Bot' : 'User'}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ওয়েব অ্যাপ ইনফো */}
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-600" />
          ওয়েব অ্যাপ ইনফরমেশন
        </h3>
        
        <div className="space-y-4">
          <button
            onClick={handleGetWebAppInfo}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'ওয়েব অ্যাপ ইনফো লোড'}
          </button>
          
          {webAppInfo && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">ওয়েব অ্যাপ ডিটেইলস:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Webhook URL:</strong> {webAppInfo.url || 'Not set'}</p>
                <p><strong>Pending Updates:</strong> {webAppInfo.pending_update_count}</p>
                <p><strong>Last Error:</strong> {webAppInfo.last_error_message || 'None'}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* টেস্ট মেসেজ */}
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-600" />
          টেস্ট মেসেজ পাঠানো
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              চ্যাট ID (আপনার টেলিগ্রাম ID)
            </label>
            <input
              type="text"
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              placeholder="123456789"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              মেসেজ
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="টেস্ট মেসেজ লিখুন..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={handleSendTestMessage}
            disabled={isLoading || !testChatId || !testMessage}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'মেসেজ পাঠান'}
          </button>
        </div>
      </motion.div>

      {/* কমান্ড সেটিং */}
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          বট কমান্ড সেটিং
        </h3>
        
        <button
          onClick={handleSetDefaultCommands}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'ডিফল্ট কমান্ড সেট করুন'}
        </button>
        
        <p className="text-sm text-gray-600 mt-2">
          এটি আপনার বটে ডিফল্ট কমান্ডগুলো সেট করবে (/start, /help, /balance, ইত্যাদি)
        </p>
      </motion.div>

      {/* রেজাল্টস */}
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          টেস্ট রেজাল্টস
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-4">কোন টেস্ট রান করা হয়নি</p>
          ) : (
            results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  result.type === 'success' ? 'bg-green-50 text-green-800' :
                  result.type === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                {result.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : result.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <Settings className="w-4 h-4 text-blue-600" />
                )}
                <span className="text-sm">{result.message}</span>
                <span className="text-xs opacity-70 ml-auto">
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
} 