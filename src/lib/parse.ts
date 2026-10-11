const FILLER =
  /^(?:(?:we(?:'|’)?re|we are|i(?:'|’)?m|i am) out of|out of|we need(?: more)?|need(?: more)?|buy|get|add)\s+/i

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

/**
 * Splits "Milk, eggs and bread." into separate items, unless the whole
 * phrase is something we've added before ("Mac and cheese").
 */
export function splitEntry(input: string, known: Set<string>): string[] {
  const whole = cleanName(input)
  if (!whole) return []
  if (known.has(whole.toLocaleLowerCase())) return [whole]

  const seen = new Set<string>()
  const out: string[] = []
  for (const part of input.split(/[,;\n]|\s+and\s+|\s*&\s*|\s+plus\s+/i)) {
    const name = cleanName(part)
    const key = name.toLocaleLowerCase()
    if (name && !seen.has(key)) {
      seen.add(key)
      out.push(name)
    }
  }
  return out
}
