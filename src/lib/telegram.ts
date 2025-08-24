// টেলিগ্রাম বট API ইউটিলিটি ফাংশন

// এনভায়রনমেন্ট ভেরিয়েবল থেকে বট টোকেন নেওয়া
const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

// বট টোকেন ভ্যালিডেশন
export const validateBotToken = (): boolean => {
  if (!botToken) {
    console.error('Telegram bot token not found in environment variables');
    return false;
  }
  
  if (!botToken.includes(':')) {
    console.error('Invalid bot token format');
    return false;
  }
  
  return true;
};

// বট ইনফরমেশন পাওয়া
export const getBotInfo = async () => {
  if (!validateBotToken()) {
    throw new Error('Invalid bot token');
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Failed to get bot info:', error);
    throw error;
  }
};

// মেসেজ পাঠানো
export const sendTelegramMessage = async (
  chatId: string | number, 
  message: string, 
  parseMode: 'HTML' | 'Markdown' = 'HTML'
) => {
  if (!validateBotToken()) {
    throw new Error('Invalid bot token');
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: parseMode,
          disable_web_page_preview: true
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
};

// ওয়েব অ্যাপ ইনফরমেশন পাওয়া
export const getWebAppInfo = async () => {
  if (!validateBotToken()) {
    throw new Error('Invalid bot token');
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Failed to get webhook info:', error);
    throw error;
  }
};

// মেনু বাটন সেট করা
export const setMenuButton = async (
  text: string,
  url: string
) => {
  if (!validateBotToken()) {
    throw new Error('Invalid bot token');
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setChatMenuButton`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: text,
            web_app: {
              url: url
            }
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Failed to set menu button:', error);
    throw error;
  }
};

// বট কমান্ড সেট করা
export const setBotCommands = async (commands: Array<{
  command: string;
  description: string;
}>) => {
  if (!validateBotToken()) {
    throw new Error('Invalid bot token');
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setMyCommands`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: commands
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Failed to set bot commands:', error);
    throw error;
  }
};

// ডিফল্ট কমান্ড সেট
export const setDefaultCommands = async () => {
  const commands = [
    {
      command: 'start',
      description: 'Start the bot and open BT Community'
    },
    {
      command: 'help',
      description: 'Get help and information'
    },
    {
      command: 'balance',
      description: 'Check your balance'
    },
    {
      command: 'tasks',
      description: 'View available tasks'
    },
    {
      command: 'referrals',
      description: 'Check your referrals'
    }
  ];

  return await setBotCommands(commands);
};

// বট স্ট্যাটাস চেক
export const checkBotStatus = async () => {
  try {
    const botInfo = await getBotInfo();
    const webAppInfo = await getWebAppInfo();
    
    return {
      bot: {
        id: botInfo.id,
        name: botInfo.first_name,
        username: botInfo.username,
        isActive: true
      },
      webApp: {
        hasWebhook: webAppInfo.url !== '',
        webhookUrl: webAppInfo.url || 'Not set',
        pendingUpdateCount: webAppInfo.pending_update_count,
        lastErrorDate: webAppInfo.last_error_date,
        lastErrorMessage: webAppInfo.last_error_message
      }
    };
  } catch (error) {
    console.error('Failed to check bot status:', error);
    return {
      bot: { isActive: false },
      webApp: { hasWebhook: false }
    };
  }
};

// এরর হ্যান্ডলিং
export const handleTelegramError = (error: any) => {
  if (error.description) {
    switch (error.description) {
      case 'Unauthorized':
        console.error('Bot token is invalid or expired');
        break;
      case 'Forbidden':
        console.error('Bot is blocked by user');
        break;
      case 'Bad Request':
        console.error('Invalid request parameters');
        break;
      default:
        console.error('Telegram API error:', error.description);
    }
  } else {
    console.error('Unknown Telegram API error:', error);
  }
};

// এক্সপোর্ট
export {
  botToken,
  botUsername
}; 