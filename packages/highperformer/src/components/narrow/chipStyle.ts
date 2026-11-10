import type { CSSProperties } from 'react'

/** Floating pill over the plot, shared by the colour and filter chips. */
export const chipStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  zIndex: 5,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  fontSize: 12,
  color: '#12283c',
  background: 'rgba(255, 255, 255, 0.95)',
  border: '1px solid #e2e9f0',
  borderRadius: 14,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  cursor: 'pointer',
}
