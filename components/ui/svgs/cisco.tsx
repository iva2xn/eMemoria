import React from 'react'

export function Cisco(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 60 30"
      fill="currentColor"
      height={props.height || 30}
      width={props.width || 60}
      className={props.className}
      {...props}
    >
      <text x="2" y="20" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="currentColor">CISCO</text>
    </svg>
  )
}
