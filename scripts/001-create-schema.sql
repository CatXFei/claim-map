-- Create the database schema for impact analysis

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  impacting_entity TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS impacts (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  impacting_entity TEXT NOT NULL,
  impacted_entity TEXT NOT NULL,
  impact TEXT NOT NULL,
  score DECIMAL(3,2) CHECK (score >= -1 AND score <= 1),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  user_votes_up INTEGER DEFAULT 0,
  user_votes_down INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence (
  id SERIAL PRIMARY KEY,
  impact_id INTEGER REFERENCES impacts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_votes (
  id SERIAL PRIMARY KEY,
  impact_id INTEGER REFERENCES impacts(id) ON DELETE CASCADE,
  user_session TEXT NOT NULL,
  vote_type VARCHAR(10) CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(impact_id, user_session)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_impacts_article_id ON impacts(article_id);
CREATE INDEX IF NOT EXISTS idx_evidence_impact_id ON evidence(impact_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_impact_id ON user_votes(impact_id);
