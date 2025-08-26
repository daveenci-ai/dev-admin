-- Add prompt fields to blog_schedules table
ALTER TABLE blog_schedules 
ADD COLUMN IF NOT EXISTS general_prompt TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS negative_prompt TEXT DEFAULT '';

-- Update existing records to have empty prompts if they don't already
UPDATE blog_schedules 
SET general_prompt = COALESCE(general_prompt, ''),
    negative_prompt = COALESCE(negative_prompt, '')
WHERE general_prompt IS NULL OR negative_prompt IS NULL;
