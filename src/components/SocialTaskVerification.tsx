import React, { useState, useEffect } from 'react';
import { Users, Link, CheckCircle, XCircle, Loader, AlertCircle, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface SocialTaskVerificationProps {
  telegramId: string;
  taskId: string;
  groupUsername: string;
  referralLink: string;
  onVerificationComplete: (isValid: boolean, details: any) => void;
}

interface VerificationResult {
  groupJoined: boolean;
  referralValid: boolean;
  referralCount: number;
  isValid: boolean;
  details: string;
}

export default function SocialTaskVerification({
  telegramId,
  taskId,
  groupUsername,
  referralLink,
  onVerificationComplete
}: SocialTaskVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationStep, setVerificationStep] = useState<'idle' | 'checking_group' | 'checking_referral' | 'completed'>('idle');

  useEffect(() => {
    if (telegramId && taskId) {
      startVerification();
    }
  }, [telegramId, taskId]);

  const startVerification = async () => {
    setIsVerifying(true);
    setVerificationStep('checking_group');
    
    try {
      // Step 1: Check if user joined the group
      const groupVerification = await verifyGroupMembership(telegramId, groupUsername);
      
      setVerificationStep('checking_referral');
      
      // Step 2: Check referral link validity and usage
      const referralVerification = await verifyReferralLink(telegramId, referralLink);
      
      // Step 3: Combine results and make decision
      const finalResult: VerificationResult = {
        groupJoined: groupVerification.isMember,
        referralValid: referralVerification.isValid,
        referralCount: referralVerification.usageCount,
        isValid: groupVerification.isMember && referralVerification.isValid,
        details: generateVerificationDetails(groupVerification, referralVerification)
      };
      
      setVerificationResult(finalResult);
      setVerificationStep('completed');
      
      // Notify parent component
      onVerificationComplete(finalResult.isValid, finalResult);
      
    } catch (error) {
      console.error('Verification failed:', error);
      const errorResult: VerificationResult = {
        groupJoined: false,
        referralValid: false,
        referralCount: 0,
        isValid: false,
        details: 'Verification failed due to technical error'
      };
      setVerificationResult(errorResult);
      setVerificationStep('completed');
      onVerificationComplete(false, errorResult);
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyGroupMembership = async (userId: string, groupUsername: string): Promise<{ isMember: boolean; memberSince?: string }> => {
    try {
      // Method 1: Check through bot API (if we have bot token)
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      
      if (botToken) {
        // Try to get chat member info through bot
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: `@${groupUsername}`,
              user_id: userId
            })
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            const memberStatus = data.result.status;
            const isMember = ['member', 'administrator', 'creator'].includes(memberStatus);
            
            return {
              isMember,
              memberSince: data.result.joined_date ? new Date(data.result.joined_date * 1000).toISOString() : undefined
            };
          }
        }
      }
      
      // Method 2: Check through database records
      const { data: groupMembers, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', userId)
        .eq('group_username', groupUsername)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (groupMembers) {
        return {
          isMember: true,
          memberSince: groupMembers.joined_at
        };
      }
      
      // Method 3: Check through user activities
      const { data: activities, error: activityError } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_type', 'group_join')
        .eq('metadata->>group_username', groupUsername)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (activities && activities.length > 0) {
        return {
          isMember: true,
          memberSince: activities[0].created_at
        };
      }
      
      return { isMember: false };
      
    } catch (error) {
      console.error('Group membership verification error:', error);
      return { isMember: false };
    }
  };

  const verifyReferralLink = async (userId: string, referralLink: string): Promise<{ isValid: boolean; usageCount: number; details: string }> => {
    try {
      // Extract referral code from link
      const url = new URL(referralLink);
      const referralCode = url.searchParams.get('ref') || url.pathname.split('/').pop();
      
      if (!referralCode) {
        return { isValid: false, usageCount: 0, details: 'Invalid referral link format' };
      }
      
      // Check if referral code exists and belongs to user
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('referrer_id', userId)
        .single();
      
      if (referralError || !referralData) {
        return { isValid: false, usageCount: 0, details: 'Referral code not found or invalid' };
      }
      
      // Check referral link usage count
      const { data: usageData, error: usageError } = await supabase
        .from('referral_usage')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('referrer_id', userId);
      
      if (usageError) {
        console.error('Usage check error:', usageError);
      }
      
      const usageCount = usageData?.length || 0;
      
      // Validate referral link (check if it's not expired, rate limited, etc.)
      const isValid = validateReferralLink(referralData, usageCount);
      
      let details = '';
      if (isValid) {
        details = `Referral link is valid. Used ${usageCount} times.`;
      } else {
        details = `Referral link validation failed. Usage count: ${usageCount}`;
      }
      
      return { isValid, usageCount, details };
      
    } catch (error) {
      console.error('Referral link verification error:', error);
      return { isValid: false, usageCount: 0, details: 'Verification failed' };
    }
  };

  const validateReferralLink = (referralData: any, usageCount: number): boolean => {
    // Check if referral is not expired
    if (referralData.expires_at && new Date(referralData.expires_at) < new Date()) {
      return false;
    }
    
    // Check usage limits
    if (referralData.max_usage && usageCount >= referralData.max_usage) {
      return false;
    }
    
    // Check if referral is active
    if (referralData.status !== 'active') {
      return false;
    }
    
    // Check rate limiting (max 10 uses per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsage = usageCount; // This should be filtered by date in real implementation
    
    if (todayUsage >= 10) {
      return false;
    }
    
    return true;
  };

  const generateVerificationDetails = (groupVerification: any, referralVerification: any): string => {
    const details = [];
    
    if (groupVerification.isMember) {
      details.push('✅ Successfully joined the group');
      if (groupVerification.memberSince) {
        details.push(`📅 Member since: ${new Date(groupVerification.memberSince).toLocaleDateString()}`);
      }
    } else {
      details.push('❌ Not a member of the required group');
    }
    
    if (referralVerification.isValid) {
      details.push('✅ Referral link is valid');
      details.push(`🔗 Usage count: ${referralVerification.usageCount}`);
    } else {
      details.push('❌ Referral link validation failed');
    }
    
    return details.join('\n');
  };

  const getVerificationStatusIcon = () => {
    if (!verificationResult) return null;
    
    if (verificationResult.isValid) {
      return <CheckCircle className="w-8 h-8 text-green-500" />;
    } else {
      return <XCircle className="w-8 h-8 text-red-500" />;
    }
  };

  const getVerificationStatusColor = () => {
    if (!verificationResult) return 'text-gray-400';
    return verificationResult.isValid ? 'text-green-400' : 'text-red-400';
  };

  const getVerificationStatusText = () => {
    if (!verificationResult) return 'Verification Pending';
    return verificationResult.isValid ? 'Verification Successful' : 'Verification Failed';
  };

  return (
    <div className="glass p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <Bot className="w-6 h-6 text-gold" />
        <h3 className="text-lg font-semibold">Social Task Verification</h3>
      </div>

      {/* Verification Progress */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            verificationStep === 'idle' ? 'bg-gray-600 text-gray-300' :
            verificationStep === 'checking_group' ? 'bg-blue-500 text-white animate-pulse' :
            verificationStep === 'checking_referral' ? 'bg-blue-500 text-white animate-pulse' :
            'bg-green-500 text-white'
          }`}>
            {verificationStep === 'idle' ? '1' :
             verificationStep === 'checking_group' ? '1' :
             verificationStep === 'checking_referral' ? '2' : '✓'
            }
          </div>
          <span className={`text-sm ${
            verificationStep === 'checking_group' ? 'text-blue-400' : 'text-gray-400'
          }`}>
            {verificationStep === 'checking_group' ? 'Checking group membership...' : 'Group membership'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            verificationStep === 'idle' || verificationStep === 'checking_group' ? 'bg-gray-600 text-gray-300' :
            verificationStep === 'checking_referral' ? 'bg-blue-500 text-white animate-pulse' :
            'bg-green-500 text-white'
          }`}>
            {verificationStep === 'idle' || verificationStep === 'checking_group' ? '2' :
             verificationStep === 'checking_referral' ? '2' : '✓'
            }
          </div>
          <span className={`text-sm ${
            verificationStep === 'checking_referral' ? 'text-blue-400' : 'text-gray-400'
          }`}>
            {verificationStep === 'checking_referral' ? 'Validating referral link...' : 'Referral link validation'}
          </span>
        </div>
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`p-4 rounded-lg border ${
            verificationResult.isValid 
              ? 'border-green-500/30 bg-green-500/10' 
              : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {getVerificationStatusIcon()}
            <h4 className={`font-semibold ${getVerificationStatusColor()}`}>
              {getVerificationStatusText()}
            </h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={verificationResult.groupJoined ? 'text-green-400' : 'text-red-400'}>
                {verificationResult.groupJoined ? '✅' : '❌'}
              </span>
              <span>Group Membership: {verificationResult.groupJoined ? 'Verified' : 'Not Verified'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={verificationResult.referralValid ? 'text-green-400' : 'text-red-400'}>
                {verificationResult.referralValid ? '✅' : '❌'}
              </span>
              <span>Referral Link: {verificationResult.referralValid ? 'Valid' : 'Invalid'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-blue-400">🔗</span>
              <span>Referral Usage: {verificationResult.referralCount} times</span>
            </div>
          </div>

          <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
            <h5 className="font-medium text-gray-300 mb-2">Verification Details:</h5>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
              {verificationResult.details}
            </pre>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={startVerification}
          disabled={isVerifying}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isVerifying
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gold text-navy hover:bg-yellow-400'
          }`}
        >
          {isVerifying ? (
            <div className="flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              Verifying...
            </div>
          ) : (
            'Re-verify'
          )}
        </button>

        {verificationResult && (
          <button
            onClick={() => window.open(`https://t.me/${groupUsername}`, '_blank')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Join Group
          </button>
        )}
      </div>

      {/* Information */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">How verification works</span>
        </div>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Bot checks if you're a member of the required group</li>
          <li>• Validates your referral link and usage count</li>
          <li>• Both conditions must be met for task completion</li>
          <li>• Verification happens in real-time</li>
        </ul>
      </div>
    </div>
  );
} 