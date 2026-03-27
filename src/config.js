// Game physics and scoring constants
// Used by both client (DinoGame) and server (validation)
export const GAME_CONFIG = {
  SCORE_INCREASE_RATE: 6,        // frames per score point
  WALL_CLOCK_TOLERANCE: 0.75,    // 75% of expected real-time duration
  MAX_PLAYER_NAME_LENGTH: 3,     // enforced on both client and server
  MAX_SCORE: 99999,              // reasonable upper bound
  MAX_SESSION_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  MIN_GAME_DURATION_MS: 1000,    // absolute minimum game duration (1 second)
}

export const FRAME_RATE = 60
