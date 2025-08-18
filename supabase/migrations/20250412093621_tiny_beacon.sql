/*
  # Add balance increment function

  1. New Functions
    - `increment_balance`: Safely increment user balance
      - Parameters:
        - user_telegram_id (text)
        - amount (bigint)

  2. Description
    - Function to safely increment user balance
    - Handles concurrent updates
    - Returns the updated balance
*/

CREATE OR REPLACE FUNCTION increment_balance(
  user_telegram_id text,
  amount bigint
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance bigint;
BEGIN
  UPDATE users
  SET balance = balance + amount
  WHERE telegram_id = user_telegram_id
  RETURNING balance INTO new_balance;
  
  RETURN new_balance;
END;
$$;