import type { CSSProperties, ComponentType } from 'react'

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

export const CellExplorer: ComponentType<CellExplorerProps>
export default CellExplorer
