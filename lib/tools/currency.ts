/**
 * Fetch live NZD → PHP exchange rate.
 *
 * Primary: frankfurter.dev (ECB-sourced, free, no auth, NZD as base).
 * Fallback: open.er-api.com USD-base, cross-multiply.
 * Last resort: hardcoded snapshot with stale=true.
 *
 * Cached server-side for 5 minutes via Next 16 fetch revalidate.
 */

export type NzdToPhpRate = {
  rate: number
  asOf: string
  source: string
  stale: boolean
}

const FALLBACK_SNAPSHOT: NzdToPhpRate = {
  rate: 31.5,
  asOf: '2026-05-10',
  source: 'fallback (verify)',
  stale: true,
}

export async function getNzdToPhpRate(): Promise<NzdToPhpRate> {
  try {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=NZD&symbols=PHP',
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = await res.json()
      const rate = data?.rates?.PHP
      if (typeof rate === 'number' && rate > 0) {
        return {
          rate,
          asOf: typeof data.date === 'string' ? data.date : '',
          source: 'frankfurter.dev',
          stale: false,
        }
      }
    }
  } catch {
    // fall through to next provider
  }

  try {
    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = await res.json()
      const usdNzd = data?.rates?.NZD
      const usdPhp = data?.rates?.PHP
      if (typeof usdNzd === 'number' && typeof usdPhp === 'number' && usdNzd > 0 && usdPhp > 0) {
        const rawDate = typeof data?.time_last_update_utc === 'string' ? data.time_last_update_utc : ''
        const asOf = rawDate.length >= 10 ? rawDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
        return {
          rate: usdPhp / usdNzd,
          asOf,
          source: 'open.er-api.com (via USD)',
          stale: false,
        }
      }
    }
  } catch {
    // fall through to snapshot
  }

  return { ...FALLBACK_SNAPSHOT }
}
