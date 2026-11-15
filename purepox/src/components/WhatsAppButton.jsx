import { useLang } from '../lib/i18n'
import { waLink } from '../lib/whatsapp'

export const WaIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
    <path d="M16.04 3C9.4 3 4 8.38 4 15.02c0 2.13.56 4.2 1.62 6.03L4 29l8.14-1.58a12.03 12.03 0 0 0 3.9.65h.01C22.7 28.07 28 22.7 28 16.04 28 12.83 26.75 9.8 24.47 7.53A11.93 11.93 0 0 0 16.04 3zm0 22.03h-.01c-1.2 0-2.38-.32-3.4-.93l-.25-.15-4.83.94.97-4.7-.16-.26a9.03 9.03 0 0 1-1.38-4.8c0-5 4.07-9.06 9.07-9.06 2.42 0 4.7.95 6.41 2.66a8.99 8.99 0 0 1 2.65 6.4c0 5-4.07 9.9-9.07 9.9zm4.97-6.78c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.2-1.35-.81-.72-1.36-1.62-1.52-1.89-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.44-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.64 1.11 2.82.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.55.57.65.21 1.25.18 1.72.11.52-.08 1.6-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
  </svg>
)

// Floating button, bottom corner of every public page
export default function WhatsAppButton({ number }) {
  const { lang } = useLang()
  const text = lang === 'ar' ? 'السلام عليكم، أريد معلومات عن منتجاتكم.' : "Bonjour Purepox, j'aimerais avoir des informations."
  return (
    <a className="wa-fab" href={waLink(number, text)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
      <WaIcon />
      <span>WhatsApp</span>
    </a>
  )
}
