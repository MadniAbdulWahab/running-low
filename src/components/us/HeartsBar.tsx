import { useCallback, useState } from 'react'
import { useApp } from '../../app-context'
import { sendPing } from '../../data/pings'
import { ago } from '../../lib/time'
import { PINGS, pingInfo } from '../../rooms'
import type { Ping, PingKind } from '../../types'
import { HeartBurst } from './HeartRain'

/** Send a heart (or a hug, kiss, coffee); shows the last one that came in. */
export function HeartsBar({ pings }: { pings: Ping[] }) {
  const { household, uid, toast } = useApp()
  const other = household.members.find((m) => m !== uid)
  const otherName = other ? (household.memberNames[other] ?? 'Someone') : null
  const lastIn = pings.find((p) => p.from !== uid)
  const [burst, setBurst] = useState<{ id: number; emoji: string } | null>(null)
  const endBurst = useCallback(() => setBurst(null), [])

  const send = (kind: PingKind) => {
    const info = pingInfo(kind)
    if (!otherName) {
      toast('Hearts arrive once someone joins the list')
      return
    }
    sendPing(household.id, uid, kind, pings)
    setBurst({ id: Date.now(), emoji: info.emoji })
    toast(`${info.emoji} sent to ${otherName}`)
  }

  return (
    <section className="hearts" aria-label="Hearts">
      <div className="hearts-row">
        <button className="heart-main" onClick={() => send('heart')}>
          <span className="heart-main-emoji" aria-hidden="true">
            ❤️
          </span>
          Send a heart
        </button>
        {PINGS.filter((p) => p.kind !== 'heart').map((p) => (
          <button
            key={p.kind}
            className="heart-quick"
            onClick={() => send(p.kind)}
            aria-label={`Send a ${p.label.toLowerCase()}`}
          >
            {p.emoji}
          </button>
        ))}
      </div>
      <p className="hearts-last">
        {lastIn
          ? `${household.memberNames[lastIn.from] ?? 'Someone'} ${pingInfo(lastIn.kind).verb} ${pingInfo(lastIn.kind).emoji} · ${ago(lastIn.createdAt)}`
          : otherName
            ? `Nothing from ${otherName} yet`
            : 'Waiting for someone to join'}
      </p>
      {burst && <HeartBurst key={burst.id} emoji={burst.emoji} onDone={endBurst} />}
    </section>
  )
}
