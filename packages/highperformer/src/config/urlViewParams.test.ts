import { describe, it, expect } from 'vitest'
import {
  mergeViewParams,
  readViewParams,
  viewParamsFromState,
  viewParamsToConfigs,
} from './urlViewParams'

const baseState = {
  selectedEmbedding: null,
  colorMode: 'category' as const,
  selectedGene: null,
  selectedObsColumn: null,
  colorScaleName: 'viridis',
  geneLabelMap: null,
}

describe('viewParamsFromState', () => {
  it('is empty for a blank view', () => {
    expect(viewParamsFromState(baseState)).toEqual({})
  })

  it('writes embedding and category coloring', () => {
    expect(viewParamsFromState({ ...baseState, selectedEmbedding: 'X_umap', selectedObsColumn: 'cell_type' }))
      .toEqual({ embedding: 'X_umap', colorBy: 'cell_type' })
  })

  it('writes a continuous obs column as colorBy', () => {
    expect(viewParamsFromState({ ...baseState, colorMode: 'obs-continuous', selectedObsColumn: 'n_genes' }))
      .toEqual({ colorBy: 'n_genes' })
  })

  it('writes the gene symbol rather than the var index', () => {
    const geneLabelMap = new Map([['ENSG00000146648', 'EGFR']])
    expect(viewParamsFromState({
      ...baseState, colorMode: 'gene', selectedGene: 'ENSG00000146648', selectedObsColumn: 'cell_type', geneLabelMap,
    })).toEqual({ gene: 'EGFR' })
  })

  it('falls back to the var index when no symbol is known', () => {
    expect(viewParamsFromState({ ...baseState, colorMode: 'gene', selectedGene: 'EGFR' }))
      .toEqual({ gene: 'EGFR' })
  })

  it('only writes a non-default color scale', () => {
    expect(viewParamsFromState({ ...baseState, colorScaleName: 'magma' })).toEqual({ colorScale: 'magma' })
  })
})

describe('readViewParams / mergeViewParams', () => {
  it('reads only the view params', () => {
    const search = new URLSearchParams('dataset=lung&embedding=X_pca&gene=EGFR&foo=bar')
    expect(readViewParams(search)).toEqual({ embedding: 'X_pca', gene: 'EGFR' })
  })

  it('replaces view params and keeps everything else', () => {
    const next = mergeViewParams('?dataset=lung&gene=EGFR&foo=bar', { embedding: 'X_umap', colorBy: 'cell_type' })
    expect(next).toBe('dataset=lung&foo=bar&embedding=X_umap&colorBy=cell_type')
  })

  it('keeps other params verbatim and encodes view values readably', () => {
    const next = mergeViewParams('url=https://cdn/a.zarr&colorBy=old', { colorBy: 'leiden res/1.0' })
    expect(next).toBe('url=https://cdn/a.zarr&colorBy=leiden%20res/1.0')
  })

  it('drops encoded view keys too', () => {
    expect(mergeViewParams('%67ene=EGFR&dataset=lung', {})).toBe('dataset=lung')
  })
})

describe('viewParamsToConfigs', () => {
  it('maps each param to its own config, embedding first', () => {
    expect(viewParamsToConfigs({ colorBy: 'cell_type', embedding: 'X_umap', colorScale: 'plasma' })).toEqual([
      { embedding: 'X_umap' },
      { colorBy: 'category', category: 'cell_type' },
      { colorScaleName: 'plasma' },
    ])
  })

  it('prefers gene over colorBy when both are present', () => {
    expect(viewParamsToConfigs({ gene: 'EGFR', colorBy: 'cell_type' })).toEqual([
      { colorBy: 'gene', gene: 'EGFR' },
    ])
  })

  it('drops an unknown color scale', () => {
    expect(viewParamsToConfigs({ colorScale: 'rainbow' })).toEqual([])
  })
})
