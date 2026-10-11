import { useCallback, useState } from 'react'
import { useApp } from '../../app-context'
import { countsFor, sendPing, totalOf, type PingDay } from '../../data/pings'
import { notify } from '../../lib/push'
import { ago, todayISO } from '../../lib/time'
import { PINGS, pingInfo } from '../../rooms'
import type { Ping, PingKind } from '../../types'
import { Avatar } from '../Avatar'
import { ChevronRight } from '../Icons'
import { HeartBurst } from './HeartRain'

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

/** The 12 things to send: a sideways-swiping row on Home, a grid in the Hearts sheet. */
export function SendPings({ pings, layout }: { pings: Ping[]; layout: 'row' | 'grid' }) {
  const { household, uid, toast } = useApp()
  const other = household.members.find((m) => m !== uid)
  const otherName = other ? (household.memberNames[other] ?? 'Someone') : null
  const sendLabel = otherName ? `Send something to ${firstName(otherName)}` : 'Send a little hello once your partner joins'
  const [burst, setBurst] = useState<{ id: number; emoji: string; x: number; y: number } | null>(null)
  const endBurst = useCallback(() => setBurst(null), [])
  const [atEnd, setAtEnd] = useState(false)

  const send = (kind: PingKind, e: React.MouseEvent<HTMLButtonElement>) => {
    const info = pingInfo(kind)
    if (!otherName) {
      toast('These arrive once someone joins the list')
      return
    }
    sendPing(household.id, uid, kind, pings)
    void notify(household.id, 'hearts', `${household.memberNames[uid] ?? 'Someone'} ${info.verb} ${info.emoji}`, '', 'home')
    const box = e.currentTarget.closest('.send-pings')!.getBoundingClientRect()
    const btn = e.currentTarget.getBoundingClientRect()
    setBurst({ id: Date.now(), emoji: info.emoji, x: btn.left + btn.width / 2 - box.left, y: btn.top - box.top })
    toast(`${info.emoji} sent to ${firstName(otherName)}`)
  }

  return (
    <div className="send-pings" data-layout={layout} data-end={atEnd || undefined}>
      {layout === 'row' && <p className="send-pings-label">{sendLabel}</p>}
      <div
        className="send-pings-track"
        role="group"
        aria-label={sendLabel}
        // The right edge fades to hint there's more; drop the fade once you've swiped to the end.
        onScroll={(e) => {
          const t = e.currentTarget
          setAtEnd(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4)
        }}
      >
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
      {burst && <HeartBurst key={burst.id} emoji={burst.emoji} x={burst.x} y={burst.y} onDone={endBurst} />}
    </div>
  )
}

/**
 * Hearts on Home, kept slim: the last thing that came in (tap for the full picture) and a
 * row of things to send back.
 */
export function HeartsBar({ pings, days, onOpen }: { pings: Ping[]; days: PingDay[] | null; onOpen: () => void }) {
  const { household, uid } = useApp()
  const other = household.members.find((m) => m !== uid)
  const otherName = other ? (household.memberNames[other] ?? 'Someone') : null
  const lastIn = pings.find((p) => p.from !== uid)
  const lastInfo = lastIn ? pingInfo(lastIn.kind) : null
  const today = (days ?? []).filter((d) => d.day === todayISO())
  const inToday = other ? totalOf(countsFor(today, other)) : 0
  const fromName = lastIn ? firstName(household.memberNames[lastIn.from] ?? 'Someone') : ''
  const message = lastInfo ? lastInfo.verb.charAt(0).toUpperCase() + lastInfo.verb.slice(1) : null

  return (
    <section className="hearts" aria-label="Hearts">
      <button
        className="hearts-in"
        data-received={lastIn ? true : undefined}
        onClick={onOpen}
        aria-label={`${lastIn && lastInfo ? `${fromName} ${lastInfo.verb}. ` : ''}Hearts: see today and this week`}
      >
        <span className={lastIn ? 'hearts-big hearts-big--photo' : 'hearts-big'} aria-hidden="true">
          {lastIn ? <Avatar uid={lastIn.from} size={72} /> : '💌'}
        </span>
        <span className="hearts-in-text">
          {lastIn && <span className="hearts-sender">{fromName}</span>}
          <strong className="hearts-last">
            {lastIn && lastInfo ? (
              <>
                {message}{'\u00a0'}
                <span className="hearts-message-emoji" aria-hidden="true" key={lastIn.id}>
                  {lastInfo.emoji}
                </span>
              </>
            ) : otherName ? (
              `Nothing from ${firstName(otherName)} yet`
            ) : (
              'Waiting for someone to join'
            )}
          </strong>
          <span className="hearts-when">
            {[lastIn && ago(lastIn.createdAt), inToday > 0 && `${inToday} today`].filter(Boolean).join(' · ') ||
              'Send something below'}
          </span>
        </span>
        <ChevronRight />
      </button>
      <SendPings pings={pings} layout="row" />
    </section>
  )
}
