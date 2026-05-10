const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'casual', 'contract'] as const
type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export type JobInput = {
  businessId: string
  title: string
  description: string
  employmentType: EmploymentType
  applyUrl: string | null
  applyEmail: string | null
  salary: string | null
}

export type ValidationResult =
  | { ok: true; data: JobInput }
  | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseJobInput(formData: FormData): ValidationResult {
  const businessId = (formData.get('businessId') as string | null)?.trim() ?? ''
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const employmentType = (formData.get('employmentType') as string | null)?.trim() ?? ''
  const applyUrlRaw = (formData.get('applyUrl') as string | null)?.trim() ?? ''
  const applyEmailRaw = (formData.get('applyEmail') as string | null)?.trim() ?? ''
  const salaryRaw = (formData.get('salary') as string | null)?.trim() ?? ''

  if (!businessId) return { ok: false, error: 'businessId is required' }
  if (title.length < 1 || title.length > 120) return { ok: false, error: 'Title must be 1–120 characters' }
  if (description.length < 1 || description.length > 5000) return { ok: false, error: 'Description must be 1–5000 characters' }
  if (!EMPLOYMENT_TYPES.includes(employmentType as EmploymentType)) {
    return { ok: false, error: 'Invalid employment type' }
  }

  const applyUrl = applyUrlRaw || null
  const applyEmail = applyEmailRaw || null
  if ((applyUrl && applyEmail) || (!applyUrl && !applyEmail)) {
    return { ok: false, error: 'Provide exactly one of apply URL or apply email' }
  }
  if (applyUrl && !/^https?:\/\//i.test(applyUrl)) {
    return { ok: false, error: 'Apply URL must start with http:// or https://' }
  }
  if (applyEmail && !EMAIL_RE.test(applyEmail)) {
    return { ok: false, error: 'Apply email is not a valid email address' }
  }

  const salary = salaryRaw ? salaryRaw.slice(0, 60) : null

  return {
    ok: true,
    data: {
      businessId,
      title,
      description,
      employmentType: employmentType as EmploymentType,
      applyUrl,
      applyEmail,
      salary,
    },
  }
}
