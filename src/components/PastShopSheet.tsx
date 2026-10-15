import { useApp } from '../app-context'
import { createTemplate, entryLine } from '../data/templates'
import type { PastShop } from '../lib/shops'
import { parseISO } from '../lib/time'
import { PickList } from './PickList'
import { Sheet } from './Sheet'

/** One day's shop: add it again (ticking what's needed), or keep it as a template. */
export function PastShopSheet({
  shop,
  onClose,
  onSaved,
}: {
  shop: PastShop
  onClose: () => void
  /** Saved as a template: opens it so it can be renamed. */
  onSaved: (templateId: string) => void
}) {
  const { household, uid, toast } = useApp()
  const date = parseISO(shop.day)
  const n = shop.items.length

  const saveAsTemplate = () => {
    const name = `Shop, ${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`
    const id = createTemplate(household.id, uid, name, shop.items.map((i) => entryLine({ name: i.name, qty: i.qty ?? undefined })))
    toast(`Saved ${name} as a template`)
    onSaved(id)
  }

  return (
    <Sheet
      title={date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      list="grocery"
      onClose={onClose}
    >
      <h3 className="group-label">Bought · {n === 1 ? '1 item' : `${n} items`}</h3>
      <PickList
        entries={shop.items.map((i) => ({ name: i.name, qty: i.qty ?? undefined }))}
        label={(k) => `Add ${k === 1 ? '1 item' : `${k} items`} again`}
      />
      <p className="group-footer">Untick anything you don’t need this time.</p>

      <div className="group" style={{ marginTop: 24 }}>
        <button className="row row--action" onClick={saveAsTemplate}>
          Save as a template
        </button>
      </div>
      <p className="group-footer">Keeps these items together, to add again any time from Templates.</p>
    </Sheet>
  )
}
