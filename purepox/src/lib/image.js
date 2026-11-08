// Shrinks a photo in the browser before upload: max 1400 px, WebP (JPEG fallback), ~80 % quality.
// A 4 MB phone photo typically becomes 100–250 KB, so the site loads fast on mobile data.
const MAX = 1400

async function load(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad_image')) }
    img.src = url
  })
}

const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q))

export async function compressImage(file) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const img = await load(file)
    const w0 = img.width || img.naturalWidth
    const h0 = img.height || img.naturalHeight
    const k = Math.min(1, MAX / Math.max(w0, h0))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w0 * k)
    canvas.height = Math.round(h0 * k)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    if (img.close) img.close()

    let blob = await toBlob(canvas, 'image/webp', 0.82)
    let ext = 'webp'
    if (!blob || blob.type !== 'image/webp') { blob = await toBlob(canvas, 'image/jpeg', 0.82); ext = 'jpg' }
    if (!blob || blob.size >= file.size) return file // already small: keep the original
    return new File([blob], `photo.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}

export const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`)
