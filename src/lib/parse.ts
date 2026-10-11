const FILLER =
  /^(?:(?:we(?:'|’)?re|we are|i(?:'|’)?m|i am) out of|out of|we need(?: more)?|need(?: more)?|buy|get|add)\s+/i

export interface Entry {
  name: string
  qty?: number
}

export function cleanName(raw: string): string {
  const s = raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(FILLER, '')
    .replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, '')
  if (!s) return ''
  return s.charAt(0).toLocaleUpperCase() + s.slice(1)
}

export function normalizeKey(raw: string): string {
  return cleanName(raw).toLocaleLowerCase()
}

const QTY_FIRST = /^(\d{1,2})\s*[x×]?\s+(?=\p{L})(.+)$/u
const QTY_LAST = /^(.+?)\s*(?:[x×]\s*(\d{1,2})|\(\s*(\d{1,2})\s*\))$/u

/** "2 milk", "12 eggs", "milk x2", "milk ×2", "milk (3)" → name + quantity (1–99). */
export function parseQty(raw: string): Entry {
  const s = raw.trim()
  let m = s.match(QTY_FIRST)
  if (m) return withQty(m[2], Number(m[1]))
  m = s.match(QTY_LAST)
  if (m) return withQty(m[1], Number(m[2] ?? m[3]))
  return { name: s }
}

function withQty(name: string, qty: number): Entry {
  return qty >= 1 && qty <= 99 ? { name, qty } : { name }
}

/**
 * Splits "Milk, 2 eggs and bread." into separate items (with quantities),
 * unless the whole phrase is something we've added before ("Mac and cheese").
 */
export function splitEntry(input: string, known: Set<string>): Entry[] {
  const whole = parseQty(cleanName(input))
  const wholeName = cleanName(whole.name)
  if (!wholeName) return []
  if (known.has(wholeName.toLocaleLowerCase())) return [{ ...whole, name: wholeName }]

  const seen = new Set<string>()
  const out: Entry[] = []
  for (const part of input.split(/[,;\n]|\s+and\s+|\s*&\s*|\s+plus\s+/i)) {
    const entry = parseQty(cleanName(part))
    const name = cleanName(entry.name)
    const key = name.toLocaleLowerCase()
    if (name && !seen.has(key)) {
      seen.add(key)
      out.push({ ...entry, name })
    }
  }
  return out
}
