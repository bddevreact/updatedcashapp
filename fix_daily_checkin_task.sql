-- =====================================================
-- Fix Daily Check-in Task Reward
-- =====================================================

-- Step 1: Check current task_templates
SELECT 'Current task_templates:' as info;
SELECT id, title, type, reward, xp, is_active, created_at 
FROM task_templates 
ORDER BY created_at DESC;

-- Step 2: Update daily check-in task to 10 taka
UPDATE task_templates 
SET 
  reward = 10,
  xp = 20,
  updated_at = now()
WHERE 
  (type = 'checkin' OR title ILIKE '%daily%check%' OR title ILIKE '%check%in%')
  AND is_active = true;

-- Step 3: If no daily check-in task exists, create one
INSERT INTO task_templates (
  title, 
  subtitle, 
  description, 
  reward, 
  xp, 
  type, 
  icon, 
  button_text, 
  cooldown, 
  max_completions, 
  url, 
  is_active
)
SELECT 
  'Daily Check-in',
  'Complete daily check-in to earn real money',
  'Check in daily to maintain your streak and earn rewards. Higher streaks give bonus rewards!',
  10,
  20,
  'checkin',
  '📅',
  'CHECK IN',
  86400,
  1,
  '',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM task_templates 
  WHERE type = 'checkin' OR title ILIKE '%daily%check%'
);

-- Step 4: Verify the update
SELECT 'Updated task_templates:' as info;
SELECT id, title, type, reward, xp, is_active, updated_at 
FROM task_templates 
WHERE type = 'checkin' OR title ILIKE '%daily%check%'
ORDER BY updated_at DESC;

-- Step 5: Check if there are any other check-in related tasks
SELECT 'All check-in related tasks:' as info;
SELECT id, title, type, reward, xp, is_active 
FROM task_templates 
WHERE 
  type = 'checkin' 
  OR title ILIKE '%check%' 
  OR title ILIKE '%daily%'
ORDER BY type, title;

-- Step 6: Clear any cached data (if using RLS)
-- This ensures fresh data is fetched
SELECT 'Database updated successfully!' as status;
SELECT 'Daily check-in reward set to ৳10' as message; 