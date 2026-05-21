import React from 'react'

export function Claude(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 90 26"
      fill="currentColor"
      height={props.height || 26}
      width={props.width || 90}
      className={props.className}
      {...props}
    >
      <text x="4" y="18" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="16" fill="currentColor">Claude</text>
    </svg>
  )
}
