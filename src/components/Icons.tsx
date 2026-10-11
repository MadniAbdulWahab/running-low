import type { RoomId } from '../types'

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function RoomIcon({ room }: { room: RoomId }) {
  switch (room) {
    case 'home': // a lidded pot
      return (
        <svg {...base}>
          <path d="M4.5 11h15v5.5a3.5 3.5 0 0 1-3.5 3.5H8a3.5 3.5 0 0 1-3.5-3.5z" />
          <path d="M3 11h18M10.5 8h3M2.5 13.5h2M19.5 13.5h2" />
          <path d="M9.5 3.5c-.6.8.6 1.5 0 2.4M14.5 3.5c-.6.8.6 1.5 0 2.4" />
        </svg>
      )
    case 'grocery': // fridge
      return (
        <svg {...base}>
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <path d="M6 9.5h12M9 5.5v1.8M9 12.5v3" />
        </svg>
      )
    case 'household': // jar
      return (
        <svg {...base}>
          <path d="M7.5 3.5h9v3h-9z" />
          <path d="M7 6.5h10a1.5 1.5 0 0 1 1.5 1.5v10.5a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3V8A1.5 1.5 0 0 1 7 6.5z" />
          <path d="M8.5 11.5h7v5h-7z" />
        </svg>
      )
    case 'important': // index card
      return (
        <svg {...base}>
          <rect x="3" y="5" width="18" height="14" rx="1.5" />
          <path d="M3 9h18M6.5 12.5h11M6.5 15.5h7" />
        </svg>
      )
  }
}

export const CameraIcon = () => (
  <svg {...base}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.4-2h6.2l1.4 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="12.8" r="3.4" />
  </svg>
)

export const CheckIcon = () => (
  <svg {...base} strokeWidth={1.8}>
    <path d="M5.5 12.5l4 4 9-9.5" />
  </svg>
)

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
)

export const ChevronIcon = ({ open }: { open?: boolean }) => (
  <svg {...base} width={16} height={16} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }}>
    <path d="M6 9.5l6 6 6-6" />
  </svg>
)

export const PlusIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
