-- Update the impacts table to use source instead of user_inputed
ALTER TABLE impacts ADD COLUMN source TEXT;

-- Update existing impacts to have source as article reference
UPDATE impacts SET source = CONCAT('/article/', article_id) WHERE source IS NULL;

-- Update evidence table to use source instead of user_inputed
ALTER TABLE evidence ADD COLUMN source TEXT;

-- Update existing evidence to have source as 'user' (since we don't know the original source)
UPDATE evidence SET source = 'user' WHERE source IS NULL;

-- Create an index for better performance on source lookups
CREATE INDEX IF NOT EXISTS idx_impacts_source ON impacts(source);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence(source);
