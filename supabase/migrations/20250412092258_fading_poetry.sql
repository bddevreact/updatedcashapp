/*
  # Create task completions table

  1. New Tables
    - `task_completions`
      - `id` (uuid, primary key)
      - `user_id` (text, references users.telegram_id)
      - `task_id` (integer)
      - `completed_at` (timestamp with time zone)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `task_completions` table
    - Add policies for authenticated users to:
      - Insert their own task completions
      - Read their own task completions
*/

CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(telegram_id) NOT NULL,
  task_id integer NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own task completions"
  ON task_completions
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can read own task completions"
  ON task_completions
  FOR SELECT
  TO authenticated
  USING ((auth.uid())::text = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS task_completions_user_id_idx ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS task_completions_completed_at_idx ON task_completions(completed_at);

-- Task templates table (admin configurable tasks)
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  reward bigint NOT NULL,
  xp integer DEFAULT 0,
  type text NOT NULL CHECK (type IN ('daily', 'social', 'referral', 'trading_platform', 'checkin')),
  icon text,
  button_text text,
  cooldown integer DEFAULT 0,
  max_completions integer DEFAULT 1,
  is_active boolean DEFAULT true,
  url text, -- Added URL field for task links
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert sample task templates
INSERT INTO task_templates (title, subtitle, description, reward, xp, type, icon, button_text, cooldown, max_completions, url) VALUES
('Daily Check-in', 'Complete daily check-in to earn real money', 'Check in daily to maintain your streak and earn rewards. Higher streaks give bonus rewards!', 50, 100, 'checkin', 'checkin', 'CHECK IN', 86400, 1, ''),
('Trading Platform Referral', 'Join trading platform using our referral link', 'Join our exclusive trading platform using the referral link, then submit your UID for verification.', 200, 300, 'referral', 'referral', 'JOIN & VERIFY', 0, 1, 'https://okx.com'),
('Join Telegram channel', 'XOOB', 'Join our official Telegram channel', 20000, 200, 'social', 'social', 'OPEN', 0, 1, 'https://t.me/xoob_channel'),
('Join Telegram chat', 'XOOB', 'Join our community chat', 20000, 200, 'social', 'social', 'OPEN', 0, 1, 'https://t.me/xoob_chat'),
('Follow OKX Channel!', 'OKX', 'Follow our OKX channel', 20000, 200, 'social', 'social', 'OPEN', 3600, 1, 'https://t.me/okx_official'),
('Twitter Combo', 'Twitter', 'Follow us on Twitter', 20000, 200, 'social', 'social', 'OPEN', 86400, 1, 'https://twitter.com/xoob_official')
ON CONFLICT DO NOTHING;