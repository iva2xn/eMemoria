import React from 'react'

export function FirebaseFull(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 24"
      fill="currentColor"
      height={props.height || 24}
      width={props.width || 80}
      className={props.className}
      {...props}
    >
      <path d="M4 2L16 14L8 22L0 14L4 2z" fill="#FFA611" />
      <text x="22" y="17" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="currentColor">Firebase</text>
    </svg>
  )
}
