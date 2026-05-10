type ClaimedBusiness = { id: string; name: string }

type JobDefaults = {
  businessId?: string
  title?: string
  description?: string
  employmentType?: 'full_time' | 'part_time' | 'casual' | 'contract'
  applyUrl?: string | null
  applyEmail?: string | null
  salary?: string | null
}

type Props = {
  action: string                      // POST endpoint, e.g. "/api/jobs" or "/api/jobs/<id>"
  businesses: ClaimedBusiness[]       // user's approved businesses; pre-selected if only one
  defaults?: JobDefaults
  submitLabel?: string
}

const TYPE_OPTIONS: Array<{ value: NonNullable<JobDefaults['employmentType']>; label: string }> = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'casual', label: 'Casual' },
  { value: 'contract', label: 'Contract' },
]

export default function JobForm({ action, businesses, defaults = {}, submitLabel = 'Post job' }: Props) {
  const labelStyle: React.CSSProperties = { color: '#A1A1AA', fontSize: 13, display: 'block', marginBottom: 6 }
  const lockedBusiness = businesses.length === 1
  const selectedBusinessId = defaults.businessId ?? (lockedBusiness ? businesses[0].id : '')

  return (
    <form action={action} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={labelStyle}>Business *</label>
        {lockedBusiness ? (
          <>
            <input type="hidden" name="businessId" value={selectedBusinessId} />
            <div style={{ color: '#fff', fontSize: 15 }}>{businesses[0].name}</div>
          </>
        ) : (
          <select name="businessId" required defaultValue={selectedBusinessId} className="input-dark">
            <option value="">Select business</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label style={labelStyle}>Job title *</label>
        <input type="text" name="title" required maxLength={120} defaultValue={defaults.title ?? ''} className="input-dark" />
      </div>

      <div>
        <label style={labelStyle}>Description * <span style={{ color: '#52525B' }}>(max 5000 chars)</span></label>
        <textarea name="description" required maxLength={5000} rows={8} defaultValue={defaults.description ?? ''} className="input-dark" style={{ resize: 'vertical' }} />
      </div>

      <div>
        <label style={labelStyle}>Employment type *</label>
        <select name="employmentType" required defaultValue={defaults.employmentType ?? ''} className="input-dark">
          <option value="">Select type</option>
          {TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Salary <span style={{ color: '#52525B' }}>(optional, e.g. &quot;$28/hr&quot;)</span></label>
        <input type="text" name="salary" maxLength={60} defaultValue={defaults.salary ?? ''} className="input-dark" />
      </div>

      <div style={{ borderTop: '1px solid #27272A', paddingTop: 20 }}>
        <p style={{ color: '#A1A1AA', fontSize: 13, margin: '0 0 12px' }}>
          How should applicants apply? <strong style={{ color: '#fff' }}>Provide one</strong>: a URL or an email.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Apply URL</label>
          <input type="url" name="applyUrl" maxLength={500} defaultValue={defaults.applyUrl ?? ''} placeholder="https://..." className="input-dark" />
        </div>

        <div>
          <label style={labelStyle}>Apply email</label>
          <input type="email" name="applyEmail" maxLength={200} defaultValue={defaults.applyEmail ?? ''} placeholder="hiring@example.co.nz" className="input-dark" />
        </div>
      </div>

      <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 28px' }}>
        {submitLabel}
      </button>
    </form>
  )
}
