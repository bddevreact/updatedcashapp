-- Admin Referral Dashboard Functions
-- These functions provide system-wide referral analytics for admins

-- Function to get admin referral statistics
CREATE OR REPLACE FUNCTION get_admin_referral_stats(
  p_period text DEFAULT 'all',
  p_group_username text DEFAULT NULL
)
RETURNS TABLE (
  totalReferrals bigint,
  activeReferrals bigint,
  todayReferrals bigint,
  weekReferrals bigint,
  monthReferrals bigint,
  totalReferrers bigint,
  totalGroups bigint,
  averageReferralsPerUser numeric
) AS $$
DECLARE
  period_filter text;
BEGIN
  -- Set period filter
  CASE p_period
    WHEN 'today' THEN period_filter := 'AND joined_at >= CURRENT_DATE';
    WHEN 'week' THEN period_filter := 'AND joined_at >= CURRENT_DATE - INTERVAL ''7 days''';
    WHEN 'month' THEN period_filter := 'AND joined_at >= CURRENT_DATE - INTERVAL ''30 days''';
    ELSE period_filter := '';
  END CASE;

  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total_refs,
      COUNT(*) FILTER (WHERE status = 'active') as active_refs,
      COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE) as today_refs,
      COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE - INTERVAL '7 days') as week_refs,
      COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE - INTERVAL '30 days') as month_refs,
      COUNT(DISTINCT referrer_id) as unique_referrers,
      COUNT(DISTINCT group_username) as unique_groups
    FROM referral_joins rj
    WHERE (p_group_username IS NULL OR rj.group_username = p_group_username)
      AND period_filter = '' OR joined_at >= CASE p_period
        WHEN 'today' THEN CURRENT_DATE
        WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
        WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
        ELSE '1970-01-01'::date
      END
  )
  SELECT 
    s.total_refs,
    s.active_refs,
    s.today_refs,
    s.week_refs,
    s.month_refs,
    s.unique_referrers,
    s.unique_groups,
    CASE 
      WHEN s.unique_referrers > 0 THEN s.total_refs::numeric / s.unique_referrers
      ELSE 0
    END as avg_per_user
  FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- Function to get admin top referrers
CREATE OR REPLACE FUNCTION get_admin_top_referrers(
  p_limit integer DEFAULT 10,
  p_group_username text DEFAULT NULL
)
RETURNS TABLE (
  referrer_id text,
  username text,
  first_name text,
  total_referrals bigint,
  active_referrals bigint,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rj.referrer_id,
    u.username,
    u.first_name,
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE rj.status = 'active') as active_referrals,
    ROUND(
      (COUNT(*) FILTER (WHERE rj.status = 'active')::numeric / COUNT(*) * 100), 1
    ) as success_rate
  FROM referral_joins rj
  JOIN users u ON rj.referrer_id = u.telegram_id
  WHERE (p_group_username IS NULL OR rj.group_username = p_group_username)
  GROUP BY rj.referrer_id, u.username, u.first_name
  ORDER BY total_referrals DESC, success_rate DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get group referral performance
CREATE OR REPLACE FUNCTION get_group_referral_performance(
  p_period text DEFAULT 'all'
)
RETURNS TABLE (
  group_username text,
  total_joins bigint,
  active_joins bigint,
  unique_referrers bigint,
  conversion_rate numeric
) AS $$
DECLARE
  period_filter text;
BEGIN
  -- Set period filter
  CASE p_period
    WHEN 'today' THEN period_filter := 'AND joined_at >= CURRENT_DATE';
    WHEN 'week' THEN period_filter := 'AND joined_at >= CURRENT_DATE - INTERVAL ''7 days''';
    WHEN 'month' THEN period_filter := 'AND joined_at >= CURRENT_DATE - INTERVAL ''30 days''';
    ELSE period_filter := '';
  END CASE;

  RETURN QUERY
  SELECT 
    rj.group_username,
    COUNT(*) as total_joins,
    COUNT(*) FILTER (WHERE rj.status = 'active') as active_joins,
    COUNT(DISTINCT rj.referrer_id) as unique_referrers,
    ROUND(
      (COUNT(*) FILTER (WHERE rj.status = 'active')::numeric / COUNT(*) * 100), 1
    ) as conversion_rate
  FROM referral_joins rj
  WHERE period_filter = '' OR joined_at >= CASE p_period
    WHEN 'today' THEN CURRENT_DATE
    WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
    ELSE '1970-01-01'::date
  END
  GROUP BY rj.group_username
  ORDER BY total_joins DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious referral activities
CREATE OR REPLACE FUNCTION detect_suspicious_referrals(
  p_threshold integer DEFAULT 50
)
RETURNS TABLE (
  referrer_id text,
  username text,
  suspicious_pattern text,
  risk_level text,
  details text
) AS $$
BEGIN
  RETURN QUERY
  WITH suspicious AS (
    SELECT 
      rj.referrer_id,
      u.username,
      CASE 
        WHEN COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE) > p_threshold THEN 'High daily referrals'
        WHEN COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE - INTERVAL '1 hour') > 10 THEN 'Rapid referrals'
        WHEN COUNT(*) FILTER (WHERE status = 'left')::numeric / COUNT(*) > 0.8 THEN 'High leave rate'
        ELSE 'Unusual pattern'
      END as pattern,
      CASE 
        WHEN COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE) > p_threshold THEN 'high'
        WHEN COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE - INTERVAL '1 hour') > 10 THEN 'medium'
        WHEN COUNT(*) FILTER (WHERE status = 'left')::numeric / COUNT(*) > 0.8 THEN 'medium'
        ELSE 'low'
      END as risk,
      CASE 
        WHEN COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE) > p_threshold THEN 
          'User got ' || COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE) || ' referrals today (threshold: ' || p_threshold || ')'
        WHEN COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE - INTERVAL '1 hour') > 10 THEN 
          'User got ' || COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE - INTERVAL '1 hour') || ' referrals in last hour'
        WHEN COUNT(*) FILTER (WHERE status = 'left')::numeric / COUNT(*) > 0.8 THEN 
          'High leave rate: ' || ROUND((COUNT(*) FILTER (WHERE status = 'left')::numeric / COUNT(*) * 100), 1) || '%'
        ELSE 
          'Pattern analysis needed'
      END as detail
    FROM referral_joins rj
    JOIN users u ON rj.referrer_id = u.telegram_id
    WHERE joined_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY rj.referrer_id, u.username
    HAVING 
      COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE) > p_threshold OR
      COUNT(*) FILTER (WHERE joined_at >= CURRENT_DATE - INTERVAL '1 hour') > 10 OR
      COUNT(*) FILTER (WHERE status = 'left')::numeric / COUNT(*) > 0.8
  )
  SELECT 
    s.referrer_id,
    s.username,
    s.pattern,
    s.risk,
    s.detail
  FROM suspicious s
  ORDER BY 
    CASE s.risk
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END,
    s.pattern;
END;
$$ LANGUAGE plpgsql;

-- Function to get referral trends over time
CREATE OR REPLACE FUNCTION get_referral_trends(
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  date_label text,
  total_referrals bigint,
  active_referrals bigint,
  new_referrers bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(date_series.date, 'Mon DD') as date_label,
    COALESCE(COUNT(rj.id), 0) as total_referrals,
    COALESCE(COUNT(rj.id) FILTER (WHERE rj.status = 'active'), 0) as active_referrals,
    COALESCE(COUNT(DISTINCT rj.referrer_id) FILTER (WHERE rj.joined_at::date = date_series.date), 0) as new_referrers,
    CASE 
      WHEN COUNT(rj.id) > 0 THEN 
        ROUND((COUNT(rj.id) FILTER (WHERE rj.status = 'active')::numeric / COUNT(rj.id) * 100), 1)
      ELSE 0
    END as conversion_rate
  FROM generate_series(
    CURRENT_DATE - (p_days_back || ' days')::interval,
    CURRENT_DATE,
    '1 day'::interval
  ) as date_series(date)
  LEFT JOIN referral_joins rj ON rj.joined_at::date = date_series.date
  GROUP BY date_series.date
  ORDER BY date_series.date;
END;
$$ LANGUAGE plpgsql;

-- Function to get referral source analysis
CREATE OR REPLACE FUNCTION get_referral_source_analysis(
  p_period text DEFAULT 'all'
)
RETURNS TABLE (
  referral_code text,
  total_uses bigint,
  unique_users bigint,
  success_rate numeric,
  avg_time_to_join interval
) AS $$
DECLARE
  period_filter text;
BEGIN
  -- Set period filter
  CASE p_period
    WHEN 'today' THEN period_filter := 'AND rj.joined_at >= CURRENT_DATE';
    WHEN 'week' THEN period_filter := 'AND rj.joined_at >= CURRENT_DATE - INTERVAL ''7 days''';
    WHEN 'month' THEN period_filter := 'AND rj.joined_at >= CURRENT_DATE - INTERVAL ''30 days''';
    ELSE period_filter := '';
  END CASE;

  RETURN QUERY
  SELECT 
    rj.referral_code,
    COUNT(*) as total_uses,
    COUNT(DISTINCT rj.user_id) as unique_users,
    ROUND(
      (COUNT(*) FILTER (WHERE rj.status = 'active')::numeric / COUNT(*) * 100), 1
    ) as success_rate,
    AVG(rj.joined_at - rj.created_at) as avg_time_to_join
  FROM referral_joins rj
  WHERE period_filter = '' OR rj.joined_at >= CASE p_period
    WHEN 'today' THEN CURRENT_DATE
    WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
    ELSE '1970-01-01'::date
  END
  GROUP BY rj.referral_code
  ORDER BY total_uses DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to admin functions
GRANT EXECUTE ON FUNCTION get_admin_referral_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_top_referrers TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_referral_performance TO authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_referrals TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_source_analysis TO authenticated;

-- Create admin referral analytics view
CREATE OR REPLACE VIEW admin_referral_analytics AS
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
  EXTRACT(EPOCH FROM (now() - rj.joined_at)) / 86400 as days_since_join,
  CASE 
    WHEN rj.status = 'active' THEN 'Active Member'
    WHEN rj.status = 'left' THEN 'Left Group'
    WHEN rj.status = 'kicked' THEN 'Removed'
    ELSE 'Unknown'
  END as status_description
FROM referral_joins rj
JOIN users referrer ON rj.referrer_id = referrer.telegram_id
ORDER BY rj.joined_at DESC;

-- Grant view permissions
GRANT SELECT ON admin_referral_analytics TO authenticated; 