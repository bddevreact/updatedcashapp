import { useState, useEffect, useCallback } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  isExpanded: boolean;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    start_param?: string;
  };
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    isVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    enable: () => void;
    disable: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    isVisible: boolean;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
}

export const useTelegram = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  // টেলিগ্রাম WebApp এর উপলব্ধতা চেক
  useEffect(() => {
    const checkTelegramAvailability = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        setIsAvailable(true);
        const telegramWebApp = window.Telegram.WebApp as any;
        setWebApp(telegramWebApp);
        
        // ইউজার ডেটা সেট
        const telegramUser = telegramWebApp.initDataUnsafe?.user;
        if (telegramUser) {
          setUser(telegramUser);
        }
        
        // থিম সেট
        setTheme(telegramWebApp.colorScheme || 'light');
        
        // WebApp প্রস্তুত
        try {
          telegramWebApp.ready();
          setIsReady(true);
          
          // ফুল স্ক্রিন
          telegramWebApp.expand();
        } catch (error) {
          console.warn('Telegram WebApp initialization error:', error);
        }
      } else {
        setIsAvailable(false);
        console.log('Telegram WebApp not available - running in demo mode');
      }
    };

    checkTelegramAvailability();
  }, []);

  // ইউজার ডেটা আপডেট
  const updateUser = useCallback((userData: Partial<TelegramUser>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  }, [user]);

  // WebApp বন্ধ
  const closeApp = useCallback(() => {
    if (webApp) {
      webApp.close();
    }
  }, [webApp]);

  // WebApp প্রস্তুত
  const readyApp = useCallback(() => {
    if (webApp) {
      webApp.ready();
      setIsReady(true);
    }
  }, [webApp]);

  // WebApp এক্সপ্যান্ড
  const expandApp = useCallback(() => {
    if (webApp) {
      webApp.expand();
    }
  }, [webApp]);

  // মেইন বাটন কন্ট্রোল
  const showMainButton = useCallback((text: string, callback: () => void) => {
    if (webApp) {
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(callback);
      webApp.MainButton.show();
    }
  }, [webApp]);

  const hideMainButton = useCallback(() => {
    if (webApp) {
      webApp.MainButton.hide();
    }
  }, [webApp]);

  // ব্যাক বাটন কন্ট্রোল
  const showBackButton = useCallback((callback: () => void) => {
    if (webApp) {
      webApp.BackButton.onClick(callback);
      webApp.BackButton.show();
    }
  }, [webApp]);

  const hideBackButton = useCallback(() => {
    if (webApp) {
      webApp.BackButton.hide();
    }
  }, [webApp]);

  // হ্যাপটিক ফিডব্যাক
  const hapticFeedback = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    if (webApp) {
      webApp.HapticFeedback.impactOccurred(style);
    }
  }, [webApp]);

  const notificationFeedback = useCallback((type: 'error' | 'success' | 'warning') => {
    if (webApp) {
      webApp.HapticFeedback.notificationOccurred(type);
    }
  }, [webApp]);

  // স্টার্ট প্যারামিটার
  const getStartParam = useCallback(() => {
    return webApp?.initDataUnsafe?.start_param;
  }, [webApp]);

  // কুয়েরি ID
  const getQueryId = useCallback(() => {
    return webApp?.initDataUnsafe?.query_id;
  }, [webApp]);

  // থিম প্যারামিটার
  const getThemeParams = useCallback(() => {
    return webApp?.themeParams;
  }, [webApp]);

  return {
    // স্টেট
    isAvailable,
    isReady,
    user,
    theme,
    webApp,
    
    // অ্যাকশন
    updateUser,
    closeApp,
    readyApp,
    expandApp,
    
    // বাটন কন্ট্রোল
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    
    // হ্যাপটিক ফিডব্যাক
    hapticFeedback,
    notificationFeedback,
    
    // ইউটিলিটি
    getStartParam,
    getQueryId,
    getThemeParams,
  };
}; 