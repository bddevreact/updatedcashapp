import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import type { FirebaseUser, UserActivity, Notification, UserStats } from '../types/firebase';

interface UserState {
  // Basic user info
  telegramId: string | null;
  name: string;
  photoUrl: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Financial & Game stats
  balance: number;
  energy: number;
  maxEnergy: number;
  level: number;
  experiencePoints: number;
  miningPower: number;
  claimStreak: number;
  totalEarnings: number;
  totalReferrals: number;
  
  // Timestamps
  lastClaim: Date | null;
  lastEnergyRefill: Date | null;
  lastActive: Date | null;
  
  // Status
  isVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  
  // Referral system
  referralCode: string | null;
  referralLink: string | null;
  referredBy: string | null;
  
  // Task & Activity stats
  stats: UserStats;
  
  // Real-time data
  realTimeData: {
    isOnline: boolean;
    lastSeen: Date | null;
    currentActivity: string | null;
    notifications: Notification[];
    intervalId?: NodeJS.Timeout;
  };
  
  // Actions
  setUser: (user: Partial<UserState>) => void;
  updateBalance: (amount: number) => Promise<void>;
  updateEnergy: (amount: number) => Promise<void>;
  updateExperience: (xp: number) => Promise<void>;
  updateLevel: (level: number) => Promise<void>;
  updateMiningPower: (power: number) => Promise<void>;
  updateClaimStreak: (streak: number, lastClaim: Date) => Promise<void>;
  updateLastEnergyRefill: (date: Date | null) => Promise<void>;
  loadUserData: (telegramId: string) => Promise<void>;
  createUser: (userData: Partial<FirebaseUser>) => Promise<void>;
  updateUserProfile: (updates: Partial<FirebaseUser>) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read' | 'user_id'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  updateRealTimeStats: () => Promise<void>;
  startRealTimeUpdates: () => void;
  stopRealTimeUpdates: () => void;
  refreshUserData: () => Promise<void>;
  syncReferralCodes: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

export const useFirebaseUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      telegramId: null,
      name: '',
      photoUrl: '',
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      balance: 0,
      energy: 100,
      maxEnergy: 100,
      level: 1,
      experiencePoints: 0,
      miningPower: 0,
      claimStreak: 0,
      totalEarnings: 0,
      totalReferrals: 0,
      lastClaim: null,
      lastEnergyRefill: null,
      lastActive: null,
      isVerified: false,
      isBanned: false,
      banReason: null,
      referralCode: null,
      referralLink: null,
      referredBy: null,
      stats: {
        referrals_count: 0,
        tasks_completed: 0,
        today_referrals: 0,
        this_week_referrals: 0,
        this_month_referrals: 0,
        today_earnings: 0,
        this_week_earnings: 0,
        this_month_earnings: 0,
        achievements_unlocked: 0
      },
      realTimeData: {
        isOnline: false,
        lastSeen: null,
        currentActivity: null,
        notifications: []
      },

      // Actions
      setUser: (user) => set(user),

      updateBalance: async (amount) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const userRef = doc(db, 'users', telegramId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentBalance = userData.balance || 0;
            const newBalance = currentBalance + amount; // ✅ Increment balance
            
            await updateDoc(userRef, { 
              balance: newBalance,
              total_earnings: (userData.total_earnings || 0) + amount, // ✅ Also update total earnings
              updated_at: serverTimestamp()
            });
            set({ balance: newBalance, totalEarnings: (get().totalEarnings || 0) + amount });
          }
        } catch (error) {
          console.error('Error updating balance:', error);
          throw error;
        }
      },

      updateEnergy: async (amount) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const userRef = doc(db, 'users', telegramId);
          await updateDoc(userRef, { 
            energy: amount,
            updated_at: serverTimestamp()
          });
          set({ energy: amount });
        } catch (error) {
          console.error('Error updating energy:', error);
          throw error;
        }
      },

      updateExperience: async (xp) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const userRef = doc(db, 'users', telegramId);
          await updateDoc(userRef, { 
            experience_points: xp,
            updated_at: serverTimestamp()
          });
          set({ experiencePoints: xp });
        } catch (error) {
          console.error('Error updating experience:', error);
          throw error;
        }
      },

      updateLevel: async (level) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const userRef = doc(db, 'users', telegramId);
          await updateDoc(userRef, { 
            level,
            updated_at: serverTimestamp()
          });
          set({ level });
        } catch (error) {
          console.error('Error updating level:', error);
          throw error;
        }
      },

      updateMiningPower: async (power) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const userRef = doc(db, 'users', telegramId);
          await updateDoc(userRef, { 
            mining_power: power,
            updated_at: serverTimestamp()
          });
          set({ miningPower: power });
        } catch (error) {
          console.error('Error updating mining power:', error);
          throw error;
        }
      },

      updateClaimStreak: async (streak, lastClaim) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const userRef = doc(db, 'users', telegramId);
          await updateDoc(userRef, {
            claim_streak: streak,
            last_claim: lastClaim,
            updated_at: serverTimestamp()
          });
          set({ claimStreak: streak, lastClaim });
        } catch (error) {
          console.error('Error updating claim streak:', error);
          throw error;
        }
      },

      updateLastEnergyRefill: async (date) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const userRef = doc(db, 'users', telegramId);
          await updateDoc(userRef, { 
            last_energy_refill: date,
            updated_at: serverTimestamp()
          });
          set({ lastEnergyRefill: date });
        } catch (error) {
          console.error('Error updating last energy refill:', error);
          throw error;
        }
      },

      loadUserData: async (telegramId) => {
        console.log('🔄 Loading user data for telegramId:', telegramId);
        try {
          const userRef = doc(db, 'users', telegramId);
          const userSnap = await getDoc(userRef);

          console.log('📄 User document exists:', userSnap.exists());
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as FirebaseUser;
            console.log('📊 User data from Firebase:', userData);
            
            // Ensure user has a referral code
            let referralCode = userData.referral_code;
            console.log('🔗 Original referral code:', referralCode);
            
            if (!referralCode) {
              console.log('⚠️ No referral code found, generating new one...');
              referralCode = `CP${telegramId}`; // Use full telegram ID with CP prefix
              // Update the user document with the generated referral code
              await updateDoc(userRef, {
                referral_code: referralCode,
                updated_at: serverTimestamp()
              });
              console.log('✅ Generated and saved referral code:', referralCode);
            }
            
            // Ensure referral code exists in referralCodes collection
            try {
              const referralCodeRef = doc(db, 'referralCodes', referralCode);
              const referralCodeDoc = await getDoc(referralCodeRef);
              
              if (!referralCodeDoc.exists()) {
                console.log('⚠️ Referral code not found in referralCodes collection, creating...');
                await setDoc(referralCodeRef, {
                  user_id: telegramId,
                  referral_code: referralCode,
                  is_active: true,
                  created_at: serverTimestamp(),
                  total_uses: 0,
                  total_earnings: 0
                });
                console.log('✅ Created referral code document in referralCodes collection:', referralCode);
              }
            } catch (referralError) {
              console.error('⚠️ Error ensuring referral code in referralCodes collection:', referralError);
            }
            
            console.log('🎯 Setting user state with referral code:', referralCode);
            set({
              telegramId: userData.telegram_id,
              name: userData.first_name || userData.username || 'User',
              photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.telegram_id}`,
              username: userData.username || '',
              firstName: userData.first_name || '',
              lastName: userData.last_name || '',
              email: userData.email || '',
              phone: userData.phone || '',
              balance: userData.balance || 0,
              energy: userData.energy || 100,
              maxEnergy: userData.max_energy || 100,
              level: userData.level || 1,
              experiencePoints: userData.experience_points || 0,
              miningPower: userData.mining_power || 0,
              claimStreak: userData.claim_streak || 0,
              totalEarnings: userData.total_earnings || 0,
              totalReferrals: userData.total_referrals || 0,
              referralCode: referralCode,
              referralLink: referralCode ? `https://t.me/CashPoinntbot?start=${referralCode}` : null,
              referredBy: userData.referred_by || null,
              isVerified: userData.is_verified || false,
              isBanned: userData.is_banned || false,
              banReason: userData.ban_reason || null,
              lastClaim: userData.last_claim || null,
              lastEnergyRefill: userData.last_energy_refill || null,
              lastActive: userData.last_active || new Date()
            });
            console.log('✅ User data loaded successfully');
          } else {
            console.log('❌ User document does not exist in Firebase');
          }
        } catch (error) {
          console.error('❌ Error loading user data:', error);
          throw error;
        }
      },

      createUser: async (userData) => {
        try {
          // Generate unique referral code if not provided
          let referralCode = userData.referral_code;
          if (!referralCode) {
            referralCode = `CP${userData.telegram_id!}`; // Use full telegram ID with CP prefix
          }
          
          const userRef = doc(db, 'users', userData.telegram_id!);
          await setDoc(userRef, {
            ...userData,
            referral_code: referralCode,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          
          // Also create referral code document in referralCodes collection
          try {
            const referralCodeRef = doc(db, 'referralCodes', referralCode);
            await setDoc(referralCodeRef, {
              user_id: userData.telegram_id!,
              referral_code: referralCode,
              is_active: true,
              created_at: serverTimestamp(),
              total_uses: 0,
              total_earnings: 0
            });
            console.log('✅ Referral code document created in referralCodes collection:', referralCode);
          } catch (referralError) {
            console.error('⚠️ Error creating referral code document:', referralError);
            // Continue even if referral code creation fails
          }
          
          // Set local state
          set({
            telegramId: userData.telegram_id!,
            name: userData.first_name || userData.username || 'User',
            photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.telegram_id}`,
            username: userData.username || '',
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            balance: userData.balance || 0,
            energy: userData.energy || 100,
            maxEnergy: userData.max_energy || 100,
            level: userData.level || 1,
            experiencePoints: userData.experience_points || 0,
            miningPower: userData.mining_power || 0,
            claimStreak: userData.claim_streak || 0,
            totalEarnings: userData.total_earnings || 0,
            totalReferrals: userData.total_referrals || 0,
            referralCode: referralCode,
            referralLink: referralCode ? `https://t.me/CashPoinntbot?start=${referralCode}` : null,
            referredBy: userData.referred_by || null,
            isVerified: userData.is_verified || false,
            isBanned: userData.is_banned || false,
            banReason: userData.ban_reason || null,
            lastActive: new Date()
          });
        } catch (error) {
          console.error('Error creating user:', error);
          throw error;
        }
      },

      updateUserProfile: async (updates) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const userRef = doc(db, 'users', telegramId);
          await updateDoc(userRef, {
            ...updates,
            updated_at: serverTimestamp()
          });
          
          // Update local state
          set(updates);
        } catch (error) {
          console.error('Error updating user profile:', error);
          throw error;
        }
      },

      addNotification: async (notification) => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          const notificationData = {
            ...notification,
            user_id: telegramId,
            read: false,
            created_at: serverTimestamp()
          };

          await addDoc(collection(db, 'notifications'), notificationData);
          
          // Add to local state
          const newNotification: Notification = {
            ...notificationData,
            id: Date.now().toString(),
            created_at: new Date()
          } as Notification;

          set(state => ({
            realTimeData: {
              ...state.realTimeData,
              notifications: [...state.realTimeData.notifications, newNotification]
            }
          }));
        } catch (error) {
          console.error('Error adding notification:', error);
        }
      },

      markNotificationAsRead: async (id) => {
        try {
          // Update in Firestore
          const notificationRef = doc(db, 'notifications', id);
          await updateDoc(notificationRef, { read: true });
          
          // Update local state
          set(state => ({
            realTimeData: {
              ...state.realTimeData,
              notifications: state.realTimeData.notifications.map(n => 
                n.id === id ? { ...n, read: true } : n
              )
            }
          }));
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      },

      clearNotifications: () => {
        set(state => ({
          realTimeData: {
            ...state.realTimeData,
            notifications: []
          }
        }));
      },

      updateRealTimeStats: async () => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          // Update online status
          const userRef = doc(db, 'users', telegramId);
          await updateDoc(userRef, {
            last_active: serverTimestamp()
          });

          set(state => ({
            realTimeData: {
              ...state.realTimeData,
              isOnline: true,
              lastSeen: new Date()
            }
          }));
        } catch (error) {
          console.error('Error updating real-time stats:', error);
        }
      },

      startRealTimeUpdates: () => {
        const { telegramId } = get();
        if (!telegramId) return;

        // Start real-time updates
        const intervalId = setInterval(() => {
          get().updateRealTimeStats();
        }, 30000); // Update every 30 seconds

        set(state => ({
          realTimeData: {
            ...state.realTimeData,
            intervalId
          }
        }));
      },

      stopRealTimeUpdates: () => {
        const { realTimeData } = get();
        if (realTimeData.intervalId) {
          clearInterval(realTimeData.intervalId);
        }

        set(state => ({
          realTimeData: {
            ...state.realTimeData,
            intervalId: undefined
          }
        }));
      },

      refreshUserData: async () => {
        const { telegramId } = get();
        if (telegramId) {
          await get().loadUserData(telegramId);
        }
      },

      // Refresh balance from Firebase
      refreshBalance: async () => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          console.log('🔄 Refreshing balance for user:', telegramId);
          const userRef = doc(db, 'users', telegramId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentBalance = userData.balance || 0;
            console.log('💰 Current balance from Firebase:', currentBalance);
            
            set({ balance: currentBalance });
            console.log('✅ Balance refreshed successfully');
          } else {
            console.log('❌ User not found in Firebase');
          }
        } catch (error) {
          console.error('❌ Error refreshing balance:', error);
        }
      },

      // Sync referral codes for existing users
      syncReferralCodes: async () => {
        const { telegramId } = get();
        if (!telegramId) return;

        try {
          console.log('🔄 Syncing referral codes for user:', telegramId);
          
          // Get user's referral code
          const userRef = doc(db, 'users', telegramId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const referralCode = userData.referral_code;
            
            if (referralCode) {
              // Check if referral code exists in referralCodes collection
              const referralCodeRef = doc(db, 'referralCodes', referralCode);
              const referralCodeSnap = await getDoc(referralCodeRef);
              
              if (!referralCodeSnap.exists()) {
                // Create missing referral code document
                await setDoc(referralCodeRef, {
                  user_id: telegramId,
                  referral_code: referralCode,
                  is_active: true,
                  created_at: serverTimestamp(),
                  total_uses: 0,
                  total_earnings: 0
                });
                console.log('✅ Created missing referral code document:', referralCode);
              } else {
                console.log('⏭️ Referral code already exists in referralCodes collection:', referralCode);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error syncing referral codes:', error);
        }
      }
    }),
    {
      name: 'firebase-user-store',
      partialize: (state) => ({
        telegramId: state.telegramId,
        name: state.name,
        photoUrl: state.photoUrl,
        username: state.username,
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        phone: state.phone,
        balance: state.balance,
        energy: state.energy,
        maxEnergy: state.maxEnergy,
        level: state.level,
        experiencePoints: state.experiencePoints,
        miningPower: state.miningPower,
        claimStreak: state.claimStreak,
        totalEarnings: state.totalEarnings,
        totalReferrals: state.totalReferrals,
        lastClaim: state.lastClaim,
        lastEnergyRefill: state.lastEnergyRefill,
        lastActive: state.lastActive,
        isVerified: state.isVerified,
        isBanned: state.isBanned,
        banReason: state.banReason,
        referralCode: state.referralCode,
        referredBy: state.referredBy
      })
    }
  )
);
