type IconProps = {
  className?: string
}

const iconPaths = {
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20" />
      <path d="M8 7h8M8 11h7" />
    </>
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  books: (
    <>
      <path d="M6 4h11v16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M17 7h2a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2h-1M8 8h5M8 12h5" />
    </>
  ),
  users: (
    <>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.36" />
    </>
  ),
  loan: (
    <>
      <path d="M4 7h16v13H4zM8 4h8v3H8z" />
      <path d="M8 13h8M8 16h5" />
    </>
  ),
  return: (
    <>
      <path d="M4 7h16v13H4zM8 4h8v3H8z" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  history: (
    <>
      <path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7" />
      <path d="M4 4v4.7h4.7M12 8v4l2.5 1.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.03H7v-2h.84A1.7 1.7 0 0 0 9.4 10a1.7 1.7 0 0 0-.34-1.88L9 8.06l1.41-1.41.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 13.38 5.5V5h2v.5a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06A1.7 1.7 0 0 0 19.4 10c.23.62.82 1.03 1.48 1.03H21v2h-.12A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4H5v16h9M11 12h9M17 8l4 4-4 4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  eye: (
    <>
      <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.05 3.45M6.1 6.1C3.6 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.3 0 2.45-.27 3.47-.68" />
      <path d="M10.6 10.6a2.5 2.5 0 0 0 3.54 3.54" />
    </>
  ),
  arrow: <path d="m9 18 6-6-6-6" />,
  alert: (
    <>
      <path d="M12 3 2.7 20h18.6L12 3Z" />
      <path d="M12 9v4M12 16h.01" />
    </>
  ),
}

export type IconName = keyof typeof iconPaths

export function Icon({ name, className = 'h-5 w-5' }: IconProps & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {iconPaths[name]}
    </svg>
  )
}
