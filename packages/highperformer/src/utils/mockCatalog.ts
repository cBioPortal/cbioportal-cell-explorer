import useAppStore from '../store/useAppStore'

/**
 * A dev-only catalog fixture, so the collection chips, the Collection column,
 * the column filters and the overview figures can be seen without running a
 * backend. Enabled by `VITE_MOCK_CATALOG=true`, and additionally gated on
 * `import.meta.env.DEV` so it cannot reach a production build.
 *
 * Two deliberate fictions, both in service of previewing the UI:
 *
 * - Several datasets point at the same real store, the only publicly reachable
 *   one we have. Their cell and gene counts are therefore identical and the
 *   overview total is that figure multiplied — real numbers, fake arithmetic.
 * - Private datasets carry a URL. Real ones have `url: null` until `/access`
 *   resolves one, which cannot happen without a backend; giving them a URL lets
 *   the Private label render against a reachable store instead of an error.
 *
 * Two entries point at hosts that do not exist, on purpose — the unreachable
 * state is part of what needs designing.
 *
 * Every caller that fetches catalog or collections must check
 * `MOCK_CATALOG_ENABLED` and skip. A real backend on the proxied `/api` port
 * will otherwise overwrite the fixture piecemeal, leaving the page showing a
 * mix of both.
 */

const REACHABLE = 'https://cbioportal-public-imaging.assets.cbioportal.org/msk_spectrum_tme_2022/zarr/spectrum_all_cells-f16-zstd-c1s30-v3.zarr'
const MISSING = 'https://example.invalid/not-here.zarr'

const COLLECTIONS = [
  {
    slug: 'msk-spectrum-tme-2022',
    name: 'MSK SPECTRUM',
    description: 'Ovarian cancer tumour microenvironment across anatomical sites',
    publication_url: 'https://www.nature.com/articles/s41586-022-05496-1',
    publication_citation: 'Vázquez-García et al., Nature 2022',
    dataset_count: 3,
  },
  {
    slug: 'lung-adenocarcinoma',
    name: 'Lung adenocarcinoma',
    description: 'Primary tumour and matched normal lung, treatment-naive',
    publication_url: null,
    publication_citation: null,
    dataset_count: 2,
  },
  {
    slug: 'colorectal-atlas',
    name: 'Colorectal atlas',
    description: 'Cross-study colorectal reference spanning 12 cohorts',
    publication_url: 'https://example.org/crc-atlas',
    publication_citation: 'Example et al., Cell 2024',
    dataset_count: 2,
  },
  {
    slug: 'immune-reference',
    name: 'Immune reference',
    description: 'Healthy-donor PBMC reference used for label transfer',
    publication_url: null,
    publication_citation: null,
    dataset_count: 1,
  },
]

const ref = (slug: string, name: string) => ({ slug, name })

const DATASETS = [
  {
    slug: 'spectrum-all-cells',
    name: 'SPECTRUM — all cells',
    description: 'Every cell passing QC across 41 donors and 8 anatomical sites',
    is_public: true,
    url: REACHABLE,
    chat_enabled: true,
    collection: ref('msk-spectrum-tme-2022', 'MSK SPECTRUM'),
  },
  {
    slug: 'spectrum-t-cells',
    name: 'SPECTRUM — T cells',
    description: 'T and NK compartment, re-embedded and re-clustered',
    is_public: true,
    url: REACHABLE,
    chat_enabled: true,
    collection: ref('msk-spectrum-tme-2022', 'MSK SPECTRUM'),
  },
  {
    slug: 'spectrum-myeloid',
    name: 'SPECTRUM — myeloid',
    description: 'Monocyte, macrophage and dendritic populations',
    is_public: false,
    url: REACHABLE,
    chat_enabled: false,
    collection: ref('msk-spectrum-tme-2022', 'MSK SPECTRUM'),
  },
  {
    slug: 'luad-primary',
    name: 'LUAD primary tumour',
    description: 'Treatment-naive primary lung adenocarcinoma, 14 patients',
    is_public: true,
    url: REACHABLE,
    chat_enabled: false,
    collection: ref('lung-adenocarcinoma', 'Lung adenocarcinoma'),
  },
  {
    slug: 'luad-normal',
    name: 'LUAD matched normal',
    description: 'Adjacent uninvolved lung from the same donors',
    is_public: true,
    url: MISSING,
    chat_enabled: false,
    collection: ref('lung-adenocarcinoma', 'Lung adenocarcinoma'),
  },
  {
    slug: 'crc-atlas-full',
    name: 'CRC atlas — integrated',
    description: 'Harmony-integrated reference across 12 colorectal cohorts',
    is_public: true,
    url: REACHABLE,
    chat_enabled: true,
    collection: ref('colorectal-atlas', 'Colorectal atlas'),
  },
  {
    slug: 'crc-atlas-epithelial',
    name: 'CRC atlas — epithelial',
    description: null,
    is_public: false,
    url: MISSING,
    chat_enabled: false,
    collection: ref('colorectal-atlas', 'Colorectal atlas'),
  },
  {
    slug: 'pbmc-reference',
    name: 'PBMC healthy reference',
    description: '10k sorted PBMCs from three healthy donors',
    is_public: true,
    url: REACHABLE,
    chat_enabled: false,
    collection: ref('immune-reference', 'Immune reference'),
  },
  {
    slug: 'ungrouped-pilot',
    name: 'Pilot run — unassigned',
    description: 'Not yet filed under a collection',
    is_public: true,
    url: REACHABLE,
    chat_enabled: false,
    collection: null,
  },
]

export const MOCK_CATALOG_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_CATALOG === 'true'

/**
 * Seeds the store and reports whether it did, so the caller can skip the real
 * backend probe entirely rather than racing it.
 */
export function installMockCatalog(): boolean {
  if (!MOCK_CATALOG_ENABLED) return false

  useAppStore.setState({
    backendInfo: { auth_enabled: false } as never,
    backendProbed: true,
    collections: COLLECTIONS,
    catalogDatasets: DATASETS,
  })
  return true
}
