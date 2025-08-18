/*
  # Create users table for TRD Network

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `telegram_id` (text, unique)
      - `balance` (bigint)
      - `energy` (integer)
      - `max_energy` (integer)
      - `level` (integer)
      - `mining_power` (integer)
      - `claim_streak` (integer)
      - `last_claim` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users to read/update their own data
*/

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

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid()::text = telegram_id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (auth.uid()::text = telegram_id);