import React from 'react'

export function VercelFull(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 116 26"
      fill="currentColor"
      height={props.height || 22}
      width={props.width || 84}
      className={props.className}
      {...props}
    >
      <path d="M12.2 0L24.4 21H0L12.2 0z" />
      <text x="32" y="18" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="16" fill="currentColor">Vercel</text>
    </svg>
  )
}
