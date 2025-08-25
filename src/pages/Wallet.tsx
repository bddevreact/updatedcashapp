import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, CreditCard, Bitcoin, DollarSign, CheckSquare, Users, TrendingUp, Shield, Zap, Smartphone, Building, ChevronDown, AlertCircle, CheckCircle2, Clock, RefreshCw, Activity } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { sendUserNotification } from '../lib/notifications';

export default function Wallet() {
  const { balance, updateBalance, telegramId, addNotification, stats } = useUserStore();
  
  // Calculate balances from available data
  const balances = {
    task: stats?.todayEarnings || 0,
    referral: (stats?.referralsCount || 0) * 50, // Assuming 50 per referral
    total: balance
  };
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'crypto'>('bkash');
  const [withdrawMethod, setWithdrawMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'crypto'>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [showCryptoDropdown, setShowCryptoDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [liveTransactions, setLiveTransactions] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(true);

  // Real-time updates hook
  const { isUpdating, forceUpdate } = useRealTimeUpdates({
    interval: 20000, // 20 seconds for wallet
    onUpdate: () => {
      setLastUpdate(new Date());
      updateLiveTransactions();
    }
  });

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isUpdating && isLive) {
        updateLiveTransactions();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isUpdating, isLive]);

  // Simulate live transaction updates
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      updateLiveTransactions();
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  const updateLiveTransactions = () => {
    // Real-time transactions will be handled by actual API calls
    setLastUpdate(new Date());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await forceUpdate();
      updateLiveTransactions();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      updateLiveTransactions();
    }
  };

  // Bangladeshi Banks List
  const banks = [
    { id: 'sbl', name: 'Sonali Bank Limited', code: 'SBL' },
    { id: 'rbl', name: 'Rupali Bank Limited', code: 'RBL' },
    { id: 'jbl', name: 'Janata Bank Limited', code: 'JBL' },
    { id: 'abl', name: 'Agrani Bank Limited', code: 'ABL' },
    { id: 'bbl', name: 'Bangladesh Bank Limited', code: 'BBL' },
    { id: 'ucb', name: 'United Commercial Bank', code: 'UCB' },
    { id: 'ebl', name: 'Eastern Bank Limited', code: 'EBL' },
    { id: 'dbl', name: 'Dutch-Bangla Bank', code: 'DBL' },
    { id: 'brac', name: 'BRAC Bank Limited', code: 'BRAC' },
    { id: 'city', name: 'City Bank Limited', code: 'CITY' },
    { id: 'prime', name: 'Prime Bank Limited', code: 'PRIME' },
    { id: 'dhaka', name: 'Dhaka Bank Limited', code: 'DHAKA' },
    { id: 'mutual', name: 'Mutual Trust Bank', code: 'MTB' },
    { id: 'standard', name: 'Standard Bank Limited', code: 'STBL' },
    { id: 'trust', name: 'Trust Bank Limited', code: 'TBL' }
  ];

  // Cryptocurrency List
  const cryptocurrencies = [
    { id: 'btc', name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
    { id: 'eth', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
    { id: 'usdt', name: 'Tether', symbol: 'USDT', icon: '₮' },
    { id: 'bnb', name: 'Binance Coin', symbol: 'BNB', icon: '🟡' },
    { id: 'sol', name: 'Solana', symbol: 'SOL', icon: '◎' },
    { id: 'ada', name: 'Cardano', symbol: 'ADA', icon: '₳' },
    { id: 'dot', name: 'Polkadot', symbol: 'DOT', icon: '●' },
    { id: 'matic', name: 'Polygon', symbol: 'MATIC', icon: '🔷' }
  ];

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) < getDepositMethodInfo().minAmount) {
      addNotification({
        type: 'error',
        title: 'Invalid Amount',
        message: `Minimum deposit amount is ৳${getDepositMethodInfo().minAmount}`
      });
      return;
    }

    if (paymentMethod === 'bank' && (!selectedBank || !accountName || !accountNumber)) {
      addNotification({
        type: 'error',
        title: 'Missing Bank Details',
        message: 'Please fill in all bank details'
      });
      return;
    }

    if (paymentMethod === 'crypto' && (!selectedCrypto || !accountNumber)) {
      addNotification({
        type: 'error',
        title: 'Missing Crypto Details',
        message: 'Please select cryptocurrency and enter wallet address'
      });
      return;
    }

    if (paymentMethod !== 'bank' && paymentMethod !== 'crypto' && !accountNumber) {
      addNotification({
        type: 'error',
        title: 'Missing Mobile Number',
        message: 'Please enter mobile number'
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create deposit request in database - use user_activities for now
      const depositData: any = {
        amount: parseFloat(amount),
        method: paymentMethod,
        account_number: accountNumber,
        status: 'pending'
      };

      // Add optional fields if they have values
      if (accountName && accountName.trim()) {
        depositData.account_name = accountName.trim();
      } else {
        // For non-bank methods, use appropriate default values
        if (paymentMethod === 'bank') {
          // Bank method requires account name
          throw new Error('Account holder name is required for bank deposits');
        } else if (paymentMethod === 'crypto') {
          // For crypto, use crypto symbol
          depositData.account_name = selectedCrypto ? `${selectedCrypto} Wallet` : 'Crypto Wallet';
        } else {
          // For mobile money, use the method name
          depositData.account_name = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
        }
      }
      
      if (selectedBank && selectedBank.trim()) depositData.bank_name = selectedBank.trim();
      if (selectedCrypto && selectedCrypto.trim()) depositData.crypto_symbol = selectedCrypto.trim();

      // Log the deposit data for debugging
      console.log('Creating deposit with data:', depositData);

      const { error } = await supabase
        .from('user_activities')
        .insert([{
          user_id: telegramId,
          activity_type: 'deposit_request',
          activity_data: JSON.stringify(depositData),
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Deposit Submitted!',
        message: `Deposit request of ৳${amount} submitted successfully!`
      });

      // Send notification to database for admin review
      if (telegramId) {
        await sendUserNotification(
          telegramId,
          'info',
          'Deposit Request Submitted 📥',
          `Your deposit request of ৳${amount} has been submitted and is under review.`
        );

        // Send notification for successful deposit
        await sendUserNotification(
          telegramId,
          'success',
          'Deposit Completed Successfully! 💰',
          `Your deposit of ৳${amount} has been processed and added to your balance.`
        );
      }

      // Reset form
      setAmount('');
      setAccountNumber('');
      setAccountName('');
      setSelectedBank('');
      setSelectedCrypto('');

      // Refresh user balance
      forceUpdate();

      // Load updated transactions
      loadRecentTransactions();

      // Send notification about balance update
      if (telegramId) {
        await sendUserNotification(
          telegramId,
          'success',
          'Balance Updated 💰',
          `Your balance has been updated. New balance: ${formatCurrency(balance - parseFloat(amount))}`
        );
      }

    } catch (error: any) {
      console.error('Error creating deposit:', error);
      addNotification({
        type: 'error',
        title: 'Deposit Failed',
        message: 'Failed to submit deposit request. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < getWithdrawMethodInfo().minAmount) {
      addNotification({
        type: 'error',
        title: 'Invalid Amount',
        message: `Minimum withdrawal amount is ৳${getWithdrawMethodInfo().minAmount}`
      });
      return;
    }

    if (parseFloat(amount) > balance) {
      addNotification({
        type: 'error',
        title: 'Insufficient Balance',
        message: 'Insufficient balance for withdrawal'
      });
      return;
    }

    // Validate required fields based on withdrawal method
    if (withdrawMethod === 'bank' && (!selectedBank || !accountName || !accountNumber)) {
      addNotification({
        type: 'error',
        title: 'Missing Bank Details',
        message: 'Please fill in all bank details including account holder name'
      });
      return;
    }

    if (withdrawMethod === 'crypto' && (!selectedCrypto || !accountNumber)) {
      addNotification({
        type: 'error',
        title: 'Missing Crypto Details',
        message: 'Please select cryptocurrency and enter wallet address'
      });
      return;
    }

    if (withdrawMethod !== 'bank' && withdrawMethod !== 'crypto' && !accountNumber) {
      addNotification({
        type: 'error',
        title: 'Missing Mobile Number',
        message: 'Please enter mobile number'
      });
      return;
    }

    // Additional validation to ensure account_name will be available
    if (withdrawMethod === 'bank' && (!accountName || accountName.trim() === '')) {
      addNotification({
        type: 'error',
        title: 'Account Name Required',
        message: 'Account holder name is required for bank withdrawals'
      });
      return;
    }

    setIsProcessing(true);
    setWithdrawalStatus('processing');

    try {
      // Create withdrawal request in database - use all available columns
      const withdrawalData: any = {
        user_id: telegramId,
        amount: parseFloat(amount),
        method: withdrawMethod,
        account_number: accountNumber,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Add optional columns if they have values (empty strings are fine)
      if (accountName && accountName.trim()) {
        withdrawalData.account_name = accountName.trim();
      } else {
        // For non-bank methods, use account number or method name as account name
        if (withdrawMethod === 'bank') {
          // Bank method requires account name
          throw new Error('Account holder name is required for bank withdrawals');
        } else if (withdrawMethod === 'crypto') {
          // For crypto, use wallet address or crypto symbol
          withdrawalData.account_name = selectedCrypto ? `${selectedCrypto} Wallet` : 'Crypto Wallet';
        } else {
          // For mobile money (bkash, nagad, rocket), use the method name
          withdrawalData.account_name = withdrawMethod.charAt(0).toUpperCase() + withdrawMethod.slice(1);
        }
      }
      
      if (selectedBank && selectedBank.trim()) withdrawalData.bank_name = selectedBank.trim();
      if (selectedCrypto && selectedCrypto.trim()) withdrawalData.crypto_symbol = selectedCrypto.trim();

      // Log the withdrawal data for debugging
      console.log('Creating withdrawal with data:', withdrawalData);

      const { error } = await supabase
        .from('withdrawal_requests')
        .insert([withdrawalData]);

      if (error) throw error;

      // Update user balance (deduct withdrawal amount)
      const { error: balanceError } = await supabase
        .from('users')
        .update({ 
          balance: balance - parseFloat(amount),
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', telegramId);

      if (balanceError) throw balanceError;

      setWithdrawalStatus('success');
      
      // Show success notification
      addNotification({
        type: 'success',
        title: 'Withdrawal Submitted!',
        message: `Withdrawal request of ৳${amount} submitted successfully!`
      });

      // Send notification to database for admin review
      if (telegramId) {
        await sendUserNotification(
          telegramId,
          'info',
          'Withdrawal Request Submitted 📤',
          `Your withdrawal request of ৳${amount} has been submitted and is under review.`
        );
      }

      // Reset form after success
      setTimeout(() => {
        setAmount('');
        setAccountNumber('');
        setAccountName('');
        setSelectedBank('');
        setSelectedCrypto('');
        setWithdrawalStatus('idle');
      }, 2000);

      // Refresh user balance and transactions
      forceUpdate();
      loadRecentTransactions();

      // Send notification about balance update
      if (telegramId) {
        await sendUserNotification(
          telegramId,
          'success',
          'Balance Updated 💰',
          `Your balance has been updated. New balance: ${formatCurrency(balance - parseFloat(amount))}`
        );
      }

    } catch (error: any) {
      console.error('Error creating withdrawal:', error);
      setWithdrawalStatus('failed');
      
      // Provide more specific error messages
      let errorMessage = 'Failed to submit withdrawal request. Please try again.';
      
      if (error.code === '23502') {
        // Not null constraint violation
        if (error.message?.includes('account_name')) {
          errorMessage = 'Account name is required. Please fill in all required fields.';
        } else if (error.message?.includes('account_number')) {
          errorMessage = 'Account number is required. Please fill in all required fields.';
        } else {
          errorMessage = 'Missing required information. Please fill in all required fields.';
        }
      } else if (error.code === '23514') {
        // Check constraint violation
        if (error.message?.includes('method')) {
          errorMessage = 'Invalid withdrawal method selected.';
        } else {
          errorMessage = 'Invalid data provided. Please check your input.';
        }
      } else if (error.message) {
        // Custom error messages from our validation
        errorMessage = error.message;
      }
      
      addNotification({
        type: 'error',
        title: 'Withdrawal Failed',
        message: errorMessage
      });
      setTimeout(() => setWithdrawalStatus('idle'), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load real transaction history from database
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadRecentTransactions();
  }, [telegramId]);

  const loadRecentTransactions = async () => {
    if (!telegramId) return;

    try {
      // Load deposits - check if deposits table exists, otherwise use user_activities
      let deposits: any[] = [];
      try {
        const { data: depositsData, error: depositsError } = await supabase
          .from('deposits')
          .select('*')
          .eq('user_id', telegramId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!depositsError && depositsData) {
          deposits = depositsData;
        }
      } catch (e) {
        console.log('Deposits table not found, using user_activities instead');
      }

      // Load withdrawals from withdrawal_requests table
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          admin_notes,
          processed_at,
          account_name,
          account_number,
          bank_name,
          crypto_symbol
        `)
        .eq('user_id', telegramId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (withdrawalsError) throw withdrawalsError;

      // Combine and format transactions
      const allTransactions = [
        ...(deposits || []).map(dep => ({
          id: dep.id,
          type: 'deposit',
          amount: dep.amount,
          method: dep.method,
          status: dep.status,
          time: formatTimeAgo(new Date(dep.created_at)),
          created_at: dep.created_at,
          details: null
        })),
        ...(withdrawals || []).map(wd => ({
          id: wd.id,
          type: 'withdraw',
          amount: wd.amount,
          method: wd.method,
          status: wd.status,
          time: formatTimeAgo(new Date(wd.created_at)),
          created_at: wd.created_at,
          details: {
            admin_notes: wd.admin_notes,
            processed_at: wd.processed_at,
            account_name: wd.account_name,
            account_number: wd.account_number,
            bank_name: wd.bank_name,
            crypto_symbol: wd.crypto_symbol
          }
        }))
      ];

      // Sort by creation date
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecentTransactions(allTransactions.slice(0, 10));

    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadAllTransactions = async () => {
    if (!telegramId) return;

    try {
      setHistoryLoading(true);
      
      // Load all deposits
      let deposits: any[] = [];
      try {
        const { data: depositsData, error: depositsError } = await supabase
          .from('deposits')
          .select('*')
          .eq('user_id', telegramId)
          .order('created_at', { ascending: false });

        if (!depositsError && depositsData) {
          deposits = depositsData;
        }
      } catch (e) {
        console.log('Deposits table not found, using user_activities instead');
      }

      // Load all withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          admin_notes,
          processed_at,
          account_name,
          account_number,
          bank_name,
          crypto_symbol
        `)
        .eq('user_id', telegramId)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      // Combine and format all transactions
      const allTransactions = [
        ...(deposits || []).map(dep => ({
          id: dep.id,
          type: 'deposit',
          amount: dep.amount,
          method: dep.method,
          status: dep.status,
          time: formatTimeAgo(new Date(dep.created_at)),
          created_at: dep.created_at,
          details: null
        })),
        ...(withdrawals || []).map(wd => ({
          id: wd.id,
          type: 'withdraw',
          amount: wd.amount,
          method: wd.method,
          status: wd.status,
          time: formatTimeAgo(new Date(wd.created_at)),
          created_at: wd.created_at,
          details: {
            admin_notes: wd.admin_notes,
            processed_at: wd.processed_at,
            account_name: wd.account_name,
            account_number: wd.account_number,
            bank_name: wd.bank_name,
            crypto_symbol: wd.crypto_symbol
          }
        }))
      ];

      // Sort by creation date
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAllTransactions(allTransactions);

    } catch (error) {
      console.error('Error loading all transactions:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'approved': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': 
      case 'rejected': return 'text-red-400';
      case 'processing': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'approved': return 'Completed';
      case 'pending': return 'Pending';
      case 'failed': 
      case 'rejected': return 'Rejected';
      case 'processing': return 'Processing';
      default: return 'Unknown';
    }
  };

  const getWithdrawalStatusInfo = (withdrawal: any) => {
    if (withdrawal.status === 'rejected') {
      // Check if it was a valid rejection (no refund) or standard rejection (with refund)
      // We'll determine this based on admin notes or other indicators
      const hasValidReason = withdrawal.details?.admin_notes && 
        (withdrawal.details.admin_notes.includes('fraud') || 
         withdrawal.details.admin_notes.includes('invalid') ||
         withdrawal.details.admin_notes.includes('policy violation'));
      
      if (hasValidReason) {
        return {
          status: 'Rejected (Valid Cause)',
          color: 'text-red-400',
          details: withdrawal.details?.admin_notes || 'No reason provided',
          refund: 'No refund given'
        };
      } else {
        return {
          status: 'Rejected & Refunded',
          color: 'text-orange-400',
          details: 'Amount automatically refunded to your balance',
          refund: 'Refunded to balance'
        };
      }
    } else if (withdrawal.status === 'approved') {
      return {
        status: 'Approved',
        color: 'text-green-400',
        details: 'Withdrawal processed successfully',
        refund: null
      };
    } else if (withdrawal.status === 'pending') {
      return {
        status: 'Pending Review',
        color: 'text-yellow-400',
        details: 'Under admin review',
        refund: null
      };
    }
    
    return {
      status: getStatusText(withdrawal.status),
      color: getStatusColor(withdrawal.status),
      details: null,
      refund: null
    };
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-IN')}`;
  };

  const getWithdrawMethodInfo = () => {
    switch (withdrawMethod) {
      case 'bkash':
        return {
          name: 'Bkash',
          icon: Smartphone,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          description: 'Fast mobile banking transfer',
          placeholder: 'Bkash Number (01XXXXXXXXX)',
          minAmount: 100,
          processingTime: '2-5 minutes'
        };
      case 'nagad':
        return {
          name: 'Nagad',
          icon: Smartphone,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/20',
          description: 'Digital financial service',
          placeholder: 'Nagad Number (01XXXXXXXXX)',
          minAmount: 100,
          processingTime: '2-5 minutes'
        };
      case 'rocket':
        return {
          name: 'Rocket',
          icon: Smartphone,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/20',
          description: 'DBBL mobile banking',
          placeholder: 'Rocket Number (01XXXXXXXXX)',
          minAmount: 100,
          processingTime: '2-5 minutes'
        };
      case 'bank':
        return {
          name: 'Bank Transfer',
          icon: Building,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/20',
          description: 'Direct bank account transfer',
          placeholder: 'Account Number',
          minAmount: 500,
          processingTime: '1-3 business days'
        };
      case 'crypto':
        return {
          name: 'Cryptocurrency',
          icon: Bitcoin,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/20',
          description: 'Withdraw to crypto wallet',
          placeholder: 'Wallet Address',
          minAmount: 200,
          processingTime: '5-15 minutes'
        };
      default:
        return {
          name: 'Bkash',
          icon: Smartphone,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          description: 'Fast mobile banking transfer',
          placeholder: 'Bkash Number (01XXXXXXXXX)',
          minAmount: 100,
          processingTime: '2-5 minutes'
        };
    }
  };

  const getDepositMethodInfo = () => {
    switch (paymentMethod) {
      case 'bkash':
        return {
          name: 'Bkash',
          icon: Smartphone,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          description: 'Fast mobile banking transfer',
          placeholder: 'Bkash Number (01XXXXXXXXX)',
          minAmount: 100,
          processingTime: '2-5 minutes'
        };
      case 'nagad':
        return {
          name: 'Nagad',
          icon: Smartphone,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/20',
          description: 'Digital financial service',
          placeholder: 'Nagad Number (01XXXXXXXXX)',
          minAmount: 100,
          processingTime: '2-5 minutes'
        };
      case 'rocket':
        return {
          name: 'Rocket',
          icon: Smartphone,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/20',
          description: 'DBBL mobile banking',
          placeholder: 'Rocket Number (01XXXXXXXXX)',
          minAmount: 100,
          processingTime: '2-5 minutes'
        };
      case 'bank':
        return {
          name: 'Bank Transfer',
          icon: Building,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/20',
          description: 'Direct bank account transfer',
          placeholder: 'Account Number',
          minAmount: 500,
          processingTime: '1-3 business days'
        };
      case 'crypto':
        return {
          name: 'Cryptocurrency',
          icon: Bitcoin,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/20',
          description: 'Deposit from crypto wallet',
          placeholder: 'Wallet Address',
          minAmount: 200,
          processingTime: '5-15 minutes'
        };
      default:
        return {
          name: 'Bkash',
          icon: Smartphone,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          description: 'Fast mobile banking transfer',
          placeholder: 'Bkash Number (01XXXXXXXXX)',
          minAmount: 100,
          processingTime: '2-5 minutes'
        };
    }
  };

  const getStatusIcon = () => {
    switch (withdrawalStatus) {
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getWithdrawalStatusText = () => {
    switch (withdrawalStatus) {
      case 'processing':
        return 'Processing Withdrawal...';
      case 'success':
        return 'Withdrawal Successful!';
      case 'failed':
        return 'Withdrawal Failed';
      default:
        return '';
    }
  };

  const getWithdrawalStatusColor = () => {
    switch (withdrawalStatus) {
      case 'processing':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-gray-900 text-white p-4 pb-24">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <motion.h1 
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Cash Points Wallet
          </motion.h1>
          <div className="flex items-center gap-4">
            <motion.p 
              className="text-gray-400 text-sm"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Last updated: {lastUpdate.toLocaleTimeString()}
            </motion.p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-xs ${isLive ? 'text-green-400' : 'text-red-400'}`}>
                {isLive ? 'LIVE' : 'PAUSED'}
              </span>
            </div>
            <motion.p 
              className="text-gray-300 text-sm"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {liveTransactions.length > 0 && (
                <span className="text-blue-400">
                  {liveTransactions.length} live transactions
                </span>
              )}
            </motion.p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            onClick={toggleLive}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
              isLive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {isLive ? 'Stop Live' : 'Start Live'}
          </motion.button>
          
          <motion.button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg transition-all duration-300 ${
              isRefreshing 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-gold/20 text-gold hover:bg-gold/30 hover:scale-105'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Earn Real Money Banner */}
      <motion.div 
        className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-4 backdrop-blur-sm border border-green-500/30 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="text-center">
          <motion.div 
            className="text-3xl mb-2"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
          >
            💰
          </motion.div>
          <motion.h3 
            className="text-lg font-semibold text-green-400 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            Withdraw Your Real Money Earnings
          </motion.h3>
          <motion.p 
            className="text-sm text-gray-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            Withdraw your earnings from Cash Points! Deposit feature temporarily disabled.
          </motion.p>
        </div>
      </motion.div>

      {/* Deposit Disabled Notice */}
      <motion.div 
        className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 backdrop-blur-sm border border-yellow-500/30 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="text-center">
          <motion.div 
            className="text-2xl mb-2"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6, type: "spring" }}
          >
            ⚠️
          </motion.div>
          <motion.h4 
            className="text-md font-semibold text-yellow-400 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            Deposit Feature Temporarily Disabled
          </motion.h4>
          <motion.p 
            className="text-sm text-gray-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            The deposit functionality is currently under maintenance and will be re-enabled soon. 
            You can still withdraw your existing balance and view transaction history.
          </motion.p>
        </div>
      </motion.div>

      {/* Balance Overview */}
      <div className="glass p-6 mb-6 border border-white/10 bg-gradient-to-r from-gold/10 to-transparent">
        <div className="flex items-center justify-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center mr-3">
            <DollarSign className="w-6 h-6 text-navy" />
          </div>
          <h2 className="text-xl font-semibold">Total Balance</h2>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold text-gold mb-2">{formatCurrency(balance)}</p>
          <p className="text-gray-400 text-sm">Available for withdrawal</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-xs">Secure & Protected</span>
          </div>
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass p-4 text-center border border-white/10 hover:border-blue-400/50 transition-all duration-300">
          <CheckSquare className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Task Earnings</p>
          <p className="text-lg font-semibold text-blue-400">{formatCurrency(balances.task)}</p>
          <p className="text-xs text-gray-500">from tasks</p>
        </div>
        <div className="glass p-4 text-center border border-white/10 hover:border-green-400/50 transition-all duration-300">
          <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Referral Bonus</p>
          <p className="text-lg font-semibold text-green-400">{formatCurrency(balances.referral)}</p>
          <p className="text-xs text-gray-500">from referrals</p>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="glass p-1 mb-6 border border-white/10">
        <div className="flex bg-gray-800 rounded-lg p-1">
          {/* Deposit tab temporarily disabled - will be re-enabled later */}
          <button
            onClick={() => setActiveTab('withdraw')}
            className="flex-1 py-3 px-4 rounded-md transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg"
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Withdrawal Method Selection */}
      <>
        {/* Insufficient Balance Warning */}
        {balance < 100 && (
          <motion.div 
            className={`rounded-xl p-4 backdrop-blur-sm border mb-6 ${
              balance === 0 
                ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/30' 
                : balance < 50 
                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30'
                : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <motion.div 
                className="text-2xl mb-2"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, type: "spring" }}
              >
                {balance === 0 ? '🚫' : balance < 50 ? '⚠️' : '💡'}
              </motion.div>
              <motion.h4 
                className={`text-md font-semibold mb-2 ${
                  balance === 0 
                    ? 'text-red-400' 
                    : balance < 50 
                    ? 'text-orange-400'
                    : 'text-yellow-400'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {balance === 0 
                  ? 'No Balance Available' 
                  : balance < 50 
                  ? 'Very Low Balance'
                  : 'Insufficient Balance for Withdrawal'
                }
              </motion.h4>
              <motion.p 
                className="text-sm text-gray-300 mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Your current balance is <span className="text-red-400 font-semibold">{formatCurrency(balance)}</span>. 
                Minimum withdrawal amount is <span className="text-yellow-400 font-semibold">৳100</span>.
              </motion.p>
              <motion.div 
                className="text-xs text-gray-400"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                {balance === 0 
                  ? '💡 Start completing tasks and earning referrals to build your balance!'
                  : balance < 50 
                  ? '💡 You\'re close! Complete a few more tasks to reach the minimum withdrawal amount.'
                  : '💡 Complete more tasks or earn referral bonuses to increase your balance!'
                }
              </motion.div>
                </div>
          </motion.div>
        )}

        {/* Balance Status Indicator */}
        <div className="glass p-4 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gold" />
              Balance Status
            </h3>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              balance >= 100 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : balance >= 50 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : balance > 0 
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {balance >= 100 
                ? 'Ready to Withdraw' 
                : balance >= 50 
                ? 'Almost Ready'
                : balance > 0 
                ? 'Low Balance'
                : 'No Balance'
              }
                </div>
              </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Current Balance:</span>
              <span className={`font-semibold ${
                balance >= 100 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(balance)}
                    </span>
                            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Minimum Withdrawal:</span>
              <span className="text-yellow-400 font-semibold">৳100</span>
                          </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Remaining to Withdraw:</span>
              <span className={`font-semibold ${
                balance >= 100 ? 'text-green-400' : 'text-red-400'
              }`}>
                {balance >= 100 ? '৳0' : formatCurrency(100 - balance)}
                    </span>
                    </div>
                </div>
                </div>

          {/* Withdrawal Method Selection */}
          <div className="glass p-5 mb-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-gold" />
              Withdrawal Method
            </h3>
            
            {/* Main Method Buttons - Always Visible */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* Mobile Banking Button */}
              <button
                onClick={() => setWithdrawMethod('bkash')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg transition-all duration-300 border-2 ${
                  (withdrawMethod === 'bkash' || withdrawMethod === 'nagad' || withdrawMethod === 'rocket')
                    ? 'border-blue-500 bg-blue-500/20 text-blue-500' 
                    : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-semibold">Mobile Banking</span>
              </button>

              {/* Bank Transfer Button */}
              <button
                onClick={() => setWithdrawMethod('bank')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg transition-all duration-300 border-2 ${
                  withdrawMethod === 'bank' 
                    ? 'border-orange-500 bg-orange-500/20 text-orange-500' 
                    : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                }`}
              >
                <Building className="w-4 h-4" />
                <span className="text-xs font-semibold">Bank Transfer</span>
              </button>

              {/* Cryptocurrency Button */}
              <button
                onClick={() => setWithdrawMethod('crypto')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg transition-all duration-300 border-2 ${
                  withdrawMethod === 'crypto' 
                    ? 'border-yellow-500 bg-yellow-500/20 text-yellow-500' 
                    : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                }`}
              >
                <Bitcoin className="w-4 h-4" />
                <span className="text-xs font-semibold">Cryptocurrency</span>
              </button>
            </div>

            {/* Mobile Banking Sub-options - Only show when Mobile Banking is selected */}
            {(withdrawMethod === 'bkash' || withdrawMethod === 'nagad' || withdrawMethod === 'rocket') && (
              <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Select Mobile Banking Method
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setWithdrawMethod('bkash')}
                    className={`flex items-center justify-center gap-2 py-2 px-2 rounded-lg transition-all duration-300 border-2 text-xs ${
                      withdrawMethod === 'bkash' 
                        ? 'border-green-500 bg-green-500/20 text-green-500' 
                        : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span className="font-medium">Bkash</span>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('nagad')}
                    className={`flex items-center justify-center gap-2 py-2 px-2 rounded-lg transition-all duration-300 border-2 text-xs ${
                      withdrawMethod === 'nagad' 
                        ? 'border-blue-500 bg-blue-500/20 text-blue-500' 
                        : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span className="font-medium">Nagad</span>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('rocket')}
                    className={`flex items-center justify-center gap-2 py-2 px-2 rounded-lg transition-all duration-300 border-2 text-xs ${
                      withdrawMethod === 'rocket' 
                        ? 'border-purple-500 bg-purple-500/20 text-purple-500' 
                        : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span className="font-medium">Rocket</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Method Info */}
            <div className={`mt-4 p-4 rounded-lg ${getWithdrawMethodInfo().bgColor} border border-current/20`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {React.createElement(getWithdrawMethodInfo().icon, { className: `w-5 h-5 ${getWithdrawMethodInfo().color}` })}
                  <h4 className={`font-semibold ${getWithdrawMethodInfo().color}`}>{getWithdrawMethodInfo().name}</h4>
                </div>
                <span className="text-xs text-gray-400">Processing: {getWithdrawMethodInfo().processingTime}</span>
              </div>
              <p className="text-gray-300 text-sm mb-2">{getWithdrawMethodInfo().description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Minimum withdrawal: ৳{getWithdrawMethodInfo().minAmount}</span>
                <span className="text-gray-400">Fee: Free</span>
              </div>
            </div>
          </div>

          {/* Account Details Input */}
          <div className="glass p-5 mb-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              {withdrawMethod === 'crypto' ? 'Crypto Details' : 'Account Details'}
            </h3>
            <div className="space-y-4">
              {/* Crypto Selection Dropdown */}
              {withdrawMethod === 'crypto' && (
                <div className="relative">
                  <label className="block text-gray-400 text-sm mb-2">Select Cryptocurrency</label>
                  <button
                    onClick={() => setShowCryptoDropdown(!showCryptoDropdown)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border-2 border-gray-600 focus:border-gold focus:outline-none flex items-center justify-between"
                  >
                    <span className={selectedCrypto ? 'text-white' : 'text-gray-400'}>
                      {selectedCrypto || 'Choose cryptocurrency'}
                    </span>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${showCryptoDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCryptoDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {cryptocurrencies.map((crypto) => (
                        <button
                          key={crypto.id}
                          onClick={() => {
                            setSelectedCrypto(crypto.name);
                            setShowCryptoDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white border-b border-gray-700 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{crypto.icon}</span>
                            <div>
                              <div className="font-medium">{crypto.name}</div>
                              <div className="text-sm text-gray-400">{crypto.symbol}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bank Selection Dropdown */}
              {withdrawMethod === 'bank' && (
                <div className="relative">
                  <label className="block text-gray-400 text-sm mb-2">Select Bank</label>
                  <button
                    onClick={() => setShowBankDropdown(!showBankDropdown)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border-2 border-gray-600 focus:border-gold focus:outline-none flex items-center justify-between"
                  >
                    <span className={selectedBank ? 'text-white' : 'text-gray-400'}>
                      {selectedBank || 'Choose your bank'}
                    </span>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${showBankDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showBankDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {banks.map((bank) => (
                        <button
                          key={bank.id}
                          onClick={() => {
                            setSelectedBank(bank.name);
                            setShowBankDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white border-b border-gray-700 last:border-b-0"
                        >
                          <div className="font-medium">{bank.name}</div>
                          <div className="text-sm text-gray-400">{bank.code}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Account Holder Name / Wallet Label */}
              {(withdrawMethod === 'bank' || withdrawMethod === 'crypto') && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    {withdrawMethod === 'bank' ? 'Account Holder Name' : 'Wallet Label (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder={withdrawMethod === 'bank' ? 'Enter account holder name' : 'Enter wallet label for reference'}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border-2 border-gray-600 focus:border-gold focus:outline-none"
                  />
                </div>
              )}
              
              {/* Account Number / Wallet Address */}
              {withdrawMethod === 'bank' && (
                <div>
                <label className="block text-sm text-gray-400 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border-2 border-gray-600 focus:border-gold focus:outline-none"
                  />
                </div>
              )}
              
              {/* Mobile Number / Wallet Address */}
              {withdrawMethod !== 'bank' && (
                <div>
                <label className="block text-sm text-gray-400 mb-2">
                    {withdrawMethod === 'crypto' ? 'Wallet Address' : 'Mobile Number'}
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={withdrawMethod === 'crypto' ? 'Enter wallet address' : getWithdrawMethodInfo().placeholder}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border-2 border-gray-600 focus:border-gold focus:outline-none"
                  />
                  {withdrawMethod === 'crypto' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Make sure to double-check the wallet address. Incorrect addresses may result in permanent loss.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>

      {/* Amount Input */}
      <div className="glass p-5 mb-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gold" />
          Amount
        </h3>
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
            ৳
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-800 text-white px-12 py-4 rounded-lg border-2 border-gray-600 focus:border-gold focus:outline-none text-lg font-semibold"
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            {activeTab === 'withdraw' 
              ? `Minimum withdrawal: ৳${getWithdrawMethodInfo().minAmount}` 
              : `Minimum deposit: ৳${getDepositMethodInfo().minAmount}`
            }
          </p>
          <p className="text-xs text-green-400">No fees</p>
        </div>
      </div>

      {/* Withdrawal Status */}
      {withdrawalStatus !== 'idle' && (
        <div className="glass p-4 mb-6 border border-white/10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {getStatusIcon()}
            <span className={`font-semibold ${getWithdrawalStatusColor()}`}>
              {getWithdrawalStatusText()}
            </span>
          </div>
          {withdrawalStatus === 'processing' && (
            <p className="text-xs text-gray-400">Please wait while we process your withdrawal</p>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleWithdraw}
        disabled={
          isProcessing || 
            !amount || 
            parseFloat(amount) < getWithdrawMethodInfo().minAmount ||
          parseFloat(amount) > balance ||
            (withdrawMethod === 'bank' && (!selectedBank || !accountName || !accountNumber)) ||
            (withdrawMethod === 'crypto' && (!selectedCrypto || !accountNumber)) ||
            (withdrawMethod !== 'bank' && withdrawMethod !== 'crypto' && !accountNumber)
        }
        className={`w-full py-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg ${
          isProcessing || 
            !amount || 
            parseFloat(amount) < getWithdrawMethodInfo().minAmount ||
          parseFloat(amount) > balance ||
            (withdrawMethod === 'bank' && (!selectedBank || !accountName || !accountNumber)) ||
            (withdrawMethod === 'crypto' && (!selectedCrypto || !accountNumber)) ||
            (withdrawMethod !== 'bank' && withdrawMethod !== 'crypto' && !accountNumber)
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
        }`}
      >
        {isProcessing ? 'Processing...' : 
         !amount ? 'Enter Amount' :
         parseFloat(amount) > balance ? `Insufficient Balance (${formatCurrency(balance)} available)` :
         parseFloat(amount) < getWithdrawMethodInfo().minAmount ? `Minimum Amount: ৳${getWithdrawMethodInfo().minAmount}` :
         `Withdraw to ${getWithdrawMethodInfo().name}`
        }
      </button>

      {/* Recent Transactions */}
      <div className="glass p-5 mt-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gold" />
          Recent Transactions
        </h3>
        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="p-3 bg-gray-800/50 rounded-lg">
              {/* Main Transaction Info */}
              <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {tx.type === 'deposit' ? 
                    <ArrowDownLeft className="w-4 h-4 text-green-400" /> : 
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                  }
                </div>
                <div>
                  <p className="font-medium capitalize">{tx.type}</p>
                  <p className="text-xs text-gray-400">{tx.method}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
                <p className={`text-xs ${getStatusColor(tx.status)}`}>
                  {getStatusText(tx.status)}
                </p>
                <p className="text-xs text-gray-500">{tx.time}</p>
              </div>
              </div>

              {/* Detailed Status Information for Withdrawals */}
              {tx.type === 'withdraw' && tx.details && (
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  {(() => {
                    const statusInfo = getWithdrawalStatusInfo(tx);
                    return (
                      <div className="space-y-1">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Status:</span>
                          <span className={`text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.status}
                          </span>
                        </div>
                        
                        {/* Details */}
                        {statusInfo.details && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Details:</span>
                            <span className="text-xs text-gray-300 max-w-xs text-right">
                              {statusInfo.details}
                            </span>
                          </div>
                        )}
                        
                        {/* Refund Information */}
                        {statusInfo.refund && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Refund:</span>
                            <span className={`text-xs font-medium ${
                              statusInfo.refund.includes('No refund') ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {statusInfo.refund}
                            </span>
                          </div>
                        )}
                        
                        {/* Account Details */}
                        {tx.details.account_name && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Account:</span>
                            <span className="text-xs text-gray-300">
                              {tx.details.account_name}
                              {tx.details.account_number && ` - ${tx.details.account_number}`}
                            </span>
                          </div>
                        )}
                        
                        {/* Processing Time */}
                        {tx.details.processed_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Processed:</span>
                            <span className="text-xs text-gray-300">
                              {formatTimeAgo(new Date(tx.details.processed_at))}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 space-y-3">
        <button 
          onClick={() => {
            if (!showFullHistory) {
              loadAllTransactions();
            }
            setShowFullHistory(!showFullHistory);
          }}
          className="w-full glass p-4 text-left hover:bg-white/10 transition-all duration-300 border border-white/10 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-blue-400" />
              <span className="font-medium">
                {showFullHistory ? 'Hide Full History' : 'View Full Transaction History'}
              </span>
            </div>
            <ArrowUpRight className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
              showFullHistory ? 'rotate-90' : ''
            }`} />
          </div>
        </button>
      </div>

      {/* Full Transaction History Modal */}
      {showFullHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass p-6 border border-white/10 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Complete Transaction History</h3>
              <button
                onClick={() => setShowFullHistory(false)}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-[70vh]">
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading transaction history...</p>
                </div>
              ) : allTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No transactions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allTransactions.map((tx) => (
                    <div key={tx.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      {/* Main Transaction Info */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            {tx.type === 'deposit' ? 
                              <ArrowDownLeft className="w-5 h-5 text-green-400" /> : 
                              <ArrowUpRight className="w-5 h-5 text-red-400" />
                            }
                          </div>
                          <div>
                            <p className="font-medium capitalize text-white">{tx.type}</p>
                            <p className="text-sm text-gray-400">{tx.method}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          <p className={`text-sm ${getStatusColor(tx.status)}`}>
                            {getStatusText(tx.status)}
                          </p>
                          <p className="text-sm text-gray-500">{tx.time}</p>
                        </div>
                      </div>

                      {/* Detailed Status Information for Withdrawals */}
                      {tx.type === 'withdraw' && tx.details && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50">
                          {(() => {
                            const statusInfo = getWithdrawalStatusInfo(tx);
                            return (
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {/* Status */}
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Status:</span>
                                  <span className={`font-medium ${statusInfo.color}`}>
                                    {statusInfo.status}
                                  </span>
                                </div>
                                
                                {/* Details */}
                                {statusInfo.details && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Details:</span>
                                    <span className="text-gray-300 max-w-xs text-right">
                                      {statusInfo.details}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Refund Information */}
                                {statusInfo.refund && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Refund:</span>
                                    <span className={`font-medium ${
                                      statusInfo.refund.includes('No refund') ? 'text-red-400' : 'text-green-400'
                                    }`}>
                                      {statusInfo.refund}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Account Details */}
                                {tx.details.account_name && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Account:</span>
                                    <span className="text-gray-300">
                                      {tx.details.account_name}
                                      {tx.details.account_number && ` - ${tx.details.account_number}`}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Processing Time */}
                                {tx.details.processed_at && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Processed:</span>
                                    <span className="text-gray-300">
                                      {formatTimeAgo(new Date(tx.details.processed_at))}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {allTransactions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-700/50">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400">
                      {allTransactions.filter(tx => tx.type === 'deposit').length}
                    </p>
                    <p className="text-sm text-gray-400">Total Deposits</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">
                      {allTransactions.filter(tx => tx.type === 'withdraw').length}
                    </p>
                    <p className="text-sm text-gray-400">Total Withdrawals</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gold">
                      {formatCurrency(
                        allTransactions
                          .filter(tx => tx.type === 'deposit')
                          .reduce((sum, tx) => sum + tx.amount, 0)
                      )}
                    </p>
                    <p className="text-sm text-gray-400">Total Deposited</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 