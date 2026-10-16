import { ChevronRight } from './Icons'

/**
 * The one look for folding anywhere in the app: "Show ⌄" while folded, "Hide ⌃" while open
 * (the words can differ, the style doesn't). Goes inside the button that does the folding.
 */
export function FoldAction({
  open,
  show = 'Show',
  hide = 'Hide',
  className,
}: {
  open: boolean
  show?: string
  hide?: string
  className?: string
}) {
  return (
    <span className={className ? `fold-action ${className}` : 'fold-action'} data-open={open || undefined}>
      {open ? hide : show}
      <ChevronRight />
    </span>
  )
}
