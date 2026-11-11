// Default WhatsApp number: +213 792 27 31 00 (can be changed in Admin → Contact)
export const DEFAULT_WHATSAPP = '+213 792 27 31 00'

// "+213 792 27 31 00" | "0792273100" | "00213792273100"  ->  "213792273100"
export function waDigits(raw) {
  let d = String(raw || DEFAULT_WHATSAPP).replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = '213' + d.slice(1)
  return d
}

export const waLink = (raw, text) => `https://wa.me/${waDigits(raw)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
