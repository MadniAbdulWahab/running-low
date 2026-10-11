import { useCallback, useMemo, useState } from 'react'
import { useApp } from '../../app-context'
import { sendPing } from '../../data/pings'
import { notify } from '../../lib/push'
import { ago } from '../../lib/time'
import { PINGS, pingInfo } from '../../rooms'
import type { Ping, PingKind } from '../../types'
import { HeartBurst } from './HeartRain'

const startOfToday = () => {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
}

/** How many of each kind, most first: [['heart', 3], ['kiss', 1]]. */
function tally(pings: Ping[]): [PingKind, number][] {
  const n = new Map<PingKind, number>()
  for (const p of pings) n.set(p.kind, (n.get(p.kind) ?? 0) + 1)
  return [...n].sort((a, b) => b[1] - a[1])
}

function Tally({ counts }: { counts: [PingKind, number][] }) {
  return (
    <span className="hearts-tally">
      {counts.map(([k, c]) => (
        <span key={k} className="hearts-chip" aria-label={`${c} × ${pingInfo(k).label}`}>
          {pingInfo(k).emoji}
          <b>{c}</b>
        </span>
      ))}
    </span>
  )
}

/**
 * Hearts on Home: what came in (the latest, big, and today's count of each) and a grid
 * of little things to send back.
 */
export function HeartsBar({ pings }: { pings: Ping[] }) {
  const { household, uid, toast } = useApp()
  const other = household.members.find((m) => m !== uid)
  const otherName = other ? (household.memberNames[other] ?? 'Someone') : null
  const lastIn = pings.find((p) => p.from !== uid)
  const [burst, setBurst] = useState<{ id: number; emoji: string; x: number; y: number } | null>(null)
  const endBurst = useCallback(() => setBurst(null), [])

  const { inToday, outToday } = useMemo(() => {
    const since = startOfToday()
    const today = pings.filter((p) => p.createdAt >= since)
    return {
      inToday: tally(today.filter((p) => p.from !== uid)),
      outToday: tally(today.filter((p) => p.from === uid)),
    }
  }, [pings, uid])

  const send = (kind: PingKind, e: React.MouseEvent<HTMLButtonElement>) => {
    const info = pingInfo(kind)
    if (!otherName) {
      toast('These arrive once someone joins the list')
      return
    }
    sendPing(household.id, uid, kind, pings)
    void notify(household.id, 'hearts', `${household.memberNames[uid] ?? 'Someone'} ${info.verb} ${info.emoji}`, '', 'home')
    const card = e.currentTarget.closest('.hearts')!.getBoundingClientRect()
    const btn = e.currentTarget.getBoundingClientRect()
    setBurst({ id: Date.now(), emoji: info.emoji, x: btn.left + btn.width / 2 - card.left, y: btn.top - card.top })
    toast(`${info.emoji} sent to ${otherName}`)
  }

  const lastInfo = lastIn ? pingInfo(lastIn.kind) : null

  return (
    <section className="hearts" aria-label="Hearts">
      <div className="hearts-in">
        <span className="hearts-big" aria-hidden="true" key={lastIn?.id}>
          {lastInfo?.emoji ?? '💌'}
        </span>
        <span className="hearts-in-text">
          <strong className="hearts-last">
            {lastIn && lastInfo
              ? `${household.memberNames[lastIn.from] ?? 'Someone'} ${lastInfo.verb}`
              : otherName
                ? `Nothing from ${otherName} yet`
                : 'Waiting for someone to join'}
          </strong>
          {lastIn && <span className="hearts-when">{ago(lastIn.createdAt)}</span>}
          {inToday.length > 0 && (
            <span className="hearts-today">
              Today <Tally counts={inToday} />
            </span>
          )}
        </span>
      </div>

      <div className="hearts-grid" role="group" aria-label="Send something">
        {PINGS.map((p) => (
          <button
            key={p.kind}
            className="heart-quick"
            data-kind={p.kind}
            onClick={(e) => send(p.kind, e)}
            aria-label={`Send: ${p.label}`}
            title={p.label}
          >
            {p.emoji}
          </button>
        ))}
      </div>
      {outToday.length > 0 && (
        <p className="hearts-sent">
          You sent today <Tally counts={outToday} />
        </p>
      )}
      {burst && <HeartBurst key={burst.id} emoji={burst.emoji} x={burst.x} y={burst.y} onDone={endBurst} />}
    </section>
  )
}
