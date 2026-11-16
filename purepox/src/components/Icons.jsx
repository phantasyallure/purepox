// Simple line icons (stroke = currentColor) + brand icons for the contact section and footer
const base = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const I = (children) => ({ size = 26 }) => <svg {...base} width={size} height={size}>{children}</svg>

export const PhoneIcon = I(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />)
export const MailIcon = I(<><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-10 6L2 7" /></>)
export const PinIcon = I(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>)
export const ClockIcon = I(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>)
export const InstagramIcon = I(<><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" /></>)
export const FacebookIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.5-3.4h-3.3V8.2c0-1 .4-1.7 1.8-1.7h1.6V3.4c-.3 0-1.3-.2-2.5-.2-2.6 0-4.3 1.6-4.3 4.4v2.8H7.3v3.4h2.8V22h3.4z" /></svg>
)
