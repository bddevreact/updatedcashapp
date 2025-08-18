-- Add last_energy_refill column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_energy_refill timestamptz;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS users_last_energy_refill_idx ON users(last_energy_refill);