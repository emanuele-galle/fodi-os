'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook centralizzato per fetch GET.
 * - AbortController per cleanup automatico
 * - url === null salta il fetch (conditional fetching)
 * - Generic typing per il risultato
 * - refetch callback stabile
 */
export function useFetch<T>(
  url: string | null,
  options?: { deps?: unknown[]; init?: RequestInit }
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(url !== null)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)

  const deps = options?.deps
  const init = options?.init

  useEffect(() => {
    if (url === null) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(url, { ...init, signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Errore ${res.status}`)
        return res.json()
      })
      .then((json) => setData(json))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, trigger, ...(deps ?? [])])

  const refetch = useCallback(() => {
    setTrigger((n) => n + 1)
  }, [])

  return { data, loading, error, refetch }
}
