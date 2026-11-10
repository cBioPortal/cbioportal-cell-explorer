import { useState } from 'react'
import { Drawer } from 'antd'
import useAppStore from '../../store/useAppStore'
import ColorBySection from '../ColorBySection'
import { chipStyle } from './chipStyle'

/** Shows what the plot is coloured by; tap to change it and see the legend. */
export function ColorByChip() {
  const colorMode = useAppStore((s) => s.colorMode)
  const selectedObsColumn = useAppStore((s) => s.selectedObsColumn)
  const selectedGene = useAppStore((s) => s.selectedGene)
  const [open, setOpen] = useState(false)
  const label = (colorMode === 'gene' ? selectedGene : selectedObsColumn) ?? 'none'

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ ...chipStyle, left: 8, maxWidth: 'calc(100% - 140px)' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Color: {label}</span> ▾
      </button>
      <Drawer
        placement="bottom"
        open={open}
        onClose={() => setOpen(false)}
        title="Color by"
        height="70%"
        styles={{ body: { padding: 0 } }}
      >
        <ColorBySection />
      </Drawer>
    </>
  )
}
