CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resume_name TEXT,
  summary TEXT,
  readiness_score INTEGER,
  target_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES resume_analyses(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES resume_analyses(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  match_score INTEGER NOT NULL,
  matching_skills TEXT[] NOT NULL,
  missing_skills TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES resume_analyses(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  learning_description TEXT NOT NULL,
  estimated_duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_created_at ON resume_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_analysis_analysis_id ON skills_analysis(analysis_id);
CREATE INDEX IF NOT EXISTS idx_job_recommendations_analysis_id ON job_recommendations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_learning_recommendations_analysis_id ON learning_recommendations(analysis_id);

-- Example RLS policy pattern for Supabase:
-- ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own analyses" ON resume_analyses FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert their own analyses" ON resume_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update their own analyses" ON resume_analyses FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete their own analyses" ON resume_analyses FOR DELETE USING (auth.uid() = user_id);
