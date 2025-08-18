import React from 'react';
import { Settings, Info, AlertCircle } from 'lucide-react';
import useSystemSettings from '../hooks/useSystemSettings';

export default function SystemSettingsExample() {
  const { 
    getSetting, 
    getSettingAsNumber, 
    getSettingAsBoolean, 
    loading, 
    error 
  } = useSystemSettings();

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold mx-auto"></div>
        <p className="text-gray-400 text-sm">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-400">
        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
        <p className="text-sm">Error loading settings: {error}</p>
      </div>
    );
  }

  // Get various types of settings
  const appName = getSetting('app_name', 'BT Community');
  const appVersion = getSetting('app_version', '1.0.0');
  const maintenanceMode = getSettingAsBoolean('maintenance_mode', false);
  const maxReferrals = getSettingAsNumber('max_referrals_per_user', 100);
  const minWithdrawal = getSettingAsNumber('min_withdrawal_amount', 100);
  const referralReward = getSettingAsNumber('referral_reward_amount', 50);
  const dailyTaskLimit = getSettingAsNumber('daily_task_limit', 10);
  const autoApproval = getSettingAsBoolean('auto_approval_enabled', false);

  return (
    <div className="space-y-4">
      {/* App Info */}
      <div className="glass p-4 border border-white/10 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-5 h-5 text-gold" />
          <h3 className="text-lg font-semibold text-white">App Configuration</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">App Name:</span>
            <span className="text-white ml-2">{appName}</span>
          </div>
          <div>
            <span className="text-gray-400">Version:</span>
            <span className="text-white ml-2">{appVersion}</span>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="glass p-4 border border-white/10 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">System Status</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Maintenance Mode:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              maintenanceMode 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {maintenanceMode ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Auto Approval:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              autoApproval 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {autoApproval ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Limits & Rewards */}
      <div className="glass p-4 border border-white/10 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Limits & Rewards</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Max Referrals:</span>
            <span className="text-white ml-2">{maxReferrals}</span>
          </div>
          <div>
            <span className="text-gray-400">Min Withdrawal:</span>
            <span className="text-white ml-2">৳{minWithdrawal}</span>
          </div>
          <div>
            <span className="text-gray-400">Referral Reward:</span>
            <span className="text-white ml-2">৳{referralReward}</span>
          </div>
          <div>
            <span className="text-gray-400">Daily Task Limit:</span>
            <span className="text-white ml-2">{dailyTaskLimit}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Content Based on Settings */}
      {maintenanceMode && (
        <div className="glass p-4 border border-red-500/30 rounded-lg bg-red-500/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Maintenance Mode Active</h3>
          </div>
          <p className="text-red-300 text-sm">
            The app is currently under maintenance. Some features may be unavailable.
          </p>
        </div>
      )}

      {autoApproval && (
        <div className="glass p-4 border border-green-500/30 rounded-lg bg-green-500/10">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-green-400">Auto Approval Enabled</h3>
          </div>
          <p className="text-green-300 text-sm">
            Certain tasks will be automatically approved for faster processing.
          </p>
        </div>
      )}
    </div>
  );
} 