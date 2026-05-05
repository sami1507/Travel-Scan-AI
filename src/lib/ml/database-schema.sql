-- ML Training Examples Table
-- Stores training examples for future fine-tuning and ML model development

CREATE TABLE IF NOT EXISTS ml_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  example_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  analysis_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Features (stored as JSONB for flexibility)
  user_features JSONB NOT NULL,
  item_features JSONB NOT NULL,
  context_features JSONB NOT NULL,
  
  -- Outcome
  outcome JSONB NOT NULL,
  
  -- Metadata
  data_version TEXT NOT NULL DEFAULT '1.0',
  example_type TEXT NOT NULL CHECK (example_type IN (
    'recommendation-acceptance',
    'destination-relevance',
    'route-suitability',
    'accommodation-suitability'
  )),
  quality_score DECIMAL(3, 2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 1),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ml_examples_user_id ON ml_training_examples(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_examples_example_type ON ml_training_examples(example_type);
CREATE INDEX IF NOT EXISTS idx_ml_examples_quality_score ON ml_training_examples(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_ml_examples_timestamp ON ml_training_examples(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_examples_data_version ON ml_training_examples(data_version);

-- Index for outcome queries
CREATE INDEX IF NOT EXISTS idx_ml_examples_outcome_accepted ON ml_training_examples((outcome->>'wasAccepted'));

-- Composite index for high-quality example retrieval
CREATE INDEX IF NOT EXISTS idx_ml_examples_quality_type ON ml_training_examples(quality_score DESC, example_type);

-- Enable Row Level Security
ALTER TABLE ml_training_examples ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin users can read all training examples
CREATE POLICY "Admin users can read all training examples"
  ON ml_training_examples
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- System can insert training examples
CREATE POLICY "System can insert training examples"
  ON ml_training_examples
  FOR INSERT
  WITH CHECK (true);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_ml_examples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ml_examples_updated_at
  BEFORE UPDATE ON ml_training_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_examples_updated_at();

-- Comments
COMMENT ON TABLE ml_training_examples IS 'Stores ML training examples for fine-tuning and model development';
COMMENT ON COLUMN ml_training_examples.user_features IS 'User characteristics and preferences (JSONB)';
COMMENT ON COLUMN ml_training_examples.item_features IS 'Destination/recommendation features (JSONB)';
COMMENT ON COLUMN ml_training_examples.context_features IS 'Query and context features (JSONB)';
COMMENT ON COLUMN ml_training_examples.outcome IS 'User interaction outcome (JSONB)';
COMMENT ON COLUMN ml_training_examples.quality_score IS 'Example quality score (0-1)';
COMMENT ON COLUMN ml_training_examples.example_type IS 'Type of training example';
