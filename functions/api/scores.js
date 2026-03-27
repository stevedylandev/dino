import { GAME_CONFIG, FRAME_RATE } from '../../src/config.js'
import { verifyToken } from './_hmac.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status)
}

export const onRequestGet = async ({ env }) => {
  try {
    const results = await env.DB
      .prepare('SELECT player_name, score FROM scores ORDER BY score DESC LIMIT 10')
      .all()

    return jsonResponse({ scores: results.results })
  } catch (err) {
    console.error('Failed to fetch scores:', err)
    return errorResponse('Failed to fetch scores', 500)
  }
}

export const onRequestPost = async ({ request, env, waitUntil }) => {
  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON')
  }

  const { playerName, score, token } = body

  if (
    typeof playerName !== 'string' ||
    typeof score !== 'number' ||
    typeof token !== 'string'
  ) {
    return errorResponse('Invalid request body')
  }

  // Name validation
  if (playerName.length > GAME_CONFIG.MAX_PLAYER_NAME_LENGTH || playerName.length === 0) {
    return errorResponse('Invalid player name')
  }

  // Score bounds
  if (score < 0 || score > GAME_CONFIG.MAX_SCORE || !Number.isInteger(score)) {
    return errorResponse('Invalid score')
  }

  // Verify token signature
  const payload = await verifyToken(token, env.HMAC_SECRET)
  if (!payload) {
    return errorResponse('Invalid session token')
  }

  const now = Date.now()
  const elapsed = now - payload.issuedAt

  // Session age check
  if (elapsed > GAME_CONFIG.MAX_SESSION_AGE_MS || elapsed < 0) {
    return errorResponse('Session expired')
  }

  // Minimum game duration: score requires at least this many ms
  const minDuration = Math.max(
    GAME_CONFIG.MIN_GAME_DURATION_MS,
    score * GAME_CONFIG.SCORE_INCREASE_RATE * (1000 / FRAME_RATE) * GAME_CONFIG.WALL_CLOCK_TOLERANCE
  )
  if (elapsed < minDuration) {
    return errorResponse('Score validation failed')
  }

  // Replay prevention
  try {
    const existing = await env.DB
      .prepare('SELECT nonce FROM used_tokens WHERE nonce = ?')
      .bind(payload.nonce)
      .first()

    if (existing) {
      return errorResponse('Session already used')
    }

    await env.DB
      .prepare('INSERT INTO used_tokens (nonce) VALUES (?)')
      .bind(payload.nonce)
      .run()
  } catch (err) {
    console.error('Token check error:', err)
    return errorResponse('Database error', 500)
  }

  // Insert score
  try {
    const durationMs = elapsed
    const endFrame = score * GAME_CONFIG.SCORE_INCREASE_RATE

    await env.DB
      .prepare(
        'INSERT INTO scores (player_name, score, end_frame, duration_ms) VALUES (?, ?, ?, ?)'
      )
      .bind(
        playerName.slice(0, GAME_CONFIG.MAX_PLAYER_NAME_LENGTH),
        score,
        endFrame,
        durationMs
      )
      .run()

    // Clean up old used tokens in the background
    waitUntil(
      env.DB
        .prepare("DELETE FROM used_tokens WHERE used_at < datetime('now', '-1 day')")
        .run()
        .catch(() => {})
    )

    return jsonResponse({ ok: true, score })
  } catch (err) {
    console.error('Database error:', err)
    return errorResponse('Database error', 500)
  }
}
