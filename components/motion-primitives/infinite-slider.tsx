import React from 'react'

interface InfiniteSliderProps {
  children: React.ReactNode
  speed?: number
  speedOnHover?: number
  gap?: number
  reverse?: boolean
}

export function InfiniteSlider({
  children,
  speed = 40,
  speedOnHover,
  gap = 112,
  reverse = false,
}: InfiniteSliderProps) {
  // Convert children to array and duplicate to make loop seamless
  const childrenArray = React.Children.toArray(children)
  const items = [...childrenArray, ...childrenArray, ...childrenArray]

  return (
    <div className="overflow-hidden w-full select-none flex">
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-scroll {
          animation: scroll-left var(--duration, 20s) linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: var(--hover-play-state, running);
        }
      `}</style>
      <div
        className="flex shrink-0 min-w-full animate-scroll"
        style={{
          gap: `${gap}px`,
          '--duration': `${speed}s`,
          '--hover-play-state': speedOnHover ? 'paused' : 'running',
          flexDirection: reverse ? 'row-reverse' : 'row',
        } as React.CSSProperties}
      >
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-center shrink-0"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
