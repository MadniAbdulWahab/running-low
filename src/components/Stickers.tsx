import type { RoomId } from '../types'

// Hand-placed spots (in % of the screen) that sit around the content rather than under the title.
const SLOTS: { top: number; side: 'left' | 'right'; x: number; size: number; rot: number }[] = [
  { top: 9.5, side: 'right', x: 5, size: 52, rot: 12 },
  { top: 40, side: 'right', x: 3, size: 40, rot: -10 },
  { top: 56, side: 'left', x: 6, size: 50, rot: 8 },
  { top: 61, side: 'right', x: 12, size: 58, rot: -12 },
  { top: 70, side: 'left', x: 32, size: 44, rot: 14 },
  { top: 75, side: 'right', x: 4, size: 40, rot: 6 },
  { top: 78, side: 'left', x: 4, size: 46, rot: -8 },
]

/** The wallpaper behind each tab: a soft colour wash and die-cut emoji stickers. */
export function Stickers({ room, emojis }: { room: RoomId; emojis: string[] }) {
  return (
    <div className="wallpaper" data-room={room} aria-hidden="true">
      <div className="wallpaper-wash" />
      {emojis.slice(0, SLOTS.length).map((e, i) => {
        const s = SLOTS[i]
        return (
          <span
            key={`${room}-${i}-${e}`}
            className="sticker"
            style={
              {
                top: `${s.top}%`,
                [s.side]: `${s.x}%`,
                fontSize: s.size,
                '--rot': `${s.rot}deg`,
                animationDelay: `${i * 35}ms`,
              } as React.CSSProperties
            }
          >
            {e}
          </span>
        )
      })}
    </div>
  )
}
