import { Radio, Select, AutoComplete, Alert } from 'antd'
import useAppStore from '../store/useAppStore'
import type { ColorMode } from '../store/useAppStore'
import { COLOR_SCALES } from '../utils/colors'

const scaleOptions = Object.keys(COLOR_SCALES).map((name) => ({
  value: name,
  label: name.charAt(0).toUpperCase() + name.slice(1),
}))

export default function ColorBySection() {
  const colorMode = useAppStore((s) => s.colorMode)
  const setColorMode = useAppStore((s) => s.setColorMode)
  const obsColumnNames = useAppStore((s) => s.obsColumnNames)
  const varNames = useAppStore((s) => s.varNames)
  const selectedObsColumn = useAppStore((s) => s.selectedObsColumn)
  const selectedGene = useAppStore((s) => s.selectedGene)
  const colorScaleName = useAppStore((s) => s.colorScaleName)
  const selectObsColumn = useAppStore((s) => s.selectObsColumn)
  const selectGene = useAppStore((s) => s.selectGene)
  const setColorScaleName = useAppStore((s) => s.setColorScaleName)
  const categoryWarning = useAppStore((s) => s.categoryWarning)

  const columnOptions = obsColumnNames.map((name) => ({ value: name, label: name }))
  const geneOptions = varNames.map((name) => ({ value: name, label: name }))

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Color By</div>

      <Radio.Group
        value={colorMode}
        onChange={(e) => setColorMode(e.target.value as ColorMode)}
        size="small"
        style={{ marginBottom: 12 }}
      >
        <Radio.Button value="default">Default</Radio.Button>
        <Radio.Button value="category">Category</Radio.Button>
        <Radio.Button value="gene">Gene</Radio.Button>
      </Radio.Group>

      {colorMode === 'category' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>Column</div>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Select column..."
            value={selectedObsColumn}
            onChange={selectObsColumn}
            options={columnOptions}
            style={{ width: '100%' }}
            size="small"
          />
          {categoryWarning && (
            <Alert
              title={categoryWarning}
              type="warning"
              showIcon
              style={{ marginTop: 8, fontSize: 12 }}
            />
          )}
        </div>
      )}

      {colorMode === 'gene' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>Gene</div>
          <AutoComplete
            options={geneOptions}
            optionFilterProp="label"
            placeholder="Search gene..."
            value={selectedGene ?? undefined}
            onSelect={selectGene}
            style={{ width: '100%' }}
            size="small"
          />
          <div style={{ fontSize: 12, marginBottom: 4, marginTop: 8 }}>Scale</div>
          <Select
            value={colorScaleName}
            onChange={setColorScaleName}
            options={scaleOptions}
            style={{ width: '100%' }}
            size="small"
          />
        </div>
      )}
    </div>
  )
}
