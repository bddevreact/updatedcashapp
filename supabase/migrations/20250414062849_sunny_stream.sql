/*
  # Add user balances table and security policies

  1. New Tables
    - `user_balances`: Store user-specific balances
      - `user_id` (text, references users.telegram_id)
      - `mining_balance` (bigint)
      - `referral_balance` (bigint)
      - `airdrop_balance` (bigint)
      - `task_balance` (bigint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for users to read their own data
*/

-- Create user_balances table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_balances (
  user_id text PRIMARY KEY REFERENCES users(telegram_id),
  mining_balance bigint DEFAULT 0,
  referral_balance bigint DEFAULT 0,
  airdrop_balance bigint DEFAULT 0,
  task_balance bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own balances" ON user_balances;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create policy for reading own data
CREATE POLICY "Users can read own balances"
  ON user_balances
  FOR SELECT
  TO public
  USING (user_id = get_telegram_user_id());

-- Create trigger for updating updated_at
DO $$ 
BEGIN
    CREATE TRIGGER update_user_balances_updated_at
        BEFORE UPDATE ON user_balances
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;