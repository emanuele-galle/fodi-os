import { refreshAccessToken } from '@/hooks/useAuthRefresh'

/**
 * Fetch wrapper that automatically refreshes the access token on 401
 * and retries the original request once.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)

  if (res.status === 401) {
    // Try to parse refresh hint
    try {
      const body = await res.clone().json()
      if (body.refresh) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry original request with new cookie
          return fetch(input, init)
        }
      }
    } catch {
      // Not JSON or parsing failed, return original response
    }
  }

  return res
}
