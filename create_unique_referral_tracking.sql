-- =====================================================
-- CREATE UNIQUE REFERRAL TRACKING SYSTEM
-- =====================================================
-- Tables and functions for tracking unique referral links

-- Create unique referral links table
CREATE TABLE IF NOT EXISTS unique_referral_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE,
  base_url TEXT NOT NULL,
  unique_identifier TEXT NOT NULL,
  link_format TEXT NOT NULL DEFAULT 'both' CHECK (link_format IN ('telegram_id', 'referral_code', 'both')),
  is_active BOOLEAN DEFAULT TRUE,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral link clicks tracking table
CREATE TABLE IF NOT EXISTS referral_link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_link_id UUID REFERENCES unique_referral_links(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(telegram_id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  conversion_date TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unique_referral_links_user_id ON unique_referral_links(user_id);
CREATE INDEX IF NOT EXISTS idx_unique_referral_links_referral_code ON unique_referral_links(referral_code);
CREATE INDEX IF NOT EXISTS idx_unique_referral_links_unique_identifier ON unique_referral_links(unique_identifier);
CREATE INDEX IF NOT EXISTS idx_referral_link_clicks_referral_link_id ON referral_link_clicks(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_link_clicks_user_id ON referral_link_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_link_clicks_clicked_at ON referral_link_clicks(clicked_at);

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_unique_referral_code(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  referral_code TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code
    referral_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM unique_referral_links WHERE referral_code = referral_code) THEN
      RETURN referral_code;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique referral code after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to create unique referral link
CREATE OR REPLACE FUNCTION create_unique_referral_link(
  p_user_id TEXT,
  p_base_url TEXT,
  p_link_format TEXT DEFAULT 'both'
)
RETURNS UUID AS $$
DECLARE
  referral_code TEXT;
  unique_identifier TEXT;
  link_id UUID;
BEGIN
  -- Generate unique referral code
  referral_code := generate_unique_referral_code(p_user_id);
  
  -- Create unique identifier based on format
  CASE p_link_format
    WHEN 'telegram_id' THEN
      unique_identifier := p_user_id;
    WHEN 'referral_code' THEN
      unique_identifier := referral_code;
    WHEN 'both' THEN
      unique_identifier := p_user_id || '_' || referral_code;
    ELSE
      unique_identifier := p_user_id;
  END CASE;
  
  -- Insert new referral link
  INSERT INTO unique_referral_links (
    user_id,
    referral_code,
    base_url,
    unique_identifier,
    link_format
  ) VALUES (
    p_user_id,
    referral_code,
    p_base_url,
    unique_identifier,
    p_link_format
  ) RETURNING id INTO link_id;
  
  RETURN link_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to track referral link click
CREATE OR REPLACE FUNCTION track_referral_click(
  p_referral_code TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  link_id UUID;
BEGIN
  -- Find the referral link
  SELECT id INTO link_id 
  FROM unique_referral_links 
  WHERE referral_code = p_referral_code AND is_active = TRUE;
  
  IF link_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Record the click
  INSERT INTO referral_link_clicks (
    referral_link_id,
    user_id,
    ip_address,
    user_agent,
    referrer
  ) VALUES (
    link_id,
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_referrer
  );
  
  -- Update click count
  UPDATE unique_referral_links 
  SET total_clicks = total_clicks + 1, updated_at = NOW()
  WHERE id = link_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark conversion
CREATE OR REPLACE FUNCTION mark_referral_conversion(
  p_referral_code TEXT,
  p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  link_id UUID;
  click_id UUID;
BEGIN
  -- Find the referral link
  SELECT id INTO link_id 
  FROM unique_referral_links 
  WHERE referral_code = p_referral_code AND is_active = TRUE;
  
  IF link_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Find the click record for this user
  SELECT id INTO click_id 
  FROM referral_link_clicks 
  WHERE referral_link_id = link_id AND user_id = p_user_id
  ORDER BY clicked_at DESC 
  LIMIT 1;
  
  IF click_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Mark as converted
  UPDATE referral_link_clicks 
  SET converted = TRUE, conversion_date = NOW()
  WHERE id = click_id;
  
  -- Update conversion count
  UPDATE unique_referral_links 
  SET total_conversions = total_conversions + 1, updated_at = NOW()
  WHERE id = link_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get referral link statistics
CREATE OR REPLACE FUNCTION get_referral_link_stats(p_user_id TEXT)
RETURNS TABLE (
  total_links INTEGER,
  total_clicks INTEGER,
  total_conversions INTEGER,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_links,
    COALESCE(SUM(total_clicks), 0)::INTEGER as total_clicks,
    COALESCE(SUM(total_conversions), 0)::INTEGER as total_conversions,
    CASE 
      WHEN COALESCE(SUM(total_clicks), 0) > 0 
      THEN ROUND((COALESCE(SUM(total_conversions), 0)::NUMERIC / SUM(total_clicks)::NUMERIC) * 100, 2)
      ELSE 0 
    END as conversion_rate
  FROM unique_referral_links
  WHERE user_id = p_user_id AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_unique_referral_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_unique_referral_links_updated_at_trigger
  BEFORE UPDATE ON unique_referral_links
  FOR EACH ROW
  EXECUTE FUNCTION update_unique_referral_links_updated_at();

-- Insert sample data for testing
INSERT INTO unique_referral_links (user_id, referral_code, base_url, unique_identifier, link_format) VALUES
  ('sample_user_1', 'ABC123', 'https://example.com/join', 'sample_user_1_ABC123', 'both'),
  ('sample_user_2', 'DEF456', 'https://example.com/join', 'sample_user_2_DEF456', 'both')
ON CONFLICT (referral_code) DO NOTHING;

-- Verify the tables creation
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'unique_referral_links'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE 'Unique referral tracking system created successfully';
  ELSE
    RAISE NOTICE 'Failed to create unique referral tracking system';
  END IF;
END $$;
