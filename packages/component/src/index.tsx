import { useEffect, useRef, type CSSProperties } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, Spin, theme } from 'antd'
import useAppStore from '../../highperformer/src/store/useAppStore'
import { applyConfig } from '../../highperformer/src/config/applyConfig'
import type { AppConfig } from '../../highperformer/src/config/schema'
import View from '../../highperformer/src/pages/View'

export interface MappedColumnSpec {
  label: string
  sourceColumn: string
  mapping: Record<string, string>
}

export interface CellExplorerFilterConfig {
  ids?: string[]
  obsColumn?: string
  embeddingKey?: string
  colorBy?: { type: 'category' | 'gene'; value: string }
  mappedColumns?: MappedColumnSpec[]
}

export interface CellExplorerProps {
  url: string
  filterConfig?: CellExplorerFilterConfig
  style?: CSSProperties
  className?: string
}

function toAppConfig(url: string, fc?: CellExplorerFilterConfig): AppConfig {
  const appConfig: Record<string, unknown> = {
    url,
    showHeader: false,
    showLeftSidebar: true,
    showRightSidebar: true,
    showDatasetDropdown: false,
  }
  if (fc) {
    if (fc.embeddingKey) appConfig.embedding = fc.embeddingKey
    if (fc.colorBy) {
      appConfig.colorBy = fc.colorBy.type
      if (fc.colorBy.type === 'gene') appConfig.gene = fc.colorBy.value
      if (fc.colorBy.type === 'category') appConfig.category = fc.colorBy.value
    }
    if (fc.ids && fc.obsColumn) {
      appConfig.filter = { ids: fc.ids, obsColumn: fc.obsColumn }
    }
    if (fc.mappedColumns) {
      appConfig.mappedColumns = fc.mappedColumns
    }
  }
  return appConfig as AppConfig
}

function fingerprint(url: string, fc?: CellExplorerFilterConfig): string {
  return JSON.stringify({ url, fc })
}

function CellExplorerInner({ url, filterConfig }: CellExplorerProps) {
  const loading = useAppStore((s) => s.loading)
  const adata = useAppStore((s) => s.adata)
  const lastFingerprint = useRef<string | null>(null)
  const mappedColumnsRegistered = useRef(false)

  useEffect(() => {
    if (!url) return
    const fp = fingerprint(url, filterConfig)
    if (fp === lastFingerprint.current) return
    lastFingerprint.current = fp
    mappedColumnsRegistered.current = false
    applyConfig(toAppConfig(url, filterConfig))
  }, [url, filterConfig])

  useEffect(() => {
    if (!adata || mappedColumnsRegistered.current) return
    const mc = filterConfig?.mappedColumns
    if (!mc || mc.length === 0) return
    mappedColumnsRegistered.current = true
    useAppStore.getState().registerMappedColumns(mc)
  }, [adata, filterConfig])

  if (loading && !adata) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }
  return <View />
}

export function CellExplorer({ url, filterConfig, style, className }: CellExplorerProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', ...style }}>
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
        <MemoryRouter initialEntries={['/view']}>
          <Routes>
            <Route
              path="*"
              element={<CellExplorerInner url={url} filterConfig={filterConfig} />}
            />
          </Routes>
        </MemoryRouter>
      </ConfigProvider>
    </div>
  )
}

export default CellExplorer
