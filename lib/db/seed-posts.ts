import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { posts } from './schema'

const sqlite = new Database('./filipinohub.db')
sqlite.pragma('journal_mode = WAL')
const db = drizzle(sqlite)

db.insert(posts).values([
  {
    title: "Welcome to BisDak — New Zealand's Pinoy Business Hub",
    slug: 'welcome-to-bisdak',
    excerpt: "We're excited to launch BisDak, the definitive directory for Filipino-owned businesses across Aotearoa New Zealand. Here's what we're building and why.",
    content: `We're building BisDak because finding a Filipino-owned business in New Zealand shouldn't require scrolling through Facebook groups or asking around in community chats.

Whether you're looking for a tindahan in Auckland, a Filipino-run accountant in Wellington, or a catering service for your next celebration in Christchurch — BisDak is where you'll find them.

**Why BisDak?**

The Filipino community in New Zealand is one of the fastest-growing migrant communities in the country. There are over 70,000 Filipinos across New Zealand, and many run businesses that serve our community and New Zealanders alike.

**What's coming**

Over the coming months we'll be adding events listings, a job board, and a bilingual experience (English + Filipino).

**List your business for free**

If you own a Filipino business in New Zealand, claim or submit your listing today. It's free, takes 2 minutes, and puts you in front of thousands of Pinoys looking for exactly what you offer.

*Mabuhay!*
— The BisDak Team`,
    authorName: 'BisDak Team',
    status: 'published' as const,
  },
  {
    title: 'Top 5 Filipino Restaurants in Auckland You Need to Try',
    slug: 'top-5-filipino-restaurants-auckland',
    excerpt: "From authentic Ilocano and Visayan dishes to crowd-pleasing catering — Auckland's Filipino food scene is thriving. Here are our picks.",
    content: `Auckland has quietly become home to a vibrant Filipino food scene. Whether you're craving adobo, sinigang, or the comfort of a good kare-kare, there's a place for you.

**1. Aling Nena's Kitchen — Manukau**
A family-run favourite. Their lechon kawali and dinuguan are unmissable.

**2. Tita's Catering — Henderson**
Opens for dine-in Friday and Saturday evenings. Their palabok is the best in the city, full stop.

**3. Pinoy Plate — Papatoetoe**
Affordable, generous portions, rotating weekly menu.

**4. Visayan Corner — Otara Market**
A Saturday morning institution. Get there early — goods sell out by 9am.

**5. Casa Manila — CBD**
The only Filipino restaurant in the CBD proper. Great for bringing Kiwi workmates for a taste of Filipino cuisine.

---

Know a place we missed? [Submit your listing](/submit) and get on BisDak.`,
    authorName: 'BisDak Team',
    status: 'published' as const,
  },
  {
    title: 'How to Support Filipino Businesses in New Zealand',
    slug: 'how-to-support-filipino-businesses-nz',
    excerpt: 'Small actions — leaving a review, sharing a listing, choosing a Pinoy-owned business — add up to something big for our community.',
    content: `Supporting Filipino businesses isn't just about buying Filipino. It's about building an ecosystem where Pinoy entrepreneurs can thrive in New Zealand.

**1. Leave a review**
A genuine review takes two minutes and can make a real difference for a small business. If you've had a good experience, say so.

**2. Share their listing**
Share it in your Facebook groups, WhatsApp chats, or on Instagram. Word of mouth is still the most powerful marketing tool.

**3. Choose Pinoy-owned first**
Next time you need a plumber, accountant, massage, or remittance service — check BisDak first.

**4. Help them get listed**
Know a Filipino business not on BisDak yet? [Submit a listing](/submit) on their behalf.

**5. Buy local, buy Pinoy**
For groceries, bakery goods, and specialty Filipino products — buying from Filipino-owned stores keeps money in the community.

---

*Together, tayo ay malakas.* — The BisDak Team`,
    authorName: 'BisDak Team',
    status: 'published' as const,
  },
]).onConflictDoNothing().run()

console.log('✓ Seeded 3 blog posts')
process.exit(0)
