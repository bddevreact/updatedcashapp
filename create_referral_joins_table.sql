-- Create table for tracking referral joins
-- This will track when someone joins a group using a referral link

-- Referral Joins table
CREATE TABLE IF NOT EXISTS referral_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  referrer_id text NOT NULL,
  user_id text NOT NULL,
  group_username text NOT NULL,
  username text,
  first_name text,
  last_name text,
  joined_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'left', 'kicked')),
  left_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique user-group-referral combination
  UNIQUE(user_id, group_username, referral_code)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_joins_code ON referral_joins(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_joins_referrer ON referral_joins(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_joins_user ON referral_joins(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_joins_group ON referral_joins(group_username);
CREATE INDEX IF NOT EXISTS idx_referral_joins_date ON referral_joins(joined_at);
CREATE INDEX IF NOT EXISTS idx_referral_joins_status ON referral_joins(status);

-- Add foreign key constraints
ALTER TABLE referral_joins ADD CONSTRAINT fk_referral_joins_referrer_id 
  FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE referral_joins ADD CONSTRAINT fk_referral_joins_user_id 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE referral_joins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_joins
CREATE POLICY "Users can view own referral joins" ON referral_joins
  FOR SELECT USING (referrer_id = get_telegram_user_id());

CREATE POLICY "Users can insert referral joins" ON referral_joins
  FOR INSERT WITH CHECK (true); -- Allow tracking of all referral joins

CREATE POLICY "Users can update own referral joins" ON referral_joins
  FOR UPDATE USING (referrer_id = get_telegram_user_id());

-- Function to track referral join
CREATE OR REPLACE FUNCTION track_referral_join(
  p_referral_code text,
  p_referrer_id text,
  p_user_id text,
  p_group_username text,
  p_username text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO referral_joins (
    referral_code, 
    referrer_id, 
    user_id, 
    group_username, 
    username, 
    first_name, 
    last_name
  )
  VALUES (
    p_referral_code, 
    p_referrer_id, 
    p_user_id, 
    p_group_username, 
    p_username, 
    p_first_name, 
    p_last_name
  )
  ON CONFLICT (user_id, group_username, referral_code)
  DO UPDATE SET
    status = 'active',
    left_at = NULL,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to get referral joins count
CREATE OR REPLACE FUNCTION get_referral_joins_count(
  p_referral_code text,
  p_referrer_id text,
  p_group_username text,
  p_date_filter text DEFAULT ''
)
RETURNS integer AS $$
DECLARE
  query_text text;
  result_count integer;
BEGIN
  query_text := 'SELECT COUNT(*) FROM referral_joins WHERE referral_code = $1 AND referrer_id = $2 AND group_username = $3 AND status = ''active'' ' || p_date_filter;
  
  EXECUTE query_text INTO result_count USING p_referral_code, p_referrer_id, p_group_username;
  
  RETURN COALESCE(result_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update user status when they leave group
CREATE OR REPLACE FUNCTION update_referral_join_status(
  p_user_id text,
  p_group_username text,
  p_status text DEFAULT 'left'
)
RETURNS void AS $$
BEGIN
  UPDATE referral_joins 
  SET 
    status = p_status,
    left_at = CASE WHEN p_status IN ('left', 'kicked') THEN now() ELSE left_at END,
    updated_at = now()
  WHERE user_id = p_user_id 
    AND group_username = p_group_username
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to get referral performance summary
CREATE OR REPLACE FUNCTION get_referral_performance(
  p_referrer_id text,
  p_group_username text DEFAULT NULL
)
RETURNS TABLE (
  referral_code text,
  total_joins bigint,
  active_joins bigint,
  today_joins bigint,
  week_joins bigint,
  month_joins bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rj.referral_code,
    COUNT(*) as total_joins,
    COUNT(*) FILTER (WHERE rj.status = 'active') as active_joins,
    COUNT(*) FILTER (WHERE rj.joined_at >= CURRENT_DATE) as today_joins,
    COUNT(*) FILTER (WHERE rj.joined_at >= CURRENT_DATE - INTERVAL '7 days') as week_joins,
    COUNT(*) FILTER (WHERE rj.joined_at >= CURRENT_DATE - INTERVAL '30 days') as month_joins
  FROM referral_joins rj
  WHERE rj.referrer_id = p_referrer_id
    AND (p_group_username IS NULL OR rj.group_username = p_group_username)
  GROUP BY rj.referral_code
  ORDER BY total_joins DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get top referrers
CREATE OR REPLACE FUNCTION get_top_referrers(
  p_group_username text DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  referrer_id text,
  username text,
  first_name text,
  total_referrals bigint,
  active_referrals bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rj.referrer_id,
    u.username,
    u.first_name,
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE rj.status = 'active') as active_referrals
  FROM referral_joins rj
  JOIN users u ON rj.referrer_id = u.telegram_id
  WHERE (p_group_username IS NULL OR rj.group_username = p_group_username)
  GROUP BY rj.referrer_id, u.username, u.first_name
  ORDER BY total_referrals DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON referral_joins TO authenticated;
GRANT EXECUTE ON FUNCTION track_referral_join TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_joins_count TO authenticated;
GRANT EXECUTE ON FUNCTION update_referral_join_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_referrers TO authenticated;

-- Insert sample data for testing
INSERT INTO referral_joins (
  referral_code, 
  referrer_id, 
  user_id, 
  group_username, 
  username, 
  first_name, 
  status
) VALUES 
  ('TEST123', '123456789', '987654321', 'bt_community', 'user1', 'John', 'active'),
  ('TEST123', '123456789', '111222333', 'bt_community', 'user2', 'Jane', 'active'),
  ('TEST123', '123456789', '444555666', 'bt_community', 'user3', 'Bob', 'left'),
  ('REF456', '123456789', '777888999', 'crypto_traders', 'user4', 'Alice', 'active')
ON CONFLICT DO NOTHING;

-- Create a view for easy referral tracking
CREATE OR REPLACE VIEW referral_tracking_view AS
SELECT 
  rj.referral_code,
  rj.referrer_id,
  referrer.username as referrer_username,
  referrer.first_name as referrer_first_name,
  rj.user_id,
  rj.username,
  rj.first_name,
  rj.group_username,
  rj.joined_at,
  rj.status,
  rj.left_at,
  CASE 
    WHEN rj.status = 'active' THEN 
      EXTRACT(EPOCH FROM (now() - rj.joined_at)) / 86400
    ELSE 
      EXTRACT(EPOCH FROM (rj.left_at - rj.joined_at)) / 86400
  END as days_member
FROM referral_joins rj
JOIN users referrer ON rj.referrer_id = referrer.telegram_id
ORDER BY rj.joined_at DESC;

-- Grant view permissions
GRANT SELECT ON referral_tracking_view TO authenticated; 