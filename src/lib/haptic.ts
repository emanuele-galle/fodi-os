/**
 * Haptic feedback utility for mobile devices.
 * Uses navigator.vibrate() with graceful fallback.
 */
export function haptic(type: 'light' | 'medium' | 'heavy' | 'error' = 'light') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return

  const patterns: Record<typeof type, number | number[]> = {
    light: 5,
    medium: 15,
    heavy: 30,
    error: [30, 50, 30],
  }

  try {
    navigator.vibrate(patterns[type])
  } catch {
    // Silently fail on browsers that don't support vibrate
  }
}
