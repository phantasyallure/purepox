import { api } from './api'
import { demoProducts, demoSettings } from './demo'

const DEMO = Boolean(import.meta.env.VITE_DEMO)
let pending = null
let loadedAt = 0

// One shared request for products + settings (the API response is also edge-cached)
function loadPublic() {
  if (pending && Date.now() - loadedAt < 20000) return pending
  loadedAt = Date.now()
  pending = (async () => {
    if (DEMO) return { products: demoProducts, settings: demoSettings }
    try {
      return await api('/api/public')
    } catch (e) {
      // `vite dev` without the Cloudflare functions: show sample data
      if (import.meta.env.DEV && e.message === 'no_api') return { products: demoProducts, settings: demoSettings }
      pending = null
      throw e
    }
  })()
  return pending
}

export async function fetchCatalogue() {
  return (await loadPublic()).products
}

export async function fetchSettings() {
  return (await loadPublic()).settings
}

export async function submitOrder({ name, phone, items }) {
  if (DEMO || (import.meta.env.DEV && !(await fetch('/api/public').then((r) => (r.headers.get('content-type') || '').includes('json')).catch(() => false)))) {
    console.info('[demo] order', { name, phone, items })
    return
  }
  await api('/api/orders', { method: 'POST', body: { name, phone, items } })
}
