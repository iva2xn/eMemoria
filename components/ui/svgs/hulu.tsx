import React from 'react'

export function Hulu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 56 18"
      fill="currentColor"
      height={props.height || 18}
      width={props.width || 56}
      className={props.className}
      {...props}
    >
      <text x="4" y="14" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="currentColor">HULU</text>
    </svg>
  )
}
