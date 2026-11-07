import { json, bad } from '../../_lib/util.js'

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }

export async function onRequestPost({ request, env }) {
  let form
  try { form = await request.formData() } catch { return bad('invalid') }
  const file = form.get('file')
  if (!file || typeof file === 'string') return bad('no_file')
  const ext = EXT[file.type]
  if (!ext) return bad('bad_type')
  if (file.size > 5 * 1024 * 1024) return bad('too_large')
  const key = `${crypto.randomUUID()}.${ext}`
  await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  return json({ url: `/api/img/${key}` })
}
