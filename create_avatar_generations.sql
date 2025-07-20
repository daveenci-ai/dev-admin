-- Create avatar_generations table for workflow tracking
-- This is separate from your existing avatars_generated table

CREATE TABLE IF NOT EXISTS public.avatar_generations (
    id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    lora_repository VARCHAR(255),
    lora_scale DECIMAL(3,2) DEFAULT 1.0,
    guidance_scale DECIMAL(4,1) DEFAULT 3.5,
    num_inference_steps INTEGER DEFAULT 28,
    seed INTEGER,
    aspect_ratio VARCHAR(10) DEFAULT '1:1',
    output_format VARCHAR(10) DEFAULT 'webp',
    output_quality INTEGER DEFAULT 80,
    safety_checker BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'pending',
    image_url TEXT,
    replicate_id VARCHAR(255),
    error_message TEXT,
    confidence DECIMAL(3,2),
    processing_time INTEGER,
    created_at TIMESTAMP(3) DEFAULT now() NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_avatar_generations_status ON public.avatar_generations(status);
CREATE INDEX IF NOT EXISTS idx_avatar_generations_created ON public.avatar_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_avatar_generations_replicate ON public.avatar_generations(replicate_id); 