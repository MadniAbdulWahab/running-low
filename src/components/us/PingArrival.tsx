import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../app-context'
import { pingInfo } from '../../rooms'
import type { Ping } from '../../types'
import { Avatar } from '../Avatar'

/** When a heart (or hug, rose…) arrives: who sent it, with their photo and the emoji. Tap to close. */
export function PingArrival({ ping, onDone }: { ping: Ping; onDone: () => void }) {
  const { household } = useApp()
  const info = pingInfo(ping.kind)
  useEffect(() => {
    const t = window.setTimeout(onDone, 3600)
    return () => window.clearTimeout(t)
  }, [onDone])

  return createPortal(
    <div className="ping-arrival" onClick={onDone} role="status" aria-live="polite">
      <div className="ping-card">
        <span className="ping-card-face">
          <Avatar uid={ping.from} size={104} />
          <span className="ping-card-emoji" aria-hidden="true">
            {info.emoji}
          </span>
        </span>
        <strong className="ping-card-name">{household.memberNames[ping.from] ?? 'Someone'}</strong>
        <span className="ping-card-verb">
          {info.verb} {info.emoji}
        </span>
      </div>
    </div>,
    document.body,
  )
}
