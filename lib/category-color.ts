export function getCategoryColor(name?: string | null): string {
  if (!name) return '#1E2C31'
  let hash = 0
  for (const ch of name) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`
}
