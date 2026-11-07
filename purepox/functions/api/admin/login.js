import { checkPassword, makeCookie } from '../../_lib/auth.js'
import { json, bad } from '../../_lib/util.js'

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return bad('not_configured', 503)
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  if (!(await checkPassword(env, b.password))) {
    await new Promise((r) => setTimeout(r, 700)) // slow down guessing
    return bad('wrong_password', 401)
  }
  return json({ ok: true }, 200, { 'set-cookie': await makeCookie(env, request) })
}
