import type { ListId } from '../types'

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** White glyph shown inside each list's coloured circle. */
export function ListGlyph({ list }: { list: ListId }) {
  switch (list) {
    case 'grocery': // shopping bag
      return (
        <svg {...base} strokeWidth={2.2}>
          <path d="M5 8.5h14l-1.3 10.6a1.5 1.5 0 0 1-1.5 1.4H7.8a1.5 1.5 0 0 1-1.5-1.4z" />
          <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
        </svg>
      )
    case 'important': // exclamation
      return (
        <svg {...base} strokeWidth={2.6}>
          <path d="M12 5v9.5M12 19v.01" />
        </svg>
      )
  }
}

export const HomeGlyph = () => (
  <svg {...base} strokeWidth={2}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </svg>
)

export const MealsGlyph = () => (
  <svg {...base} strokeWidth={2}>
    <path d="M7 3.5v7.5M4.5 3.5v4.5a2.5 2.5 0 0 0 5 0V3.5M7 11v9.5" />
    <path d="M17 20.5V3.5c-2.2 1.2-3.3 3.7-3.3 6.6v3.4H17" />
  </svg>
)

export const HeartGlyph = () => (
  <svg {...base} strokeWidth={2}>
    <path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
  </svg>
)

export const ChevronRight = () => (
  <svg {...base} strokeWidth={2.4}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)

export const PlusCircle = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const CheckCircle = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M7 12.5l3.3 3.3L17 9" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const CameraIcon = () => (
  <svg {...base} strokeWidth={1.7}>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.5-2h7L17 7h2.5A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
    <circle cx="12" cy="13.3" r="3.6" />
  </svg>
)

export const ArrowUp = () => (
  <svg {...base} strokeWidth={2.6}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
)

export const CloseIcon = () => (
  <svg {...base} strokeWidth={2.4}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
)
