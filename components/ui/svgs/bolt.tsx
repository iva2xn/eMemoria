import React from 'react'

export function Bolt(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 56 22"
      fill="currentColor"
      height={props.height || 22}
      width={props.width || 56}
      className={props.className}
      {...props}
    >
      <polygon points="6 12 14 0 10 0 2 10 6 10 0 22 14 10 8 10" fill="#FFC000" />
      <text x="18" y="16" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="currentColor">Bolt</text>
    </svg>
  )
}
