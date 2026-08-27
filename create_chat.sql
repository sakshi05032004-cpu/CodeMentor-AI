-- Create tables for chat functionality and user progress tracking

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id),
    problem_slug TEXT NOT NULL,
    problem_title TEXT NOT NULL,
    problem_difficulty TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'hint', 'step', 'solution', 'analysis')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User problem progress table
CREATE TABLE IF NOT EXISTS user_problem_progress (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id),
    problem_slug TEXT NOT NULL,
    problem_title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unsolved' CHECK (status IN ('unsolved', 'attempted', 'solved', 'mastered')),
    hints_used INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- in seconds
    first_solved_at TIMESTAMP WITH TIME ZONE,
    last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, problem_slug)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id) UNIQUE,
    hint_style TEXT DEFAULT 'progressive' CHECK (hint_style IN ('progressive', 'direct', 'socratic')),
    difficulty_preference TEXT DEFAULT 'mixed' CHECK (difficulty_preference IN ('easy', 'medium', 'hard', 'mixed')),
    daily_goal INTEGER DEFAULT 1,
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_problem_slug ON chat_conversations(problem_slug);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user_id ON user_problem_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_status ON user_problem_progress(status);
