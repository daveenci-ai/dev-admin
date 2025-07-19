-- Add missing tables for Chatbot Logs and Smart Assistant systems
-- This script is SAFE - it only adds new tables, doesn't modify existing ones

-- Table for Chatbot Conversations (Chatbot Logs system)
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    context TEXT,
    intent VARCHAR(100),
    confidence DECIMAL(3,2),
    response_time INTEGER,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    metadata TEXT,
    created_at TIMESTAMP(3) DEFAULT now() NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT now() NOT NULL
);

-- Indexes for chatbot_conversations
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session ON public.chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created ON public.chatbot_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_intent ON public.chatbot_conversations(intent);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_confidence ON public.chatbot_conversations(confidence);

-- Table for Avatar Generations (Avatar Generator system)
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

-- Indexes for avatar_generations
CREATE INDEX IF NOT EXISTS idx_avatar_generations_status ON public.avatar_generations(status);
CREATE INDEX IF NOT EXISTS idx_avatar_generations_created ON public.avatar_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_avatar_generations_replicate ON public.avatar_generations(replicate_id);

-- Table for Assistant Queries (Smart Assistant system)
CREATE TABLE IF NOT EXISTS public.assistant_queries (
    id SERIAL PRIMARY KEY,
    natural_query TEXT NOT NULL,
    generated_sql TEXT,
    explanation TEXT,
    result_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    context TEXT,
    execution_time INTEGER,
    created_at TIMESTAMP(3) DEFAULT now() NOT NULL
);

-- Indexes for assistant_queries
CREATE INDEX IF NOT EXISTS idx_assistant_queries_status ON public.assistant_queries(status);
CREATE INDEX IF NOT EXISTS idx_assistant_queries_created ON public.assistant_queries(created_at);

-- Update existing tables if needed (safe updates only)
-- These are safe because they only add columns or constraints that don't exist

-- Add any missing columns to existing tables (if they don't exist)
DO $$ 
BEGIN
    -- Add any missing columns here if needed
    -- This is just a placeholder - your existing tables look complete
    NULL;
END $$; 