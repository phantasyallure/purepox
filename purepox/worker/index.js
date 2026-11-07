// Cloudflare Worker entry: serves the API under /api/*.
// Everything else (the React site, /admin, /produit/...) is served from ./dist by the assets binding.
import * as pub from '../functions/api/public.js'
import * as orders from '../functions/api/orders.js'
import * as img from '../functions/api/img/[key].js'
import * as login from '../functions/api/admin/login.js'
import * as logout from '../functions/api/admin/logout.js'
import * as session from '../functions/api/admin/session.js'
import * as aOrders from '../functions/api/admin/orders.js'
import * as aOrder from '../functions/api/admin/orders/[id].js'
import * as aProducts from '../functions/api/admin/products.js'
import * as aProduct from '../functions/api/admin/products/[id].js'
import * as aSettings from '../functions/api/admin/settings.js'
import * as upload from '../functions/api/admin/upload.js'
import { isAuthed } from '../functions/_lib/auth.js'
import { json } from '../functions/_lib/util.js'

const routes = [
  [/^\/api\/public$/, pub],
  [/^\/api\/orders$/, orders],
  [/^\/api\/img\/([^/]+)$/, img, ['key']],
  [/^\/api\/admin\/login$/, login],
  [/^\/api\/admin\/logout$/, logout],
  [/^\/api\/admin\/session$/, session],
  [/^\/api\/admin\/orders$/, aOrders],
  [/^\/api\/admin\/orders\/([^/]+)$/, aOrder, ['id']],
  [/^\/api\/admin\/products$/, aProducts],
  [/^\/api\/admin\/products\/([^/]+)$/, aProduct, ['id']],
  [/^\/api\/admin\/settings$/, aSettings],
  [/^\/api\/admin\/upload$/, upload],
]

export default {
  async fetch(request, env, execCtx) {
    const url = new URL(request.url)
    for (const [re, mod, names] of routes) {
      const m = url.pathname.match(re)
      if (!m) continue

      const method = request.method[0] + request.method.slice(1).toLowerCase()
      const handler = mod[`onRequest${method}`]
      if (!handler) return json({ error: 'method_not_allowed' }, 405)

      // every /api/admin/* route except login needs the admin session
      if (url.pathname.startsWith('/api/admin/') && url.pathname !== '/api/admin/login') {
        if (!(await isAuthed(request, env))) return json({ error: 'unauthorized' }, 401)
      }

      const params = {}
      ;(names || []).forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]) })
      try {
        return await handler({ request, env, params, waitUntil: (p) => execCtx.waitUntil(p) })
      } catch (e) {
        console.error(e)
        return json({ error: 'server_error' }, 500)
      }
    }
    return json({ error: 'not_found' }, 404)
  },
}
