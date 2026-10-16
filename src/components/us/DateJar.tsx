import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../app-context'
import { addIdea, deleteIdea, markIdeaDone, type Idea } from '../../data/ideas'
import { CloseIcon } from '../Icons'
import { FoldAction } from '../FoldAction'

const SHUFFLE_MS = 1100

/** Drop date ideas in; "Pick one" shuffles and lands on one you haven't done yet. */
export function DateJar({ ideas }: { ideas: Idea[] | null }) {
  const { household, uid, toast } = useApp()
  const hid = household.id
  const [draft, setDraft] = useState('')
  const [shuffling, setShuffling] = useState<string | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  if (ideas === null) return null
  const open = ideas.filter((i) => !i.doneAt)
  const done = ideas.filter((i) => i.doneAt).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  const picked = open.find((i) => i.id === pickedId)

  const pick = () => {
    if (!open.length) {
      toast(ideas.length ? 'You’ve done them all! Add a few more' : 'Add a few ideas first')
      return
    }
    // Avoid landing on the same one twice in a row when there's a choice.
    const choices = open.length > 1 ? open.filter((i) => i.id !== pickedId) : open
    const winner = choices[Math.floor(Math.random() * choices.length)]
    setPickedId(null)
    for (let t = 0; t < SHUFFLE_MS; t += 90)
      timers.current.push(window.setTimeout(() => setShuffling(open[Math.floor(Math.random() * open.length)].text), t))
    timers.current.push(
      window.setTimeout(() => {
        setShuffling(null)
        setPickedId(winner.id)
      }, SHUFFLE_MS),
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    addIdea(hid, uid, t)
    setDraft('')
    toast('Into the jar 🫙')
  }

  return (
    <section aria-label="Date jar">
      <h2 className="group-label">
        <span>Date jar</span>
        <span className="jar-count">{open.length === 1 ? '1 idea' : `${open.length} ideas`}</span>
      </h2>
      <div className="group jar-card">
        <div className="jar-stage" aria-live="polite">
          {shuffling ? (
            <p className="jar-shuffle">{shuffling}</p>
          ) : picked ? (
            <>
              <p className="jar-result">✨ {picked.text}</p>
              <div className="jar-actions">
                <button
                  className="btn btn--small"
                  onClick={() => {
                    markIdeaDone(hid, picked.id, true)
                    setPickedId(null)
                    toast('Have fun! 💛')
                  }}
                >
                  Let’s do it
                </button>
                <button className="btn btn--plain btn--small" onClick={pick}>
                  Another
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="jar-emoji" aria-hidden="true">
                🫙
              </span>
              <p className="jar-hint">Drop in date ideas, then let the jar choose.</p>
              <button className="btn btn--small" onClick={pick}>
                Pick one
              </button>
            </>
          )}
        </div>

        <form className="jar-add" onSubmit={submit}>
          <input
            className="row-input"
            value={draft}
            maxLength={200}
            placeholder="Add an idea…"
            aria-label="Add a date idea"
            autoCapitalize="sentences"
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
          />
          {draft.trim() && (
            <button type="submit" className="share-btn">
              Add
            </button>
          )}
        </form>

        {ideas.length > 0 && (
          <button className="row row--action" aria-expanded={showAll} onClick={() => setShowAll((s) => !s)}>
            {showAll ? 'Hide ideas' : `See all ideas (${ideas.length})`}
            <FoldAction open={showAll} show="" hide="" className="row-fold" />
          </button>
        )}
        {showAll &&
          [...open, ...done].map((i) => (
            <div key={i.id} className="row jar-idea" data-done={i.doneAt ? true : undefined}>
              <span className="row-label">{i.text}</span>
              {i.doneAt ? (
                <button className="link" onClick={() => markIdeaDone(hid, i.id, false)}>
                  Put back
                </button>
              ) : null}
              <button className="note-row-remove" aria-label={`Remove ${i.text}`} onClick={() => deleteIdea(hid, i.id)}>
                <CloseIcon />
              </button>
            </div>
          ))}
      </div>
    </section>
  )
}
