import { describe, it, expect, vi } from 'vitest'
import { applyConfig } from './applyConfig'
import useAppStore from '../store/useAppStore'

// Regression: a stored default_view is applied via applyConfig WITHOUT a
// url/dataset field, right after openCatalogDataset's openDataset() resolves.
// openDataset resolves with `adata` set but `obsColumnNames` still empty
// (obs columns are fetched a couple async hops later, in fetchEmbedding's
// background Promise). applyConfig must recognize the dataset is open and wait
// for obs metadata rather than bailing with metadata_unavailable.
describe('applyConfig — dataset open but obs metadata not yet loaded', () => {
  it('waits for obsColumnNames instead of bailing, then applies the category', async () => {
    const setColorMode = vi.fn()
    const selectObsColumn = vi.fn((c: string) => useAppStore.setState({ selectedObsColumn: c }))

    useAppStore.setState({
      adata: {} as never, // dataset handle is open …
      obsColumnNames: [], // … but obs columns haven't arrived yet
      loading: false, // openDataset already flipped loading off
      categoryMap: [],
      selectedObsColumn: null,
      setColorMode: setColorMode as never,
      selectObsColumn: selectObsColumn as never,
    })

    // Simulate the background obsColumns() fetch completing a tick later.
    setTimeout(() => useAppStore.setState({ obsColumnNames: ['author_cell_type'] }), 0)

    const res = await applyConfig({
      colorBy: 'category',
      category: 'author_cell_type',
      showCategoryLabels: true,
    })

    expect(res.ok).toBe(true)
    expect(setColorMode).toHaveBeenCalledWith('category')
    expect(selectObsColumn).toHaveBeenCalledWith('author_cell_type')
  })
})
