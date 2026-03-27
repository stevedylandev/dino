import { GAME_CONFIG } from '../../src/config.js'

// Helper functions for consistent JSON responses
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

export const onRequestPost = async ({ request, env }) => {
  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON')
  }

  const { playerName, score, eventLog } = body

  // Basic type validation
  if (
    typeof playerName !== 'string' ||
    typeof score !== 'number' ||
    !Array.isArray(eventLog)
  ) {
    return errorResponse('Invalid request body')
  }

  // Validate and get server-computed score
  const validation = validateEventLog(eventLog, score, playerName)
  if (!validation.ok) {
    // Log validation failure for debugging (visible in Cloudflare logs)
    console.warn('Score validation failed:', {
      reason: validation.reason,
      playerName,
      claimedScore: score,
      eventLogLength: eventLog.length,
      details: validation.details || {},
    })
    return errorResponse('Score validation failed')
  }

  try {
    const endEvent = eventLog[eventLog.length - 1]
    const startEvent = eventLog[0]

    await env.DB
      .prepare(
        `INSERT INTO scores (player_name, score, end_frame, duration_ms) VALUES (?, ?, ?, ?)`
      )
      .bind(
        playerName.slice(0, GAME_CONFIG.MAX_PLAYER_NAME_LENGTH),
        score,
        endEvent.frame,
        endEvent.ts - startEvent.ts
      )
      .run()

    return jsonResponse({ ok: true, score: score })
  } catch (err) {
    console.error('Database error:', err)
    return errorResponse('Database error', 500)
  }
}

function validateEventLog(eventLog, claimedScore, playerName) {
  // Name validation
  if (playerName.length > GAME_CONFIG.MAX_PLAYER_NAME_LENGTH) {
    return { ok: false, reason: 'INVALID_NAME_LENGTH' }
  }

  // Score bounds validation
  if (claimedScore > GAME_CONFIG.MAX_SCORE || claimedScore < 0) {
    return { ok: false, reason: 'INVALID_SCORE_RANGE' }
  }

  // Event log structure validation
  if (!eventLog || eventLog.length < 2) {
    return { ok: false, reason: 'INSUFFICIENT_EVENTS' }
  }

  // Validate event structure before processing
  for (const event of eventLog) {
    if (
      !event ||
      typeof event.frame !== 'number' ||
      typeof event.ts !== 'number' ||
      typeof event.type !== 'string'
    ) {
      return { ok: false, reason: 'MALFORMED_EVENT' }
    }
  }

  // Validate bookends
  if (eventLog[0].type !== 'START' || eventLog[eventLog.length - 1].type !== 'END') {
    return { ok: false, reason: 'INVALID_BOOKENDS' }
  }

  let lastFrame = -1
  let lastTs = -1
  let lastJumpFrame = -Infinity
  let prevLevel = 0

  for (let i = 0; i < eventLog.length; i++) {
    const event = eventLog[i]

    // Monotonic frame validation
    if (event.frame < lastFrame) {
      return { ok: false, reason: 'FRAME_NOT_MONOTONIC' }
    }

    // Monotonic timestamp validation
    if (event.ts < lastTs) {
      return { ok: false, reason: 'TIMESTAMP_NOT_MONOTONIC' }
    }

    lastFrame = event.frame
    lastTs = event.ts

    // Jump physics validation
    if (event.type === 'JUMP') {
      if (lastFrame - lastJumpFrame < GAME_CONFIG.JUMP_AIRBORNE_FRAMES) {
        return { ok: false, reason: 'INVALID_JUMP_TIMING' }
      }
      lastJumpFrame = lastFrame
    }

    // Level timing validation
    if (event.type === 'LEVEL') {
      const expectedFrame = event.value * GAME_CONFIG.LEVEL_SCORE_THRESHOLD * GAME_CONFIG.SCORE_INCREASE_RATE
      const tolerance = expectedFrame * GAME_CONFIG.LEVEL_FRAME_TOLERANCE
      if (Math.abs(event.frame - expectedFrame) > tolerance) {
        return { ok: false, reason: 'INVALID_LEVEL_TIMING' }
      }

      // Level progression validation (no skipping levels)
      if (event.value > prevLevel + 1) {
        return { ok: false, reason: 'LEVEL_SKIP_DETECTED' }
      }
      prevLevel = event.value
    }
  }

  const endEvent = eventLog[eventLog.length - 1]
  const endFrame = endEvent.frame
  const endTs = endEvent.ts
  const startEvent = eventLog[0]
  const startTs = startEvent.ts

  // Score calculation validation
  const expectedScore = Math.floor(endFrame / GAME_CONFIG.SCORE_INCREASE_RATE)
  if (Math.abs(expectedScore - claimedScore) > 1) {
    return { ok: false, reason: 'SCORE_MISMATCH' }
  }

  // Wall clock timing validation
  const minDuration = endFrame * (1000 / 60) * GAME_CONFIG.WALL_CLOCK_TOLERANCE
  if (endTs - startTs < minDuration) {
    return { ok: false, reason: 'WALL_CLOCK_TOO_FAST' }
  }

  // Timestamp sanity checks
  const now = Date.now()
  const oldestAllowed = now - GAME_CONFIG.MAX_SESSION_AGE_MS
  if (startTs < oldestAllowed) {
    return { ok: false, reason: 'TIMESTAMP_TOO_OLD', details: { age: now - startTs } }
  }
  if (startTs > now + GAME_CONFIG.CLOCK_DRIFT_ALLOWANCE_MS) {
    return { 
      ok: false, 
      reason: 'TIMESTAMP_IN_FUTURE', 
      details: { 
        clientStartTs: startTs, 
        serverNow: now, 
        driftMs: startTs - now 
      } 
    }
  }

  // Level cap validation
  const maxLevel = Math.floor(expectedScore / GAME_CONFIG.LEVEL_SCORE_THRESHOLD)
  if (prevLevel > maxLevel) {
    return { ok: false, reason: 'LEVEL_TOO_HIGH' }
  }

  return { ok: true, score: expectedScore }
}
