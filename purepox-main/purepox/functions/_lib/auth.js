// Single-admin auth: password in the ADMIN_PASSWORD secret, signed HttpOnly cookie session.
const enc = new TextEncoder()
const DAYS = 7

const b64 = (bytes) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))))
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

const secretOf = (env) => env.SESSION_SECRET || env.ADMIN_PASSWORD || ''

export async function checkPassword(env, input) {
  if (!env.ADMIN_PASSWORD) return false
  return safeEqual(await sign('pw', String(input ?? '')), await sign('pw', env.ADMIN_PASSWORD))
}

export async function makeCookie(env, request) {
  const exp = String(Date.now() + DAYS * 86400e3)
  const token = `${exp}.${await sign(secretOf(env), exp)}`
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `pp_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DAYS * 86400}${secure}`
}

export const clearCookie = () => 'pp_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'

export async function isAuthed(request, env) {
  const secret = secretOf(env)
  if (!secret) return false
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)pp_admin=([^;]+)/)
  if (!m) return false
  const [exp, sig] = m[1].split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  return safeEqual(sig, await sign(secret, exp))
}
