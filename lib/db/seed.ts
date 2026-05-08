import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./filipinohub.db')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

async function seed() {
  console.log('Seeding categories...')
  const cats = await db.insert(schema.categories).values([
    { name: 'Food & Dining', slug: 'food-dining', icon: '🍽️' },
    { name: 'Professional Services', slug: 'professional-services', icon: '💼' },
    { name: 'Health & Wellness', slug: 'health-wellness', icon: '🏥' },
    { name: 'Trades & Home Services', slug: 'trades-home-services', icon: '🔧' },
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', icon: '💅' },
    { name: 'Remittance & Travel', slug: 'remittance-travel', icon: '✈️' },
    { name: 'Retail & Groceries', slug: 'retail-groceries', icon: '🛒' },
    { name: 'Community & Events', slug: 'community-events', icon: '🎉' },
  ]).returning()

  console.log('Seeding regions...')
  const regs = await db.insert(schema.regions).values([
    { name: 'Auckland', slug: 'auckland' },
    { name: 'Canterbury', slug: 'canterbury' },
    { name: 'Wellington', slug: 'wellington' },
    { name: 'Waikato', slug: 'waikato' },
    { name: 'Other NZ', slug: 'other-nz' },
  ]).returning()

  const catMap: Record<string, number> = Object.fromEntries(cats.map(c => [c.slug, c.id]))
  const regMap: Record<string, number> = Object.fromEntries(regs.map(r => [r.slug, r.id]))

  console.log('Seeding businesses...')
  await db.insert(schema.businesses).values([
    {
      name: 'Jollibee Auckland Central',
      slug: 'jollibee-auckland-central',
      categoryId: catMap['food-dining'],
      regionId: regMap['auckland'],
      description: 'Iconic Filipino fast food chain serving Chickenjoy, Jolly Spaghetti and peach mango pie.',
      phone: '+64 9 300 1234',
      website: 'https://jollibee.co.nz',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Kuya J Restaurant',
      slug: 'kuya-j-restaurant',
      categoryId: catMap['food-dining'],
      regionId: regMap['auckland'],
      description: 'Authentic Filipino comfort food — lechon, kare-kare, sinigang, and classic rice meals.',
      phone: '+64 9 456 7890',
      facebookUrl: 'https://facebook.com/kuyajnz',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Manila Bakeshop',
      slug: 'manila-bakeshop',
      categoryId: catMap['food-dining'],
      regionId: regMap['wellington'],
      description: 'Fresh Filipino pastries daily: ensaymada, pan de sal, bibingka, and ube cheese pandesal.',
      phone: '+64 4 567 8901',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Aling Rosa Catering',
      slug: 'aling-rosa-catering',
      categoryId: catMap['food-dining'],
      regionId: regMap['canterbury'],
      description: 'Full-service Filipino catering for parties, birthdays, and corporate events across Christchurch.',
      phone: '+64 3 234 5678',
      facebookUrl: 'https://facebook.com/alingrosacatering',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Pinoy Remittance Hamilton',
      slug: 'pinoy-remittance-hamilton',
      categoryId: catMap['remittance-travel'],
      regionId: regMap['waikato'],
      description: 'Fast and affordable money transfers to the Philippines. Competitive rates, no hidden fees.',
      phone: '+64 7 890 1234',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'FilFil Money Transfer',
      slug: 'filfil-money-transfer',
      categoryId: catMap['remittance-travel'],
      regionId: regMap['auckland'],
      description: 'Trusted remittance and balikbayan box services. Door-to-door delivery anywhere in the Philippines.',
      phone: '+64 9 876 5432',
      website: 'https://filfilremit.co.nz',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Dr. Maria Santos GP',
      slug: 'dr-maria-santos-gp',
      categoryId: catMap['health-wellness'],
      regionId: regMap['auckland'],
      description: 'Filipino-speaking general practitioner. Bulk-billed Community Services Card holders welcome.',
      phone: '+64 9 345 6789',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Sunshine Dental Clinic',
      slug: 'sunshine-dental-clinic',
      categoryId: catMap['health-wellness'],
      regionId: regMap['wellington'],
      description: 'Family dentistry by Dr. Reyes. Filipino-speaking staff. Accepting new patients.',
      phone: '+64 4 678 9012',
      website: 'https://sunshinedentalwellington.co.nz',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Pinoy Electrical Services',
      slug: 'pinoy-electrical-services',
      categoryId: catMap['trades-home-services'],
      regionId: regMap['auckland'],
      description: 'Licensed electrician for residential and commercial work. Fast response, honest pricing.',
      phone: '+64 21 234 5678',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Kababayan Cleaning Co',
      slug: 'kababayan-cleaning-co',
      categoryId: catMap['trades-home-services'],
      regionId: regMap['canterbury'],
      description: 'Professional home and office cleaning. Bond cleans, regular cleans, one-off deep cleans.',
      phone: '+64 22 345 6789',
      facebookUrl: 'https://facebook.com/kababayancleaning',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Ate Beth Hair and Nails',
      slug: 'ate-beth-hair-and-nails',
      categoryId: catMap['beauty-personal-care'],
      regionId: regMap['auckland'],
      description: 'Full hair and nail salon. Specialising in Filipino hair types — rebonding, highlights, gel nails.',
      phone: '+64 9 567 8901',
      facebookUrl: 'https://facebook.com/atebethsalon',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Manila Glow Massage',
      slug: 'manila-glow-massage',
      categoryId: catMap['beauty-personal-care'],
      regionId: regMap['wellington'],
      description: 'Traditional Filipino hilot massage and modern relaxation treatments. By appointment.',
      phone: '+64 4 789 0123',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Juan Cruz Accountants',
      slug: 'juan-cruz-accountants',
      categoryId: catMap['professional-services'],
      regionId: regMap['auckland'],
      description: 'Tax returns, GST, payroll, and business advisory for Filipino SMEs and migrants.',
      phone: '+64 9 678 9012',
      website: 'https://juancruzaccountants.co.nz',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Pinoy Immigration Consultants',
      slug: 'pinoy-immigration-consultants',
      categoryId: catMap['professional-services'],
      regionId: regMap['auckland'],
      description: 'Licensed immigration advisers for visas, residency, and citizenship applications.',
      phone: '+64 9 789 0123',
      website: 'https://pinoyimmigration.co.nz',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'FilipinoMart Auckland',
      slug: 'filipinomart-auckland',
      categoryId: catMap['retail-groceries'],
      regionId: regMap['auckland'],
      description: 'Widest range of Filipino groceries in NZ. Datu Puti, Lucky Me, Mang Tomas, and more.',
      phone: '+64 9 890 1234',
      facebookUrl: 'https://facebook.com/filipinomartauckland',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Pinoy Pantry Online',
      slug: 'pinoy-pantry-online',
      categoryId: catMap['retail-groceries'],
      regionId: regMap['other-nz'],
      description: 'NZ-wide online Filipino grocery delivery. Order by Sunday, receive by Thursday.',
      website: 'https://pinoypantry.co.nz',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'NZ Filipino Community Church',
      slug: 'nz-filipino-community-church',
      categoryId: catMap['community-events'],
      regionId: regMap['auckland'],
      description: 'Sunday service in Tagalog and English. Community groups, Bible study, youth ministry.',
      phone: '+64 9 012 3456',
      facebookUrl: 'https://facebook.com/nzfilipinochurch',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Canterbury Filipino Association',
      slug: 'canterbury-filipino-association',
      categoryId: catMap['community-events'],
      regionId: regMap['canterbury'],
      description: 'Cultural events, fiesta celebrations, and community support for Filipinos in Canterbury.',
      facebookUrl: 'https://facebook.com/cfachristchurch',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Waikato Pinoy Builders',
      slug: 'waikato-pinoy-builders',
      categoryId: catMap['trades-home-services'],
      regionId: regMap['waikato'],
      description: 'LBP licensed builder for new builds, renovations, and decks. Free quotes in Hamilton area.',
      phone: '+64 7 345 6789',
      isFilipino: true,
      status: 'active' as const,
    },
    {
      name: 'Mandalay Travel Wellington',
      slug: 'mandalay-travel-wellington',
      categoryId: catMap['remittance-travel'],
      regionId: regMap['wellington'],
      description: 'Philippines travel specialists. Cheap flights, package tours, and balikbayan box forwarding.',
      phone: '+64 4 890 1234',
      website: 'https://mandalaytravel.co.nz',
      isFilipino: true,
      status: 'active' as const,
    },
  ])

  console.log('Seed complete! 8 categories, 5 regions, 20 businesses.')
  process.exit(0)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})

