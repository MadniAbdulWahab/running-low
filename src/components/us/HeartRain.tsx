import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

/** Full-screen shower of emoji when a heart arrives. Ignores taps; removes itself. */
export function HeartRain({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  const drops = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: Math.round(Math.random() * 92),
        delay: Math.round(Math.random() * 700),
        size: 22 + Math.round(Math.random() * 26),
        drift: Math.round(Math.random() * 60 - 30),
        key: i,
      })),
    [],
  )
  useEffect(() => {
    const t = window.setTimeout(onDone, 3200)
    return () => window.clearTimeout(t)
  }, [onDone])

  return createPortal(
    <div className="heart-rain" aria-hidden="true">
      {drops.map((d) => (
        <span
          key={d.key}
          style={
            {
              left: `${d.left}%`,
              fontSize: d.size,
              animationDelay: `${d.delay}ms`,
              '--drift': `${d.drift}px`,
            } as React.CSSProperties
          }
        >
          {emoji}
        </span>
      ))}
    </div>,
    document.body,
  )
}

/** A small burst from the button when you send one. */
export function HeartBurst({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1100)
    return () => window.clearTimeout(t)
  }, [onDone])
  return (
    <span className="heart-burst" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ '--i': i } as React.CSSProperties}>
          {emoji}
        </span>
      ))}
    </span>
  )
}
