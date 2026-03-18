interface VersionTagProps {
  version: string
  commitHash: string
}

export function VersionTag({ version, commitHash }: VersionTagProps) {
  return (
    <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal' }}>
      <span>v{version}</span>{' '}
      <span>({commitHash})</span>
    </span>
  )
}
