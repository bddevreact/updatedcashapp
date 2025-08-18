/*
  # Add referral system

  1. New Tables
    - `referrals`
      - `id` (uuid, primary key)
      - `referrer_id` (text, references users.telegram_id)
      - `referred_id` (text, references users.telegram_id)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `referrals` table
    - Add policies for authenticated users to read and insert referrals
*/

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text REFERENCES users(telegram_id) NOT NULL,
  referred_id text REFERENCES users(telegram_id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING ((auth.uid())::text = referrer_id);

CREATE POLICY "Users can insert referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid())::text = referrer_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_id_idx ON referrals(referred_id);