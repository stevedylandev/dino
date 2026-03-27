import { createToken } from './_hmac.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet = async ({ env }) => {
  if (!env.HMAC_SECRET) {
    return jsonResponse({ error: 'Server misconfigured' }, 500)
  }

  try {
    const { token } = await createToken(env.HMAC_SECRET)
    return jsonResponse({ token })
  } catch (err) {
    console.error('Failed to create challenge token:', err)
    return jsonResponse({ error: 'Failed to create challenge' }, 500)
  }
}
