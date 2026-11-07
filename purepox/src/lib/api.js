// Small fetch wrapper for the Cloudflare Functions API
export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: form || (body ? JSON.stringify(body) : undefined),
  })
  let data = null
  try { data = await res.json() } catch { /* not JSON */ }

  if (res.status === 401 && path.startsWith('/api/admin/') && !path.endsWith('/login') && !path.endsWith('/session')) {
    window.dispatchEvent(new Event('pp-unauth'))
  }
  if (!res.ok || data === null) {
    const err = new Error(data?.error || (res.ok ? 'no_api' : res.statusText))
    err.status = res.status
    throw err
  }
  return data
}
