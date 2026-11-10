import { describe, expect, it } from 'vitest'
import { isVisiblePlotChange } from './plotChange'
import useAppStore from '../store/useAppStore'

describe('isVisiblePlotChange', () => {
  it('colour, filter, embedding and viewport changes are visible', () => {
    for (const cfg of [
      { colorBy: 'gene', gene: 'CD8A' },
      { filter: { ids: ['a'], obsColumn: 'x' } },
      { embedding: 'X_umap' },
      { viewport: null },
      { fitViewportToSelection: true },
      { selectionDisplayMode: 'hide' },
    ]) {
      expect(isVisiblePlotChange(cfg), JSON.stringify(cfg)).toBe(true)
    }
  })

  it('summary-only changes are not visible', () => {
    for (const cfg of [
      { summaryObsColumns: ['x'] },
      { removeSummaryGenes: ['CD8A'] },
      { summaryContext: 'selections' },
    ]) {
      expect(isVisiblePlotChange(cfg), JSON.stringify(cfg)).toBe(false)
    }
  })
})

describe('notePlotChange', () => {
  it('bumps plotChangeEpoch', () => {
    useAppStore.setState({ plotChangeEpoch: 0 })
    useAppStore.getState().notePlotChange()
    expect(useAppStore.getState().plotChangeEpoch).toBe(1)
  })
})
