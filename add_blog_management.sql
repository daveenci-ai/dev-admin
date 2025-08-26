-- Blog Management Enhancement
-- Add blog categories and schedules to existing database

-- Create blog categories table
CREATE TABLE IF NOT EXISTS blog_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blog schedules table
CREATE TABLE IF NOT EXISTS blog_schedules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
    topics JSON DEFAULT '[]',
    frequency VARCHAR(20) NOT NULL,
    weekly_days JSON DEFAULT '[]',
    monthly_day INTEGER,
    time_local VARCHAR(10) NOT NULL,
    timezone VARCHAR(64) DEFAULT 'America/Chicago',
    is_active BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id column to existing blog_posts table
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS category_id INTEGER 
REFERENCES blog_categories(id) ON DELETE SET NULL;

-- Insert predefined categories
INSERT INTO blog_categories (name, slug, description) VALUES
    ('Energy Automation', 'energy-automation', 'AI-powered automation solutions for energy companies'),
    ('Energy Operations', 'energy-operations', 'Digital transformation and operational efficiency for energy sector'),
    ('Energy Compliance', 'energy-compliance', 'Compliance, safety, and regulatory automation for energy companies'),
    ('Energy Business', 'energy-business', 'Business development and management tools for energy sector'),
    ('Energy Technology', 'energy-tech', 'Advanced technology solutions and innovations for energy industry'),
    ('Energy Data', 'energy-data', 'Data management and analytics solutions for energy companies')
ON CONFLICT (slug) DO NOTHING;

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_schedules_category_id ON blog_schedules(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_schedules_next_run ON blog_schedules(next_run_at) WHERE is_active = true AND is_paused = false;
CREATE INDEX IF NOT EXISTS idx_blog_schedules_active ON blog_schedules(is_active, is_paused);

-- Update the existing category_id index on blog_posts (it already exists but column was missing)
-- The index will automatically work once the column is added

-- Verify tables were created
SELECT 'Blog categories table created' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_categories');

SELECT 'Blog schedules table created' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_schedules');

SELECT 'Category column added to blog_posts' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'category_id');
