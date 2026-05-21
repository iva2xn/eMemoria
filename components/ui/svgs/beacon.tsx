import React from 'react'

export function Beacon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 24"
      fill="currentColor"
      height={props.height || 24}
      width={props.width || 80}
      className={props.className}
      {...props}
    >
      <circle cx="12" cy="12" r="8" fill="#FF5C5C" />
      <text x="24" y="17" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="currentColor">Beacon</text>
    </svg>
  )
}
