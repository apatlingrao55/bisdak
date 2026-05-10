type Props = {
  status: 'open' | 'closed'
  expiresAt: Date | string
  closedAt: Date | string | null
}

export default function JobStatusBadge({ status, expiresAt, closedAt }: Props) {
  const isExpired = new Date(expiresAt) <= new Date()
  let label = 'Open'
  let bg = 'rgba(54,244,164,0.12)'
  let fg = '#36F4A4'

  if (closedAt || status === 'closed') {
    label = 'Closed'
    bg = 'rgba(161,161,170,0.15)'
    fg = '#A1A1AA'
  } else if (isExpired) {
    label = 'Expired'
    bg = 'rgba(244,114,182,0.12)'
    fg = '#F472B6'
  }

  return (
    <span style={{ background: bg, color: fg, fontSize: 12, padding: '3px 10px', borderRadius: 9999, fontWeight: 500 }}>
      {label}
    </span>
  )
}
