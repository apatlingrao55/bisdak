export const SITE_BASE = 'https://bisdak.co.nz'
export const SITE_NAME = 'BisDak'

const ORG_ID = `${SITE_BASE}/#organization`

/** Map a BisDak category slug to the most specific Schema.org LocalBusiness subtype. */
export function localBusinessTypeForCategory(slug: string | null | undefined): string {
  switch (slug) {
    case 'food-dining':
      return 'Restaurant'
    case 'professional-services':
      return 'ProfessionalService'
    case 'health-wellness':
      return 'MedicalBusiness'
    case 'trades-home-services':
      return 'HomeAndConstructionBusiness'
    case 'beauty-personal-care':
      return 'BeautySalon'
    case 'remittance-travel':
      return 'FinancialService'
    case 'retail-groceries':
      return 'Store'
    case 'community-events':
    default:
      return 'LocalBusiness'
  }
}

type Biz = {
  id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  facebookUrl: string | null
  googleMapsUrl: string | null
  photoUrl: string | null
  categoryName?: string | null
  categorySlug?: string | null
  regionName?: string | null
}

export function businessJsonLd(biz: Biz, opts?: { avgRating?: number; reviewCount?: number }) {
  const url = `${SITE_BASE}/business/${biz.slug}`
  const type = localBusinessTypeForCategory(biz.categorySlug)
  const sameAs: string[] = []
  if (biz.facebookUrl) sameAs.push(biz.facebookUrl)
  if (biz.website) sameAs.push(biz.website)
  const image = biz.photoUrl ?? `${SITE_BASE}/api/og/${biz.slug}`

  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#business`,
    name: biz.name,
    url,
    image,
  }
  if (biz.description) json.description = biz.description
  if (biz.phone) json.telephone = biz.phone
  if (biz.email) json.email = biz.email
  if (biz.regionName) {
    json.address = {
      '@type': 'PostalAddress',
      addressLocality: biz.regionName,
      addressRegion: biz.regionName,
      addressCountry: 'NZ',
    }
    json.areaServed = { '@type': 'AdministrativeArea', name: biz.regionName }
  }
  if (biz.googleMapsUrl) json.hasMap = biz.googleMapsUrl
  if (sameAs.length > 0) json.sameAs = sameAs
  if (type === 'Restaurant') json.servesCuisine = 'Filipino'
  if (opts?.avgRating && opts.reviewCount && opts.reviewCount > 0) {
    json.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: opts.avgRating.toFixed(1),
      reviewCount: opts.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }
  return json
}

export function breadcrumbJsonLd(
  trail: Array<{ name: string; url: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_BASE}${item.url}`,
    })),
  }
}

type WebAppCategory = 'FinanceApplication' | 'UtilityApplication' | 'BusinessApplication'

export function webApplicationJsonLd(opts: {
  name: string
  path: string
  description: string
  category: WebAppCategory
}) {
  const url = `${SITE_BASE}${opts.path}`
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${url}#app`,
    name: opts.name,
    url,
    description: opts.description,
    applicationCategory: opts.category,
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'NZD' },
    publisher: { '@id': ORG_ID },
  }
}

/** Inline-script JSON-LD: stringify here so callers don't need to. */
export function jsonLdScript(json: object | object[]) {
  return { __html: JSON.stringify(json) }
}
