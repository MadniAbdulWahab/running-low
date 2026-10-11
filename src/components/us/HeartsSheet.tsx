import { useState } from 'react'
import { useApp } from '../../app-context'
import { countsFor, totalOf, type PingDay } from '../../data/pings'
import { ago, todayISO } from '../../lib/time'
import { PINGS, pingInfo } from '../../rooms'
import type { Ping } from '../../types'
import { Avatar } from '../Avatar'
import { Sheet } from '../Sheet'
import { firstName, SendPings } from './HeartsBar'

type Period = 'today' | 'week'

/** Everything about the hearts: who sent what today or this week, the latest ones, and a grid to send more. */
export function HeartsSheet({ pings, days, onClose }: { pings: Ping[]; days: PingDay[] | null; onClose: () => void }) {
  const { household, uid } = useApp()
  const [period, setPeriod] = useState<Period>('today')
  const other = household.members.find((m) => m !== uid) ?? null
  const inPeriod = (days ?? []).filter((d) => period === 'week' || d.day === todayISO())
  const theirs = other ? countsFor(inPeriod, other) : {}
  const mine = countsFor(inPeriod, uid)
  const rows = PINGS.map((p) => ({ ...p, theirs: theirs[p.kind] ?? 0, mine: mine[p.kind] ?? 0 }))
    .filter((r) => r.theirs + r.mine > 0)
    .sort((a, b) => b.theirs + b.mine - (a.theirs + a.mine))
  const max = Math.max(1, ...rows.flatMap((r) => [r.theirs, r.mine]))
  const otherName = other ? firstName(household.memberNames[other] ?? 'Someone') : 'Someone'
  const name = (id: string) => (id === uid ? 'You' : firstName(household.memberNames[id] ?? 'Someone'))

  return (
    <Sheet title="Hearts" onClose={onClose}>
      <div className="segmented hearts-period">
        {(['today', 'week'] as const).map((p) => (
          <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {p === 'today' ? 'Today' : 'This week'}
          </button>
        ))}
      </div>

      <div className="hearts-score">
        {other && (
          <div className="hearts-score-side" data-side="theirs">
            <Avatar uid={other} size={52} />
            <b className="hearts-score-n">{totalOf(theirs)}</b>
            <span>from {otherName}</span>
          </div>
        )}
        <div className="hearts-score-side" data-side="mine">
          <Avatar uid={uid} size={52} />
          <b className="hearts-score-n">{totalOf(mine)}</b>
          <span>from you</span>
        </div>
      </div>

      {rows.length ? (
        <div className="group hearts-rows">
          {rows.map((r) => (
            <div key={r.kind} className="row hearts-row" data-kind={r.kind}>
              <span className="hearts-row-emoji" aria-hidden="true">
                {r.emoji}
              </span>
              <span className="hearts-row-bars">
                <span className="hearts-row-label">{r.label}</span>
                <span className="hearts-bar" data-side="theirs" data-zero={!r.theirs || undefined} style={{ width: `${(r.theirs / max) * 100}%` }} />
                <span className="hearts-bar" data-side="mine" data-zero={!r.mine || undefined} style={{ width: `${(r.mine / max) * 100}%` }} />
              </span>
              <span className="hearts-row-n" aria-label={`${r.theirs} from ${otherName}, ${r.mine} from you`}>
                <b data-side="theirs">{r.theirs}</b>
                <b data-side="mine">{r.mine}</b>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="hearts-empty">{period === 'today' ? 'Nothing sent yet today.' : 'Nothing sent this week yet.'}</p>
      )}

      <h3 className="group-label">Send something</h3>
      <SendPings pings={pings} layout="grid" />

      {pings.length > 0 && (
        <>
          <h3 className="group-label">Latest</h3>
          <div className="group">
            {pings.slice(0, 15).map((p) => {
              const info = pingInfo(p.kind)
              return (
                <div key={p.id} className="row hearts-recent">
                  <Avatar uid={p.from} size={30} />
                  <span className="hearts-recent-text">
                    {p.from === uid
                      ? `You sent ${info.emoji} ${info.label}`
                      : `${name(p.from)} ${info.verb} ${info.emoji}`}
                  </span>
                  <span className="hearts-recent-when">{ago(p.createdAt)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Sheet>
  )
}
