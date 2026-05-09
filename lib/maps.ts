/** Extract a search query from various Google Maps URL formats */
export function extractMapsQuery(url: string): string | null {
  try {
    const u = new URL(url)

    // https://www.google.com/maps/place/Some+Place/...
    const placeMatch = u.pathname.match(/\/maps\/place\/([^/]+)/)
    if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))

    // https://maps.google.com/?q=...  or  https://www.google.com/maps?q=...
    const q = u.searchParams.get('q')
    if (q) return q

    // https://www.google.com/maps/search/...
    const searchMatch = u.pathname.match(/\/maps\/search\/([^/]+)/)
    if (searchMatch) return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))

    return null
  } catch {
    return null
  }
}
