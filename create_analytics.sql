-- Create tables for analytics and tracking user learning patterns

-- User daily stats table
CREATE TABLE IF NOT EXISTS user_daily_stats (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id),
    date DATE NOT NULL,
    problems_solved INTEGER DEFAULT 0,
    problems_attempted INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- in seconds
    streak_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Problem interaction logs
CREATE TABLE IF NOT EXISTS problem_interactions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id),
    problem_slug TEXT NOT NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'hint_request', 'step_request', 'solution_request', 'mark_solved')),
    interaction_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User learning patterns (for AI recommendations)
CREATE TABLE IF NOT EXISTS user_learning_patterns (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id),
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('weak_topics', 'strong_topics', 'preferred_difficulty', 'learning_speed')),
    pattern_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pattern_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_daily_stats_user_date ON user_daily_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_problem_interactions_user_id ON problem_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_problem_interactions_type ON problem_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_learning_patterns_user_id ON user_learning_patterns(user_id);
