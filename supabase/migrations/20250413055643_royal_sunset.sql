-- Function to get current user's Telegram ID from custom header
CREATE OR REPLACE FUNCTION get_telegram_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-telegram-user-id',
    ''
  );
$$;

-- Drop existing policies and triggers
DO $$ 
BEGIN
    -- Drop policies
    DROP POLICY IF EXISTS "Users can read own data" ON users;
    DROP POLICY IF EXISTS "Users can update own data" ON users;
    DROP POLICY IF EXISTS "Users can insert own activities" ON user_activities;
    DROP POLICY IF EXISTS "Users can read own activities" ON user_activities;
    DROP POLICY IF EXISTS "Users can read own achievements" ON achievements;
    DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text UNIQUE NOT NULL,
  balance bigint DEFAULT 0,
  energy integer DEFAULT 100,
  max_energy integer DEFAULT 100,
  level integer DEFAULT 1,
  mining_power integer DEFAULT 0,
  claim_streak integer DEFAULT 0,
  last_claim timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO public
  USING (telegram_id = get_telegram_user_id());

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO public
  USING (telegram_id = get_telegram_user_id());

-- User Activities Table
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(telegram_id) NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('mining', 'referral', 'airdrop', 'task')),
  amount bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own activities"
  ON user_activities
  FOR INSERT
  TO public
  WITH CHECK (
    user_id = get_telegram_user_id()
    AND get_telegram_user_id() != ''
  );

CREATE POLICY "Users can read own activities"
  ON user_activities
  FOR SELECT
  TO public
  USING (
    user_id = get_telegram_user_id()
    AND get_telegram_user_id() != ''
  );

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(telegram_id) NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  progress integer DEFAULT 0,
  total integer NOT NULL,
  reward integer NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
  ON achievements
  FOR SELECT
  TO public
  USING (user_id = get_telegram_user_id());

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(telegram_id) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('achievement', 'reward', 'system')),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO public
  USING (user_id = get_telegram_user_id());

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO public
  USING (user_id = get_telegram_user_id());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_activities_user_id_idx ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON achievements(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();