import { initials, useApp } from '../app-context'

/** Someone on the list: their photo if they've added one, otherwise their initial. */
export function Avatar({ uid, size }: { uid: string; size?: number }) {
  const { household, photos } = useApp()
  const p = Math.max(0, household.members.indexOf(uid))
  const photo = photos[uid]
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.4) } : undefined
  return (
    <span className={photo ? 'avatar avatar--photo' : 'avatar'} data-p={p} style={style}>
      {photo ? <img src={photo} alt="" draggable={false} /> : initials(household.memberNames[uid] ?? '?')}
    </span>
  )
}
