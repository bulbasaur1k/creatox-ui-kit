import { useEffect, useState } from 'react'

/**
 * Whether the pointer is fine — a mouse or a trackpad rather than a finger.
 *
 * Read through a listener rather than once at mount: a laptop with a
 * touchscreen answers "coarse" and "fine" at the same time, and the answer
 * changes with whatever it was touched by last.
 */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(
    () => window.matchMedia?.('(pointer: fine)').matches ?? false,
  )

  useEffect(() => {
    const query = window.matchMedia('(pointer: fine)')
    const onChange = () => setFine(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return fine
}
