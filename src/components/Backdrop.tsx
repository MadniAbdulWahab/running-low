import { ROOM_ORDER } from '../rooms'
import type { RoomId } from '../types'

/** One fixed layer per room so colour and texture crossfade between tabs. */
export function Backdrop({ room }: { room: RoomId }) {
  return (
    <div className="backdrop" aria-hidden>
      {ROOM_ORDER.map((r) => (
        <div key={r} className="backdrop-layer" data-palette={r} data-on={r === room || undefined} />
      ))}
    </div>
  )
}
