-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
    ('app_name', 'BT Community', 'Application name displayed throughout the app'),
    ('app_version', '1.0.0', 'Current application version'),
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode for the app'),
    ('max_referrals_per_user', '100', 'Maximum number of referrals a user can have'),
    ('min_withdrawal_amount', '100', 'Minimum withdrawal amount in BDT'),
    ('referral_reward_amount', '50', 'Default reward amount for each referral in BDT'),
    ('daily_task_limit', '10', 'Maximum number of daily tasks a user can complete'),
    ('auto_approval_enabled', 'false', 'Enable automatic approval for certain tasks')
ON CONFLICT (setting_key) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role; 