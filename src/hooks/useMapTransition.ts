import { useState, useCallback } from 'react'

export type FogState = 'hidden' | 'closing' | 'covered' | 'opening'

export function useMapTransition() {
  const [fogState, setFogState] = useState<FogState>('hidden')

  const switchMap = useCallback(async (fetchMapDataAction: () => Promise<void> | void) => {
    // Step A: Set fogState to 'closing' (clouds close inwards 0.8s)
    setFogState('closing')

    // Step B: Wait 0.8s for clouds to close completely
    await new Promise((resolve) => setTimeout(resolve, 800))
    setFogState('covered')

    // Step C: Execute actual data fetch / route change under full fog cover
    try {
      await fetchMapDataAction()
    } catch (err) {
      console.error('Map transition data fetch failed:', err)
    }

    // Give React 100ms to complete DOM rendering under fog cover
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Step D: Change state to 'opening' (clouds open outwards 0.8s)
    setFogState('opening')

    // Step E: Wait 0.8s for opening animation to complete, then hide
    await new Promise((resolve) => setTimeout(resolve, 800))
    setFogState('hidden')
  }, [])

  return {
    fogState,
    switchMap,
  }
}
