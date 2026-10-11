import { onSnapshot } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { householdRef, userRef } from '../data/household'
import type { Household } from '../types'

/** undefined = still loading, null = not in a household yet. */
export function useHousehold(uid: string) {
  const [hid, setHid] = useState<string | null | undefined>(undefined)
  const [household, setHousehold] = useState<Household | null | undefined>(undefined)
  // After leaving, reading the list is refused. Rejoining the same list keeps the same id,
  // so this counter is what makes us listen again.
  const [attempt, setAttempt] = useState(0)
  const refused = useRef(false)

  useEffect(() => {
    setHid(undefined)
    return onSnapshot(
      userRef(uid),
      { includeMetadataChanges: true },
      (snap) => {
        // Wait for the server to confirm a join: until then the household
        // doesn't list us as a member and reading it would be denied.
        if (snap.metadata.hasPendingWrites) return
        const next = (snap.data()?.householdId as string | undefined) ?? null
        setHid(next)
        if (next && refused.current) {
          refused.current = false
          setAttempt((a) => a + 1)
        }
      },
      () => setHid(null),
    )
  }, [uid])

  useEffect(() => {
    if (!hid) {
      setHousehold(hid === null ? null : undefined)
      return
    }
    setHousehold(undefined)
    return onSnapshot(
      householdRef(hid),
      (snap) => {
        const d = snap.data()
        setHousehold(
          d
            ? {
                id: snap.id,
                name: d.name ?? 'Our home',
                members: d.members ?? [],
                memberNames: d.memberNames ?? {},
              }
            : null,
        )
      },
      () => {
        refused.current = true
        setHousehold(null)
      },
    )
  }, [hid, attempt])

  return { loading: household === undefined, household: household ?? null }
}
