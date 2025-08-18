import React, { useState, useEffect } from 'react';
import { Bot, Settings, Save, TestTube, CheckCircle, XCircle, RefreshCw, Webhook, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import telegramBot, { BotConfig, defaultBotConfig } from '../lib/telegramBot';

interface BotConfigurationProps {
  onConfigUpdate?: (config: BotConfig) => void;
}

export default function BotConfiguration({ onConfigUpdate }: BotConfigurationProps) {
  const [config, setConfig] = useState<BotConfig>(defaultBotConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);

  useEffect(() => {
    loadBotConfig();
    if (config.isEnabled && config.botToken) {
      loadBotInfo();
      loadWebhookInfo();
    }
  }, [config.isEnabled, config.botToken]);

  const loadBotConfig = () => {
    console.log('Loading bot config from localStorage...');
    // Load from localStorage or environment
    const savedConfig = localStorage.getItem('botConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        console.log('Loaded config from localStorage:', parsed);
        setConfig(parsed);
      } catch (error) {
        console.error('Error parsing saved config:', error);
        // Reset to default if parsing fails
        setConfig(defaultBotConfig);
      }
    } else {
      console.log('No saved config found, using default');
      setConfig(defaultBotConfig);
    }
  };

  const saveBotConfig = async () => {
    console.log('Saving bot config:', config);
    
    // Validate required fields
    if (!config.botToken.trim()) {
      setTestResult({ success: false, message: 'Bot token is required' });
      return;
    }

    if (config.isEnabled && !config.botToken.trim()) {
      setTestResult({ success: false, message: 'Bot token is required when enabling the bot' });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Saving to localStorage...');
      // Save to localStorage
      localStorage.setItem('botConfig', JSON.stringify(config));
      console.log('Saved to localStorage successfully');
      
      console.log('Updating bot instance...');
      // Update bot instance with new configuration
      telegramBot.updateConfig(config);
      console.log('Bot instance updated successfully');
      
      // Set webhook if enabled
      if (config.isEnabled && config.webhookUrl && config.webhookUrl.trim()) {
        try {
          console.log('Setting webhook...');
          await telegramBot.setWebhook(config.webhookUrl);
          console.log('Webhook set successfully');
        } catch (webhookError) {
          console.warn('Webhook setup failed:', webhookError);
          // Don't fail the entire save operation for webhook issues
        }
      }
      
      onConfigUpdate?.(config);
      setTestResult({ success: true, message: 'Bot configuration saved successfully!' });
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setTestResult(null);
      }, 3000);
      
      // Reload bot info
      if (config.isEnabled && config.botToken) {
        console.log('Reloading bot info...');
        await loadBotInfo();
        await loadWebhookInfo();
      }
      
      console.log('Bot configuration saved completely successfully!');
    } catch (error) {
      console.error('Error saving bot config:', error);
      setTestResult({ success: false, message: 'Failed to save configuration. Please try again.' });
      
      // Auto-clear error message after 5 seconds
      setTimeout(() => {
        setTestResult(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const testBotConnection = async () => {
    if (!config.botToken) {
      setTestResult({ success: false, message: 'Please enter bot token first' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await telegramBot.getBotInfo();
      if (result.ok) {
        setBotInfo(result.result);
        setTestResult({ success: true, message: `Bot connected successfully! Name: ${result.result.first_name}` });
      } else {
        setTestResult({ success: false, message: `Bot connection failed: ${result.description}` });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to test bot connection' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBotInfo = async () => {
    try {
      const result = await telegramBot.getBotInfo();
      if (result.ok) {
        setBotInfo(result.result);
      }
    } catch (error) {
      console.error('Failed to load bot info:', error);
    }
  };

  const loadWebhookInfo = async () => {
    try {
      const result = await telegramBot.getWebhookInfo();
      if (result.ok) {
        setWebhookInfo(result.result);
      }
    } catch (error) {
      console.error('Failed to load webhook info:', error);
    }
  };

  const sendTestMessage = async () => {
    if (!config.botToken) {
      setTestResult({ success: false, message: 'Please enter bot token first' });
      return;
    }

    const testTelegramId = prompt('Enter Telegram ID to send test message:');
    if (!testTelegramId) return;

    setIsLoading(true);
    try {
      const result = await telegramBot.sendNotification(parseInt(testTelegramId), 'This is a test message from BT Community Bot! 🎉', 'success');
      if (result.ok) {
        setTestResult({ success: true, message: 'Test message sent successfully!' });
      } else {
        setTestResult({ success: false, message: `Failed to send test message: ${result.description}` });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to send test message' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBot = async () => {
    console.log('Toggle bot clicked. Current state:', config.isEnabled);
    const newEnabledState = !config.isEnabled;
    console.log('New state will be:', newEnabledState);
    
    // Update local state immediately
    setConfig(prev => {
      const newConfig = { ...prev, isEnabled: newEnabledState };
      console.log('Updated config:', newConfig);
      return newConfig;
    });

    // Save to localStorage immediately
    try {
      const newConfig = { ...config, isEnabled: newEnabledState };
      localStorage.setItem('botConfig', JSON.stringify(newConfig));
      console.log('Config saved to localStorage immediately');
      
      // Update bot instance
      telegramBot.updateConfig(newConfig);
      console.log('Bot instance updated');
      
      // Show success message
      setTestResult({ 
        success: true, 
        message: `Bot ${newEnabledState ? 'enabled' : 'disabled'} successfully!` 
      });
      
      // Auto-clear message
      setTimeout(() => setTestResult(null), 2000);
      
    } catch (error) {
      console.error('Error saving config on toggle:', error);
      setTestResult({ 
        success: false, 
        message: 'Failed to save configuration on toggle' 
      });
      
      // Auto-clear error message
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  // Test function to verify configuration
  const testConfiguration = () => {
    console.log('Current config state:', config);
    console.log('Current localStorage:', localStorage.getItem('botConfig'));
    console.log('Current bot instance config:', telegramBot.getConfig());
    
    // Test if bot token is valid format
    if (config.botToken) {
      const tokenParts = config.botToken.split(':');
      if (tokenParts.length === 2) {
        console.log('✅ Bot token format is valid');
      } else {
        console.log('❌ Bot token format is invalid');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Telegram Bot Configuration</h2>
          <p className="text-gray-400 text-sm">Configure your Telegram bot for notifications</p>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="glass p-6 border border-white/10">
        {/* Status Indicator */}
        <div className="mb-4 p-3 rounded-lg border border-white/10 bg-gradient-to-r from-gray-800/50 to-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                config.isEnabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span className="text-sm font-medium text-gray-300">Bot Status:</span>
              <span className={`text-sm font-semibold ${
                config.isEnabled ? 'text-green-400' : 'text-red-400'
              }`}>
                {config.isEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {config.isEnabled ? 'Bot is active and ready' : 'Bot is inactive'}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Bot Token */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bot Token
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="password"
              value={config.botToken}
              onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get this from @BotFather on Telegram
            </p>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Webhook URL (Optional)
            </label>
            <input
              type="url"
              value={config.webhookUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
              placeholder="https://your-domain.com/api/telegram-webhook"
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              For receiving updates from Telegram (requires HTTPS)
            </p>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">Enable Bot</label>
              <p className="text-xs text-gray-500">Turn on bot notifications</p>
            </div>
            <button
              onClick={toggleBot}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 cursor-pointer hover:scale-105 ${
                config.isEnabled ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-gray-600 hover:bg-gray-500'
              }`}
              title={config.isEnabled ? 'Click to disable bot' : 'Click to enable bot'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-md ${
                  config.isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div className="ml-3">
              <span className={`text-xs font-medium ${
                config.isEnabled ? 'text-blue-400' : 'text-gray-400'
              }`}>
                {config.isEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={saveBotConfig}
            disabled={isLoading || !config.botToken}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>

          <button
            onClick={testBotConnection}
            disabled={isLoading || !config.botToken}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube className="w-4 h-4" />
            Test Connection
          </button>

          <button
            onClick={sendTestMessage}
            disabled={isLoading || !config.botToken || !config.isEnabled}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4" />
            Send Test Message
          </button>

          <button
            onClick={testConfiguration}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
          >
            <TestTube className="w-4 h-4" />
            Debug Config
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset bot configuration to default?')) {
                setConfig(defaultBotConfig);
                localStorage.removeItem('botConfig');
                setTestResult({ 
                  success: true, 
                  message: 'Bot configuration reset to default!' 
                });
                setTimeout(() => setTestResult(null), 3000);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300"
          >
            <XCircle className="w-4 h-4" />
            Reset Config
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass p-4 border rounded-lg ${
            testResult.success ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
              {testResult.message}
            </span>
          </div>
        </motion.div>
      )}

      {/* Bot Information */}
      {botInfo && (
        <div className="glass p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Bot Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Bot Name</div>
              <div className="text-white font-medium">{botInfo.first_name}</div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Username</div>
              <div className="text-white font-medium">@{botInfo.username}</div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Bot ID</div>
              <div className="text-white font-medium">{botInfo.id}</div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Can Join Groups</div>
              <div className="text-white font-medium">{botInfo.can_join_groups ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Information */}
      {webhookInfo && (
        <div className="glass p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Webhook className="w-5 h-5 text-purple-400" />
            Webhook Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-sm text-gray-400">Webhook URL</span>
              <span className="text-white font-medium text-sm">
                {webhookInfo.url || 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-sm text-gray-400">Status</span>
              <span className={`text-sm font-medium ${
                webhookInfo.url ? 'text-green-400' : 'text-red-400'
              }`}>
                {webhookInfo.url ? 'Active' : 'Inactive'}
              </span>
            </div>
            {webhookInfo.last_error_date && (
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-400">Last Error</span>
                <span className="text-red-400 text-sm">
                  {new Date(webhookInfo.last_error_date * 1000).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="glass p-6 border border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Setup Instructions
        </h3>
        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-blue-400">1.</span>
            <span>Create a bot with @BotFather on Telegram and get the bot token</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">2.</span>
            <span>Enter the bot token above and save the configuration</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">3.</span>
            <span>Test the connection to ensure the bot is working</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">4.</span>
            <span>Send a test message to verify notifications work</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">5.</span>
            <span>Optional: Set up webhook URL for real-time updates</span>
          </div>
          
          {/* Environment Variables Section */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-blue-500/20">
            <h4 className="text-sm font-medium text-blue-400 mb-2">Environment Variables (Optional)</h4>
            <p className="text-xs text-gray-400 mb-2">
              For production deployment, you can set these environment variables:
            </p>
            <div className="space-y-1 text-xs">
              <code className="text-green-400">VITE_TELEGRAM_BOT_TOKEN=your_bot_token</code>
              <br />
              <code className="text-green-400">VITE_WEBHOOK_URL=your_webhook_url</code>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              If not set, the bot will use localStorage configuration instead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 