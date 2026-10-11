/** Writes are fire-and-forget (offline writes only resolve once the server confirms), so failures surface here. */
export function report(e: unknown) {
  console.error(e)
  window.dispatchEvent(new CustomEvent('outof:error', { detail: 'Couldn’t save that change. Try again?' }))
}
