import { json, bad } from '../../_lib/util.js'

const IMG = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }
const DOC = { 'application/pdf': 'pdf' }
const MAX_IMG = 5 * 1024 * 1024
const MAX_DOC = 25 * 1024 * 1024

export async function onRequestPost({ request, env }) {
  if (!env.IMAGES) return bad('no_storage', 501)
  let form
  try { form = await request.formData() } catch { return bad('invalid') }
  const file = form.get('file')
  if (!file || typeof file === 'string') return bad('no_file')
  const ext = IMG[file.type] || DOC[file.type]
  if (!ext) return bad('bad_type')
  if (file.size > (DOC[file.type] ? MAX_DOC : MAX_IMG)) return bad('too_large')
  const key = `${crypto.randomUUID()}.${ext}`
  await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  return json({ url: `/api/img/${key}` })
}
