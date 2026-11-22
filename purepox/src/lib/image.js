// Prepares every product / calculator photo before upload: always a SQUARE of 1200 x 1200 px.
// The whole picture is kept (nothing is cut off): it is centred in the square and the free space is filled
// with a soft blurred copy of the photo (plain white if the browser cannot blur). Saved as WebP (JPEG fallback),
// usually 100-250 KB, so the site stays fast on mobile data.
export const SIZE = 1200

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
    if (!w0 || !h0) return file

    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, SIZE, SIZE)

    // 1) free space: blurred "cover" copy of the photo (skipped when it already fills the square)
    if (Math.abs(w0 - h0) / Math.max(w0, h0) > 0.02 && 'filter' in ctx) {
      const cover = Math.max(SIZE / w0, SIZE / h0) * 1.15
      ctx.save()
      ctx.filter = 'blur(40px) saturate(1.1)'
      ctx.globalAlpha = 0.9
      ctx.drawImage(img, (SIZE - w0 * cover) / 2, (SIZE - h0 * cover) / 2, w0 * cover, h0 * cover)
      ctx.restore()
    }

    // 2) the whole photo, centred, as large as the square allows
    const fit = Math.min(SIZE / w0, SIZE / h0)
    const w = Math.round(w0 * fit)
    const h = Math.round(h0 * fit)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, Math.round((SIZE - w) / 2), Math.round((SIZE - h) / 2), w, h)
    if (img.close) img.close()

    let blob = await toBlob(canvas, 'image/webp', 0.86)
    let ext = 'webp'
    if (!blob || blob.type !== 'image/webp') { blob = await toBlob(canvas, 'image/jpeg', 0.86); ext = 'jpg' }
    if (!blob) return file
    return new File([blob], `photo.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}

export const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`)
