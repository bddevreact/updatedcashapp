-- =====================================================
-- Check and Fix Unique Constraint Issues
-- =====================================================

-- Check current constraints on task_templates
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'task_templates'::regclass;

-- Check if there are any duplicate titles
SELECT 
    title,
    COUNT(*) as count
FROM task_templates 
GROUP BY title 
HAVING COUNT(*) > 1;

-- Check the exact structure of the task_templates table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'task_templates' 
ORDER BY ordinal_position;

-- Check if there are any triggers that might be interfering
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'task_templates';

-- Test a simple update to see if it works
UPDATE task_templates 
SET updated_at = NOW() 
WHERE id = (
    SELECT id FROM task_templates LIMIT 1
);

-- Check if the update worked
SELECT 
    id,
    title,
    updated_at
FROM task_templates 
ORDER BY updated_at DESC 
LIMIT 1;

-- If there's a unique constraint on title, let's temporarily drop it for testing
-- ALTER TABLE task_templates DROP CONSTRAINT IF EXISTS task_templates_title_key;

-- Re-add the unique constraint if needed
-- ALTER TABLE task_templates ADD CONSTRAINT task_templates_title_key UNIQUE (title);
