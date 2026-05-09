export function slugify(text: string, suffix?: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base + '-' + (suffix ?? String(Date.now()))
}
