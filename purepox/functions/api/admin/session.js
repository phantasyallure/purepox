import { json } from '../../_lib/util.js'

// The middleware already rejected unauthenticated calls
export async function onRequestGet() {
  return json({ ok: true })
}
