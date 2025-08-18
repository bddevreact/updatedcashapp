import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  [key: string]: string;
}

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [settingsMap, setSettingsMap] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all system settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      const settingsData = data || [];
      setSettings(settingsData);

      // Create a map for easy access
      const settingsMapData: SystemSettings = {};
      settingsData.forEach(setting => {
        settingsMapData[setting.setting_key] = setting.setting_value;
      });
      setSettingsMap(settingsMapData);

    } catch (err) {
      console.error('Error loading system settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Get a specific setting value
  const getSetting = (key: string, defaultValue: string = ''): string => {
    return settingsMap[key] || defaultValue;
  };

  // Get a setting as number
  const getSettingAsNumber = (key: string, defaultValue: number = 0): number => {
    const value = settingsMap[key];
    if (value === undefined || value === null) return defaultValue;
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Get a setting as boolean
  const getSettingAsBoolean = (key: string, defaultValue: boolean = false): boolean => {
    const value = settingsMap[key];
    if (value === undefined || value === null) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  };

  // Get a setting as JSON
  const getSettingAsJSON = (key: string, defaultValue: any = null): any => {
    const value = settingsMap[key];
    if (value === undefined || value === null) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  };

  // Refresh settings
  const refreshSettings = () => {
    loadSettings();
  };

  // Auto-refresh settings every 30 seconds
  useEffect(() => {
    loadSettings();

    const interval = setInterval(() => {
      loadSettings();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    settings,
    settingsMap,
    loading,
    error,
    getSetting,
    getSettingAsNumber,
    getSettingAsBoolean,
    getSettingAsJSON,
    refreshSettings,
    loadSettings
  };
};

export default useSystemSettings; 