type RegionOption = { slug: string; name: string }

type Props = {
  regions: RegionOption[]
  current: { region?: string; type?: string; q?: string }
}

const TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'casual', label: 'Casual' },
  { value: 'contract', label: 'Contract' },
]

export default function JobFilters({ regions, current }: Props) {
  return (
    <form method="GET" action="/jobs" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
      <input
        type="search"
        name="q"
        placeholder="Search job titles…"
        defaultValue={current.q ?? ''}
        className="input-dark"
        style={{ flex: '1 1 200px', minWidth: 0 }}
      />
      <select name="region" defaultValue={current.region ?? ''} className="input-dark" style={{ flex: '0 1 180px' }}>
        <option value="">Any region</option>
        {regions.map(r => (
          <option key={r.slug} value={r.slug}>{r.name}</option>
        ))}
      </select>
      <select name="type" defaultValue={current.type ?? ''} className="input-dark" style={{ flex: '0 1 160px' }}>
        {TYPE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button type="submit" className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>Filter</button>
    </form>
  )
}
