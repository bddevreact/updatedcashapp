-- =====================================================
-- Test Daily Check-in Task Values
-- =====================================================

-- Check if daily check-in task exists and has correct values
SELECT 
  'Daily Check-in Task Status:' as info,
  id,
  title,
  type,
  reward,
  xp,
  is_active,
  created_at,
  updated_at
FROM task_templates 
WHERE type = 'checkin' OR title ILIKE '%daily%check%'
ORDER BY updated_at DESC;

-- Check all active tasks
SELECT 
  'All Active Tasks:' as info,
  id,
  title,
  type,
  reward,
  xp,
  is_active
FROM task_templates 
WHERE is_active = true
ORDER BY type, title;

-- Check if there are any duplicate or conflicting tasks
SELECT 
  'Potential Conflicts:' as info,
  type,
  COUNT(*) as count,
  STRING_AGG(title, ', ') as titles
FROM task_templates 
WHERE is_active = true
GROUP BY type
HAVING COUNT(*) > 1
ORDER BY type; 