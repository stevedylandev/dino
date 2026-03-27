// Game physics and scoring constants
// Used by both client (DinoGame) and server (validation)
export const GAME_CONFIG = {
  SCORE_INCREASE_RATE: 6,        // frames per score point
  JUMP_AIRBORNE_FRAMES: 40,      // minimum frames between jumps
  WALL_CLOCK_TOLERANCE: 0.75,    // 75% of expected real-time duration
  LEVEL_SCORE_THRESHOLD: 100,    // score points per level
  LEVEL_FRAME_TOLERANCE: 0.05,   // 5% tolerance for level-up timing
  MAX_PLAYER_NAME_LENGTH: 3,     // enforced on both client and server
  MAX_SCORE: 99999,              // reasonable upper bound
  MAX_SESSION_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  CLOCK_DRIFT_ALLOWANCE_MS: 60000, // 60 seconds future tolerance (handles clock drift)
}

export const FRAME_RATE = 60
