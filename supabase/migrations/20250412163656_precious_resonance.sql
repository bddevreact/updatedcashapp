/*
  # Add notifications and achievements tables

  1. New Tables
    - `notifications`: Store user notifications
      - `id` (uuid, primary key)
      - `user_id` (text, references users.telegram_id)
      - `title` (text)
      - `message` (text)
      - `type` (text)
      - `read` (boolean)
      - `created_at` (timestamptz)

    - `achievements`: Store user achievements
      - `id` (uuid, primary key)
      - `user_id` (text, references users.telegram_id)
      - `title` (text)
      - `description` (text)
      - `progress` (integer)
      - `total` (integer)
      - `reward` (integer)
      - `completed` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to read their own data
*/

-- Create notifications table
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
  TO authenticated
  USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING ((auth.uid())::text = user_id);

-- Create achievements table
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
  TO authenticated
  USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can update own achievements"
  ON achievements
  FOR UPDATE
  TO authenticated
  USING ((auth.uid())::text = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON achievements(user_id);
CREATE INDEX IF NOT EXISTS achievements_completed_idx ON achievements(completed);