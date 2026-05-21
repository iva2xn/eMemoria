import React from 'react'

export function SupabaseFull(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 30"
      fill="currentColor"
      height={props.height || 24}
      width={props.width || 90}
      className={props.className}
      {...props}
    >
      <path d="M15.3 1.3c-.6-.7-1.8-.7-2.4 0L1.7 14.8c-.8.9-.2 2.4.9 2.4h8.8c.2 0 .4.1.4.3v11.2c0 1.2 1.4 1.8 2.2.9l11.2-13.5c.8-.9.2-2.4-.9-2.4h-8.8c-.2 0-.4-.1-.4-.3V1.3z" fill="#3ECF8E" />
      <text x="36" y="21" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="16" fill="currentColor">Supabase</text>
    </svg>
  )
}
