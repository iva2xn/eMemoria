import React from 'react'

export function Figma(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      height={props.height || 24}
      width={props.width || 24}
      className={props.className}
      {...props}
    >
      <path d="M12 2C9.24 2 7 4.24 7 7c0 1.63.78 3.08 2 4-.98.74-2 1.83-2 3c0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.17-1.02-2.26-2-3 1.22-.92 2-2.37 2-4 0-2.76-2.24-5-5-5zm-2 5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm2 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </svg>
  )
}
