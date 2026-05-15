/** Treat the default "BisDak Team" byline as an Organization for schema; everything else is a Person. */
export function authorIsTeam(name: string | null | undefined): boolean {
  if (!name) return true
  const n = name.trim().toLowerCase()
  return n === 'bisdak team' || n === 'bisdak' || n === 'team' || n === ''
}

/** Stable, URL-safe slug for a human author byline. */
export function slugifyAuthor(name: string | null | undefined): string {
  if (!name) return 'bisdak-team'
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      // Strip combining diacritical marks (U+0300 to U+036F)
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'bisdak-team'
  )
}
