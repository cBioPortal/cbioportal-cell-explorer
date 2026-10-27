import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { message } from 'antd'
import useAppStore from '../store/useAppStore'
import { waitForStore } from './waitForStore'
import { applyViewParams, mergeViewParams, readViewParams, viewParamsFromState } from './urlViewParams'

const URL_WRITE_DEBOUNCE_MS = 300
const METADATA_TIMEOUT_MS = 5 * 60_000

/**
 * Keeps the readable view params (?embedding=, ?gene=, ?colorBy=, ?colorScale=)
 * in step with the store.
 *
 * `hydrate(load)` reads the view params as they are now, waits for the dataset
 * load (including its default_view) and its metadata, then applies them on top. Until
 * hydration completes the URL is left alone; afterwards every store change is
 * written back with `replace`, so it adds no history entries.
 */
export function useUrlViewState(enabled: boolean) {
  const location = useLocation()
  const navigate = useNavigate()
  const locationRef = useRef(location)
  const navigateRef = useRef(navigate)
  useEffect(() => {
    locationRef.current = location
    navigateRef.current = navigate
  })

  // Bumped on every hydrate so a superseded dataset load can't unblock writes
  const generationRef = useRef(0)
  const hydratedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const writeUrl = useCallback(() => {
    if (!hydratedRef.current) return
    const state = useAppStore.getState()
    if (state.loading || state.loadingError) return
    const { pathname, search, hash } = locationRef.current
    const next = mergeViewParams(search, viewParamsFromState(state))
    if (next !== search.replace(/^\?/, '')) {
      navigateRef.current({ pathname, search: next ? `?${next}` : '', hash }, { replace: true })
    }
  }, [])

  const hydrate = useCallback(async (load: Promise<void>) => {
    const generation = ++generationRef.current
    hydratedRef.current = false
    const params = readViewParams(new URLSearchParams(locationRef.current.search))
    await load
    if (generation !== generationRef.current || useAppStore.getState().loadingError) return
    if (Object.keys(params).length > 0) {
      // Large datasets can take longer than applyConfig's own metadata wait.
      // If metadata never arrives, keep the URL as-is rather than dropping
      // params that were never applied.
      try {
        await waitForStore(
          useAppStore,
          (s) => !!s.loadingError || s.obsColumnNames.length > 0,
          METADATA_TIMEOUT_MS,
        )
      } catch {
        return
      }
      if (generation !== generationRef.current || useAppStore.getState().loadingError) return
      const errors = await applyViewParams(params)
      if (generation !== generationRef.current) return
      for (const error of errors) message.warning(error)
    }
    hydratedRef.current = true
    writeUrl()
  }, [writeUrl])

  useEffect(() => {
    if (!enabled) return
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (
        state.selectedEmbedding === prev.selectedEmbedding &&
        state.colorMode === prev.colorMode &&
        state.selectedGene === prev.selectedGene &&
        state.selectedObsColumn === prev.selectedObsColumn &&
        state.colorScaleName === prev.colorScaleName &&
        state.geneLabelMap === prev.geneLabelMap &&
        state.loading === prev.loading
      ) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(writeUrl, URL_WRITE_DEBOUNCE_MS)
    })
    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, writeUrl])

  return hydrate
}
