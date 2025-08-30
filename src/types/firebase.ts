// Firebase Firestore Types
export interface FirebaseUser {
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  balance: number;
  energy: number;
  max_energy: number;
  level: number;
  experience_points: number;
  mining_power: number;
  claim_streak: number;
  total_earnings: number;
  total_referrals: number;
  last_claim?: Date;
  last_energy_refill?: Date;
  last_active?: Date;
  is_verified: boolean;
  is_banned: boolean;
  ban_reason?: string;
  referral_code?: string;
  referred_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserActivity {
  id?: string;
  user_id: string;
  activity_type: string;
  amount: number;
  created_at: Date;
}

export interface Achievement {
  id?: string;
  user_id: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  reward: number;
  completed: boolean;
  created_at: Date;
}

export interface Notification {
  id?: string;
  user_id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error' | 'reward';
  read: boolean;
  action_url?: string;
  created_at: Date;
}

export interface Referral {
  id?: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  reward_amount: number;
  reward_given: boolean;
  created_at: Date;
  completed_at?: Date;
}

export interface Task {
  id?: string;
  user_id: string;
  task_type: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  progress: number;
  max_progress: number;
  created_at: Date;
  completed_at?: Date;
}

export interface Withdrawal {
  id?: string;
  user_id: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  wallet_address?: string;
  transaction_hash?: string;
  admin_notes?: string;
  created_at: Date;
  processed_at?: Date;
}

export interface AdminUser {
  id?: string;
  email: string;
  role: 'admin' | 'moderator' | 'super_admin';
  permissions: string[];
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
}

// Firebase Collections
export interface FirebaseCollections {
  users: FirebaseUser;
  user_activities: UserActivity;
  achievements: Achievement;
  notifications: Notification;
  referrals: Referral;
  tasks: Task;
  withdrawals: Withdrawal;
  admin_users: AdminUser;
}

// Real-time data types
export interface RealTimeStats {
  is_online: boolean;
  last_seen?: Date;
  current_activity?: string;
  notifications: Notification[];
}

// User stats interface
export interface UserStats {
  referrals_count: number;
  tasks_completed: number;
  today_referrals: number;
  this_week_referrals: number;
  this_month_referrals: number;
  today_earnings: number;
  this_week_earnings: number;
  this_month_earnings: number;
  achievements_unlocked: number;
}
