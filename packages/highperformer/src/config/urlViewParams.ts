import { AppConfigSchema, type AppConfig } from './schema'
import { applyConfig } from './applyConfig'
import { applyErrorMessage } from './applyResult'
import type { AppState } from '../store/useAppStore'

/**
 * Human-readable URL params that mirror the current view, e.g.
 * `/view?dataset=foo&embedding=X_umap&gene=EGFR&colorScale=magma`.
 *
 * The URL is read once after the dataset (and its default_view) has loaded;
 * after that the store is the source of truth and the URL is written one-way.
 */
export const VIEW_PARAM_KEYS = ['embedding', 'gene', 'colorBy', 'colorScale'] as const
export type ViewParamKey = (typeof VIEW_PARAM_KEYS)[number]
export type ViewParams = Partial<Record<ViewParamKey, string>>

const DEFAULT_COLOR_SCALE = 'viridis'

type ViewState = Pick<
  AppState,
  'selectedEmbedding' | 'colorMode' | 'selectedGene' | 'selectedObsColumn' | 'colorScaleName' | 'geneLabelMap'
>

export function viewParamsFromState(state: ViewState): ViewParams {
  const params: ViewParams = {}
  if (state.selectedEmbedding) params.embedding = state.selectedEmbedding
  if (state.colorMode === 'gene') {
    if (state.selectedGene) {
      // Prefer the gene symbol over an opaque var index (e.g. Ensembl ID)
      params.gene = state.geneLabelMap?.get(state.selectedGene) ?? state.selectedGene
    }
  } else if (state.selectedObsColumn) {
    params.colorBy = state.selectedObsColumn
  }
  if (state.colorScaleName && state.colorScaleName !== DEFAULT_COLOR_SCALE) {
    params.colorScale = state.colorScaleName
  }
  return params
}

export function readViewParams(search: URLSearchParams): ViewParams {
  const params: ViewParams = {}
  for (const key of VIEW_PARAM_KEYS) {
    const value = search.get(key)
    if (value) params[key] = value
  }
  return params
}

/** Query-value encoding that leaves `:` and `/` readable (both are legal in a query). */
export function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(/%3A/gi, ':').replace(/%2F/gi, '/')
}

/**
 * Returns `search` (with or without a leading `?`) with the view params
 * replaced by `params`. Other params are kept verbatim, so a hand-written
 * `?url=https://...` isn't re-encoded.
 */
export function mergeViewParams(search: string, params: ViewParams): string {
  const keys: readonly string[] = VIEW_PARAM_KEYS
  const kept = search.replace(/^\?/, '').split('&').filter((pair) => {
    if (!pair) return false
    const rawKey = pair.split('=')[0]
    let key = rawKey
    try { key = decodeURIComponent(rawKey.replace(/\+/g, ' ')) } catch { /* keep raw key */ }
    return !keys.includes(key)
  })
  const added = VIEW_PARAM_KEYS
    .filter((key) => params[key])
    .map((key) => `${key}=${encodeQueryValue(params[key]!)}`)
  return [...kept, ...added].join('&')
}

/**
 * Split view params into independent config patches, so one stale param
 * (e.g. a gene missing from this dataset) doesn't block the others.
 * Ordered so the embedding loads before coloring is applied.
 */
export function viewParamsToConfigs(params: ViewParams): AppConfig[] {
  const configs: AppConfig[] = []
  if (params.embedding) configs.push({ embedding: params.embedding })
  if (params.gene) configs.push({ colorBy: 'gene', gene: params.gene })
  else if (params.colorBy) configs.push({ colorBy: 'category', category: params.colorBy })
  if (params.colorScale) {
    const parsed = AppConfigSchema.shape.colorScaleName.safeParse(params.colorScale)
    if (parsed.success && parsed.data) configs.push({ colorScaleName: parsed.data })
    else console.warn(`[url] Ignoring unknown colorScale: ${params.colorScale}`)
  }
  return configs
}

/** Apply view params to the loaded dataset; returns messages for params that failed. */
export async function applyViewParams(params: ViewParams): Promise<string[]> {
  const errors: string[] = []
  for (const config of viewParamsToConfigs(params)) {
    const result = await applyConfig(config)
    if (!result.ok) errors.push(applyErrorMessage(result.reason))
  }
  return errors
}
