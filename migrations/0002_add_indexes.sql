-- Add composite index for tie-breaking and efficient sorting
CREATE INDEX IF NOT EXISTS idx_scores_score_created 
  ON scores (score DESC, created_at DESC);

-- Add index for player lookups (for potential future features)
CREATE INDEX IF NOT EXISTS idx_scores_player 
  ON scores (player_name);
