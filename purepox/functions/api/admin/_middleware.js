import { isAuthed } from '../../_lib/auth.js'
import { json } from '../../_lib/util.js'

export async function onRequest(ctx) {
  const path = new URL(ctx.request.url).pathname
  if (path === '/api/admin/login') return ctx.next()
  if (!(await isAuthed(ctx.request, ctx.env))) return json({ error: 'unauthorized' }, 401)
  return ctx.next()
}
