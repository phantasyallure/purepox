import { clearCookie } from '../../_lib/auth.js'
import { json } from '../../_lib/util.js'

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() })
}
