function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createToken(secret) {
  const nonce = base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)))
  const issuedAt = Date.now()
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ nonce, issuedAt })))
  const key = await getHmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return { token: payload + '.' + base64UrlEncode(signature), nonce, issuedAt }
}

export async function verifyToken(tokenString, secret) {
  if (typeof tokenString !== 'string') return null
  const parts = tokenString.split('.')
  if (parts.length !== 2) return null

  const [payloadB64, signatureB64] = parts

  try {
    const key = await getHmacKey(secret)
    const signatureBuffer = base64UrlDecode(signatureB64)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      new TextEncoder().encode(payloadB64)
    )
    if (!valid) return null

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64))
    const payload = JSON.parse(payloadJson)
    if (typeof payload.nonce !== 'string' || typeof payload.issuedAt !== 'number') return null

    return payload
  } catch {
    return null
  }
}
