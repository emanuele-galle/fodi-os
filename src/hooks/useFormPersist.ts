import { useState, useEffect, useCallback, useRef } from 'react'

export function useFormPersist<T extends Record<string, unknown>>(
  key: string,
  initialValues: T
): {
  values: T
  setValue: (field: keyof T, value: T[keyof T]) => void
  setValues: (values: Partial<T>) => void
  reset: () => void
  isDirty: boolean
  hasPersistedData: boolean
} {
  const storageKey = `form-persist:${key}`
  const initialRef = useRef(initialValues)

  const [hasPersistedData, setHasPersistedData] = useState(false)

  const [values, setValuesState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValues
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as T
        setHasPersistedData(true)
        return { ...initialValues, ...parsed }
      }
    } catch {}
    return initialValues
  })

  // Lazy init workaround: hasPersistedData can't be set during useState init
  const checkedRef = useRef(false)
  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) setHasPersistedData(true)
    } catch {}
  }, [storageKey])

  // Debounced save to sessionStorage
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveToStorage = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(data))
        } catch {}
      }, 300)
    },
    [storageKey]
  )

  const setValue = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setValuesState((prev) => {
        const next = { ...prev, [field]: value }
        saveToStorage(next)
        return next
      })
    },
    [saveToStorage]
  )

  const setValues = useCallback(
    (partial: Partial<T>) => {
      setValuesState((prev) => {
        const next = { ...prev, ...partial }
        saveToStorage(next)
        return next
      })
    },
    [saveToStorage]
  )

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      sessionStorage.removeItem(storageKey)
    } catch {}
    setValuesState(initialRef.current)
    setHasPersistedData(false)
  }, [storageKey])

  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initialRef.current)

  // Warn on page unload if dirty
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { values, setValue, setValues, reset, isDirty, hasPersistedData }
}
