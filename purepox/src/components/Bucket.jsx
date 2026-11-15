import { useId } from 'react'

// Stylised resin bucket tinted with the selected color
export default function Bucket({ hex = '#ec6b14', className = '' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={`bucket ${className}`} viewBox="0 0 200 220" aria-hidden="true">
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#2b2b2e" />
          <stop offset=".45" stopColor="#4a4a4f" />
          <stop offset="1" stopColor="#18181a" />
        </linearGradient>
        <radialGradient id={`s${id}`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="208" rx="70" ry="9" fill="#000" opacity=".12" />
      <path d="M28 62 L42 196 Q100 214 158 196 L172 62 Z" fill={`url(#b${id})`} />
      <path d="M33 100 L40 170 Q100 188 160 170 L167 100 Q100 118 33 100Z" fill={hex} stroke="rgba(0,0,0,.25)" />
      <path d="M33 100 L40 170 Q100 188 160 170 L167 100 Q100 118 33 100Z" fill={`url(#s${id})`} />
      <path d="M100 124 q14 18 0 30 q-14 -12 0 -30z" fill="#fff" opacity=".9" transform="translate(0 -4)" />
      <ellipse cx="100" cy="62" rx="72" ry="16" fill="#3a3a3e" />
      <ellipse cx="100" cy="60" rx="64" ry="12" fill={hex} />
      <ellipse cx="100" cy="60" rx="64" ry="12" fill={`url(#s${id})`} />
      <path d="M62 62 Q100 -6 138 62" fill="none" stroke="#8c8c92" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
