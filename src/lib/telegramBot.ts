// Telegram Bot Configuration and Integration
export interface BotConfig {
  botToken: string;
  webhookUrl?: string;
  isEnabled: boolean;
}

export interface BotMessage {
  chat_id: number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  reply_markup?: any;
}

export interface BotResponse {
  ok: boolean;
  result?: any;
  error_code?: number;
  description?: string;
}

class TelegramBot {
  private botToken: string;
  private baseUrl: string;
  private isEnabled: boolean;

  constructor(config: BotConfig) {
    this.botToken = config.botToken;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.isEnabled = config.isEnabled;
  }

  // Update bot configuration
  updateConfig(newConfig: BotConfig) {
    this.botToken = newConfig.botToken;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.isEnabled = newConfig.isEnabled;
  }

  // Get current configuration
  getConfig(): BotConfig {
    return {
      botToken: this.botToken,
      webhookUrl: '', // We don't store webhook URL in the class
      isEnabled: this.isEnabled
    };
  }

  // Send message to user
  async sendMessage(message: BotMessage): Promise<BotResponse> {
    if (!this.isEnabled || !this.botToken) {
      return { ok: false, description: 'Bot is not enabled or token is missing' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending bot message:', error);
      return { ok: false, description: 'Failed to send message' };
    }
  }

  // Send notification to user
  async sendNotification(telegramId: number, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<BotResponse> {
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const formattedMessage = `${emoji[type]} ${message}`;
    
    return this.sendMessage({
      chat_id: telegramId,
      text: formattedMessage,
      parse_mode: 'HTML'
    });
  }

  // Send withdrawal notification
  async sendWithdrawalNotification(telegramId: number, amount: number, status: string, method: string): Promise<BotResponse> {
    const message = `
💰 <b>Withdrawal Update</b>

Amount: ৳${amount.toLocaleString()}
Method: ${method}
Status: ${status}

${status === 'approved' ? '✅ Your withdrawal has been approved and processed!' : 
  status === 'rejected' ? '❌ Your withdrawal has been rejected. Please check admin notes.' : 
  '⏳ Your withdrawal is under review.'}
    `;

    return this.sendMessage({
      chat_id: telegramId,
      text: message.trim(),
      parse_mode: 'HTML'
    });
  }

  // Send task completion notification
  async sendTaskNotification(telegramId: number, taskName: string, reward: number, status: string): Promise<BotResponse> {
    const message = `
🎯 <b>Task Update</b>

Task: ${taskName}
Reward: ৳${reward}
Status: ${status}

${status === 'approved' ? '✅ Task approved! Reward added to your balance.' : 
  status === 'rejected' ? '❌ Task rejected. Please check requirements.' : 
  '⏳ Task under review.'}
    `;

    return this.sendMessage({
      chat_id: telegramId,
      text: message.trim(),
      parse_mode: 'HTML'
    });
  }

  // Send referral notification
  async sendReferralNotification(telegramId: number, newMemberName: string, reward: number): Promise<BotResponse> {
    const message = `
👥 <b>New Referral!</b>

Member: ${newMemberName}
Reward: ৳${reward}

🎉 Congratulations! You've earned ৳${reward} for this referral.
Keep inviting more members to earn more!
    `;

    return this.sendMessage({
      chat_id: telegramId,
      text: message.trim(),
      parse_mode: 'HTML'
    });
  }

  // Get bot info
  async getBotInfo(): Promise<BotResponse> {
    if (!this.isEnabled || !this.botToken) {
      return { ok: false, description: 'Bot is not enabled or token is missing' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting bot info:', error);
      return { ok: false, description: 'Failed to get bot info' };
    }
  }

  // Set webhook
  async setWebhook(url: string): Promise<BotResponse> {
    if (!this.isEnabled || !this.botToken) {
      return { ok: false, description: 'Bot is not enabled or token is missing' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return { ok: false, description: 'Failed to set webhook' };
    }
  }

  // Delete webhook
  async deleteWebhook(): Promise<BotResponse> {
    if (!this.isEnabled || !this.botToken) {
      return { ok: false, description: 'Bot is not enabled or token is missing' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return { ok: false, description: 'Failed to delete webhook' };
    }
  }

  // Get webhook info
  async getWebhookInfo(): Promise<BotResponse> {
    if (!this.isEnabled || !this.botToken) {
      return { ok: false, description: 'Bot is not enabled or token is missing' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting webhook info:', error);
      return { ok: false, description: 'Failed to get webhook info' };
    }
  }
}

// Default bot configuration
export const defaultBotConfig: BotConfig = {
  botToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || localStorage.getItem('botToken') || '',
  webhookUrl: import.meta.env.VITE_WEBHOOK_URL || localStorage.getItem('webhookUrl') || '',
  isEnabled: false
};

// Helper function to get bot token from various sources
export const getBotToken = (): string => {
  // Try environment variable first
  const envToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  if (envToken) return envToken;
  
  // Try localStorage
  const localToken = localStorage.getItem('botToken');
  if (localToken) return localToken;
  
  // Return empty string if none found
  return '';
};

// Helper function to get webhook URL from various sources
export const getWebhookUrl = (): string => {
  // Try environment variable first
  const envUrl = import.meta.env.VITE_WEBHOOK_URL;
  if (envUrl) return envUrl;
  
  // Try localStorage
  const localUrl = localStorage.getItem('webhookUrl');
  if (localUrl) return localUrl;
  
  // Return empty string if none found
  return '';
};

// Create bot instance
export const telegramBot = new TelegramBot(defaultBotConfig);

// Export bot instance and configuration
export default telegramBot; 