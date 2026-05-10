import Link from 'next/link'

const TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  casual: 'Casual',
  contract: 'Contract',
}

type Props = {
  id: string
  title: string
  businessName: string
  regionName: string | null
  employmentType: string
  salary: string | null
  postedAt: Date | string
}

export default function JobCard({ id, title, businessName, regionName, employmentType, salary, postedAt }: Props) {
  return (
    <Link
      href={`/jobs/${id}`}
      style={{
        background: '#0A0A0A',
        border: '1px solid #1F1F22',
        borderRadius: 12,
        padding: '18px 20px',
        display: 'block',
        textDecoration: 'none',
      }}
    >
      <div style={{ color: '#fff', fontSize: 17, fontWeight: 500, marginBottom: 4 }}>{title}</div>
      <div style={{ color: '#A1A1AA', fontSize: 14, marginBottom: 12 }}>
        {businessName}{regionName ? ` · ${regionName}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ background: 'rgba(255,255,255,0.06)', color: '#E4E4E7', fontSize: 12, padding: '3px 10px', borderRadius: 9999 }}>
          {TYPE_LABEL[employmentType] ?? employmentType}
        </span>
        {salary && (
          <span style={{ background: 'rgba(54,244,164,0.10)', color: '#36F4A4', fontSize: 12, padding: '3px 10px', borderRadius: 9999 }}>
            {salary}
          </span>
        )}
        <span style={{ color: '#71717A', fontSize: 12, marginLeft: 'auto' }}>
          {new Date(postedAt).toLocaleDateString('en-NZ')}
        </span>
      </div>
    </Link>
  )
}
