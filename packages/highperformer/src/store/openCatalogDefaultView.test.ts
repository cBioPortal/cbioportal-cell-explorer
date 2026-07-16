import { describe, it, expect, vi, beforeEach } from 'vitest'

const applyConfigMock = vi.fn().mockResolvedValue({ ok: true })
vi.mock('../config/applyConfig', () => ({ applyConfig: applyConfigMock }))

import useAppStore from './useAppStore'

describe('openCatalogDataset applies default_view', () => {
  beforeEach(() => {
    applyConfigMock.mockClear()
    // Stub openDataset so no real zarr load happens; clear catalog + errors.
    useAppStore.setState({
      openDataset: vi.fn().mockResolvedValue(undefined) as never,
      catalogDatasets: [],
      loadingError: null as never,
    })
  })

  it('calls applyConfig with default_view when the dataset has one', async () => {
    const default_view = { colorBy: 'category', category: 'cell_type' }
    useAppStore.setState({
      catalogDatasets: [
        {
          slug: 'ds1',
          name: 'DS1',
          description: null,
          is_public: true,
          url: 'https://cdn/ds1.zarr',
          chat_enabled: false,
          default_view,
        },
      ],
    })
    await useAppStore.getState().openCatalogDataset('ds1')
    expect(applyConfigMock).toHaveBeenCalledWith(default_view)
  })

  it('does not call applyConfig when default_view is absent', async () => {
    useAppStore.setState({
      catalogDatasets: [
        {
          slug: 'ds2',
          name: 'DS2',
          description: null,
          is_public: true,
          url: 'https://cdn/ds2.zarr',
          chat_enabled: false,
        },
      ],
    })
    await useAppStore.getState().openCatalogDataset('ds2')
    expect(applyConfigMock).not.toHaveBeenCalled()
  })
})
