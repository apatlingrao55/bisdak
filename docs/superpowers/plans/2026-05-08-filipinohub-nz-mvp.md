# Filipino Hub NZ MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Filipino business directory MVP for New Zealand with search, reviews, owner accounts, and admin moderation.

**Architecture:** Next.js 16 App Router (server components by default), SQLite via Drizzle ORM for data, NextAuth v5 credentials provider for auth. All pages are dark-themed using CSS custom properties defined in globals.css with Tailwind v4 (CSS-first, no tailwind.config.ts needed).

**Tech Stack:** Next.js 16.2.6, TypeScript, Tailwind CSS v4 (CSS-first config), Drizzle ORM 0.45.2 + better-sqlite3, next-auth@beta (v5), @auth/drizzle-adapter

**Critical API notes:**
- Next.js 16: `params` and `searchParams` in pages/routes are **Promises** — must `await params` and `await searchParams`
- next-auth v5: exports `{ handlers, auth, signIn, signOut }` from `NextAuth()`. Middleware uses `export { auth as middleware }`. The `next-auth/middleware` module is deprecated.
- Tailwind v4: CSS-first, configured entirely in `globals.css` with `@theme {}`. No `tailwind.config.ts` needed.
- Drizzle better-sqlite3: `drizzle(client, { schema })` — import from `drizzle-orm/better-sqlite3`
- Route handler dynamic params: `{ params }: { params: Promise<{ id: string }> }` then `await params`

---

## File Map

| File | Purpose |
|------|---------|
| `lib/db/schema.ts` | All Drizzle table definitions |
| `lib/db/index.ts` | DB singleton export |
| `lib/db/seed.ts` | Seed categories, regions, 20 businesses |
| `drizzle.config.ts` | Drizzle Kit config |
| `.env.local` | Auth secret, admin token, DB URL |
| `auth.ts` | NextAuth v5 config — credentials provider |
| `middleware.ts` | Route protection for /dashboard/* |
| `app/globals.css` | CSS custom properties + Tailwind v4 @theme |
| `app/layout.tsx` | Root layout with Inter font, dark bg |
| `components/Nav.tsx` | Sticky nav with scroll transparency |
| `components/SearchBar.tsx` | Dark search input |
| `components/CategoryGrid.tsx` | 8 category cards |
| `components/BusinessCard.tsx` | Dark listing card |
| `components/StarRating.tsx` | Display-only stars |
| `app/page.tsx` | Homepage: hero + categories + featured |
| `app/search/page.tsx` | Search results with filters |
| `app/business/[slug]/page.tsx` | Business detail + reviews + review form |
| `app/submit/page.tsx` | Submit a business form |
| `app/auth/sign-in/page.tsx` | Sign in form |
| `app/auth/sign-up/page.tsx` | Sign up form |
| `app/dashboard/page.tsx` | Owner dashboard (protected) |
| `app/admin/page.tsx` | Admin moderation panel |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth route handler |
| `app/api/reviews/route.ts` | POST submit review |
| `app/api/reviews/[id]/flag/route.ts` | POST flag review |
| `app/api/reviews/[id]/respond/route.ts` | POST owner response |
| `app/api/businesses/[slug]/route.ts` | GET business with reviews |
| `app/api/submit/route.ts` | POST business submission |
| `app/api/admin/submissions/[id]/route.ts` | PATCH approve/reject submission |

---

### Task 1: Database Schema + DB Client

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`

- [ ] **Step 1: Create `lib/db/schema.ts`**

```typescript
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
})

export const categories = sqliteTable('categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon').notNull(),
})

export const regions = sqliteTable('regions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
})

export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  categoryId: integer('category_id').references(() => categories.id),
  regionId: integer('region_id').references(() => regions.id),
  description: text('description'),
  phone: text('phone'),
  website: text('website'),
  facebookUrl: text('facebook_url'),
  googleMapsUrl: text('google_maps_url'),
  ownerId: text('owner_id').references(() => users.id),
  isFilipino: integer('is_filipino', { mode: 'boolean' }).default(true),
  status: text('status', { enum: ['pending', 'active', 'rejected'] }).default('active'),
  photoUrl: text('photo_url'),
  openStatus: text('open_status', { enum: ['open', 'closed'] }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
})

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text('business_id').notNull().references(() => businesses.id),
  reviewerName: text('reviewer_name').notNull(),
  suburb: text('suburb').notNull(),
  rating: integer('rating').notNull(),
  body: text('body').notNull(),
  ownerResponse: text('owner_response'),
  isFlagged: integer('is_flagged', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
})

export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  regionId: integer('region_id').references(() => regions.id),
  description: text('description'),
  phone: text('phone'),
  website: text('website'),
  facebookUrl: text('facebook_url'),
  googleMapsUrl: text('google_maps_url'),
  submitterEmail: text('submitter_email'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
})

// NextAuth v5 required tables for DrizzleAdapter
export const accounts = sqliteTable('accounts', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
})

export const sessions = sqliteTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
})

export const verificationTokens = sqliteTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
})
```

- [ ] **Step 2: Create `lib/db/index.ts`**

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./filipinohub.db')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export type DB = typeof db
```

- [ ] **Step 3: Commit**

```bash
cd /Users/openclaw/Desktop/filipinohub-nz-app
git add lib/db/schema.ts lib/db/index.ts
git commit -m "feat: add Drizzle schema and db client"
```

---

### Task 2: Drizzle Config + Env + Push DB

**Files:**
- Create: `drizzle.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Create `drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './filipinohub.db',
  },
})
```

- [ ] **Step 2: Create `.env.local`**

```
AUTH_SECRET=filipinohub-dev-secret-change-in-prod
NEXTAUTH_URL=http://localhost:3000
ADMIN_TOKEN=admin123
DATABASE_URL=./filipinohub.db
```

- [ ] **Step 3: Push schema to DB**

```bash
cd /Users/openclaw/Desktop/filipinohub-nz-app
npx drizzle-kit push
```

Expected: Creates `filipinohub.db` with all tables.

- [ ] **Step 4: Commit**

```bash
git add drizzle.config.ts .env.local
git commit -m "feat: add drizzle config and env"
```

---

### Task 3: Seed Data

**Files:**
- Create: `lib/db/seed.ts`

- [ ] **Step 1: Create `lib/db/seed.ts`**

```typescript
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

  const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]))
  const regMap = Object.fromEntries(regs.map(r => [r.slug, r.id]))

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
      status: 'active',
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
      status: 'active',
    },
    {
      name: 'Manila Bakeshop',
      slug: 'manila-bakeshop',
      categoryId: catMap['food-dining'],
      regionId: regMap['wellington'],
      description: 'Fresh Filipino pastries daily: ensaymada, pan de sal, bibingka, and ube cheese pandesal.',
      phone: '+64 4 567 8901',
      isFilipino: true,
      status: 'active',
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
      status: 'active',
    },
    {
      name: 'Pinoy Remittance Hamilton',
      slug: 'pinoy-remittance-hamilton',
      categoryId: catMap['remittance-travel'],
      regionId: regMap['waikato'],
      description: 'Fast and affordable money transfers to the Philippines. Competitive rates, no hidden fees.',
      phone: '+64 7 890 1234',
      isFilipino: true,
      status: 'active',
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
      status: 'active',
    },
    {
      name: 'Dr. Maria Santos — GP',
      slug: 'dr-maria-santos-gp',
      categoryId: catMap['health-wellness'],
      regionId: regMap['auckland'],
      description: 'Filipino-speaking general practitioner. Bulk-billed Community Services Card holders welcome.',
      phone: '+64 9 345 6789',
      isFilipino: true,
      status: 'active',
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
      status: 'active',
    },
    {
      name: 'Pinoy Electrical Services',
      slug: 'pinoy-electrical-services',
      categoryId: catMap['trades-home-services'],
      regionId: regMap['auckland'],
      description: 'Licensed electrician for residential and commercial. Fast response, honest pricing.',
      phone: '+64 21 234 5678',
      isFilipino: true,
      status: 'active',
    },
    {
      name: 'Kababayan Cleaning Co.',
      slug: 'kababayan-cleaning-co',
      categoryId: catMap['trades-home-services'],
      regionId: regMap['canterbury'],
      description: 'Professional home and office cleaning. Bond cleans, regular cleans, one-off deep cleans.',
      phone: '+64 22 345 6789',
      facebookUrl: 'https://facebook.com/kababayancleaning',
      isFilipino: true,
      status: 'active',
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
      status: 'active',
    },
    {
      name: 'Manila Glow Massage',
      slug: 'manila-glow-massage',
      categoryId: catMap['beauty-personal-care'],
      regionId: regMap['wellington'],
      description: 'Traditional Filipino hilot massage and modern relaxation treatments. By appointment.',
      phone: '+64 4 789 0123',
      isFilipino: true,
      status: 'active',
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
      status: 'active',
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
      status: 'active',
    },
    {
      name: 'FilipinoMart Auckland',
      slug: 'filipinomart-auckland',
      categoryId: catMap['retail-groceries'],
      regionId: regMap['auckland'],
      description: 'Widest range of Filipino groceries in NZ. Datu Puti, Lucky Me, Mang Tomas, and fresh pork blood.',
      phone: '+64 9 890 1234',
      facebookUrl: 'https://facebook.com/filipinomartauckland',
      isFilipino: true,
      status: 'active',
    },
    {
      name: 'Pinoy Pantry Online',
      slug: 'pinoy-pantry-online',
      categoryId: catMap['retail-groceries'],
      regionId: regMap['other-nz'],
      description: 'NZ-wide online Filipino grocery delivery. Order by Sunday, receive by Thursday.',
      website: 'https://pinoypantry.co.nz',
      isFilipino: true,
      status: 'active',
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
      status: 'active',
    },
    {
      name: 'Canterbury Filipino Association',
      slug: 'canterbury-filipino-association',
      categoryId: catMap['community-events'],
      regionId: regMap['canterbury'],
      description: 'Cultural events, fiesta celebrations, and community support for Filipinos in Canterbury.',
      facebookUrl: 'https://facebook.com/cfachristchurch',
      isFilipino: true,
      status: 'active',
    },
    {
      name: 'Waikato Pinoy Builders',
      slug: 'waikato-pinoy-builders',
      categoryId: catMap['trades-home-services'],
      regionId: regMap['waikato'],
      description: 'LBP licensed builder for new builds, renovations, and decks. Free quotes in Hamilton area.',
      phone: '+64 7 345 6789',
      isFilipino: true,
      status: 'active',
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
      status: 'active',
    },
  ])

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the seed**

```bash
cd /Users/openclaw/Desktop/filipinohub-nz-app
npx tsx lib/db/seed.ts
```

Expected output:
```
Seeding categories...
Seeding regions...
Seeding businesses...
Seed complete!
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/seed.ts
git commit -m "feat: add seed data with 8 categories, 5 regions, 20 businesses"
```

---

### Task 4: Auth Setup

**Files:**
- Create: `auth.ts`
- Create: `middleware.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create `auth.ts`**

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/sign-in',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email as string
        const password = credentials.password as string

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token?.id) session.user.id = token.id as string
      return session
    },
  },
})
```

- [ ] **Step 2: Create `middleware.ts`**

```typescript
import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard')

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }
})

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

- [ ] **Step 3: Create `app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 4: Commit**

```bash
git add auth.ts middleware.ts app/api/auth/
git commit -m "feat: add NextAuth v5 credentials provider and dashboard middleware"
```

---

### Task 5: Global CSS + Design System

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  /* Background hierarchy */
  --color-void: #000000;
  --color-deep-teal: #02090A;
  --color-dark-forest: #061A1C;
  --color-forest: #102620;

  /* Accent */
  --color-neon: #36F4A4;
  --color-aloe: #C1FBD4;

  /* Borders */
  --color-border: #1E2C31;
  --color-shade-70: #3F3F46;
  --color-shade-60: #52525B;
  --color-shade-50: #71717A;

  /* Text */
  --color-muted: #A1A1AA;
  --color-shade-30: #D4D4D8;

  /* Border radius */
  --radius-pill: 9999px;
  --radius-card: 12px;
  --radius-card-sm: 8px;
  --radius-badge: 4px;

  /* Font families */
  --font-display: var(--font-inter), Helvetica, Arial, sans-serif;
  --font-body: var(--font-inter), Helvetica, Arial, sans-serif;
}

* {
  box-sizing: border-box;
}

html {
  font-feature-settings: 'ss03';
}

body {
  background-color: #000000;
  color: #ffffff;
  font-family: var(--font-body);
  min-height: 100vh;
}

/* Card shadow system */
.shadow-card {
  box-shadow:
    rgba(0,0,0,0.1) 0px 0px 0px 1px,
    rgba(0,0,0,0.1) 0px 2px 2px,
    rgba(0,0,0,0.1) 0px 4px 4px,
    rgba(0,0,0,0.1) 0px 8px 8px,
    rgba(255,255,255,0.03) 0px 1px 0px inset;
}

/* Button styles */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #000000;
  border: 2px solid transparent;
  border-radius: 9999px;
  padding: 12px 26px 12px 20px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
  text-decoration: none;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:focus-visible { outline: 2px solid #36F4A4; outline-offset: 2px; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 9999px;
  padding: 12px 26px 12px 20px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
  text-decoration: none;
}
.btn-ghost:hover { background: #ffffff; color: #000000; }
.btn-ghost:focus-visible { outline: 2px solid #36F4A4; outline-offset: 2px; }

/* Form inputs */
.input-dark {
  background: transparent;
  color: #ffffff;
  border: 1px solid #3F3F46;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
  width: 100%;
  transition: border-color 200ms ease;
}
.input-dark::placeholder { color: #71717A; }
.input-dark:focus {
  outline: none;
  border-color: #36F4A4;
  box-shadow: 0 0 0 2px rgba(54, 244, 164, 0.2);
}
```

- [ ] **Step 2: Replace `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Filipino Hub NZ — Find Filipino Businesses in New Zealand',
  description: 'The definitive directory of Filipino-owned businesses across New Zealand. Find your kababayan\'s business.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add dark design system CSS and root layout with Inter font"
```

---

### Task 6: Core Components

**Files:**
- Create: `components/StarRating.tsx`
- Create: `components/SearchBar.tsx`
- Create: `components/BusinessCard.tsx`
- Create: `components/CategoryGrid.tsx`
- Create: `components/Nav.tsx`

- [ ] **Step 1: Create `components/StarRating.tsx`**

```typescript
export default function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{ color: i < rating ? '#36F4A4' : '#3F3F46', fontSize: '14px' }}
        >
          ★
        </span>
      ))}
    </span>
  )
}
```

- [ ] **Step 2: Create `components/SearchBar.tsx`**

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
      <span style={{
        position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
        color: '#71717A', fontSize: '18px', pointerEvents: 'none'
      }}>🔍</span>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search Filipino businesses..."
        className="input-dark"
        style={{ paddingLeft: '48px', paddingRight: '120px', height: '56px', fontSize: '18px' }}
      />
      <button
        type="submit"
        className="btn-primary"
        style={{ position: 'absolute', right: '6px', top: '6px', height: '44px', padding: '0 20px', fontSize: '15px' }}
      >
        Search
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create `components/BusinessCard.tsx`**

```typescript
import Link from 'next/link'
import StarRating from './StarRating'

type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  isFilipino: boolean | null
  categoryName?: string
  regionName?: string
  avgRating?: number
  reviewCount?: number
  openStatus?: string | null
}

export default function BusinessCard({ business }: { business: Business }) {
  return (
    <Link
      href={`/business/${business.slug}`}
      style={{
        display: 'block',
        background: '#02090A',
        border: '1px solid #1E2C31',
        borderRadius: '12px',
        padding: '24px',
        textDecoration: 'none',
        transition: 'transform 200ms ease, box-shadow 300ms ease',
      }}
      className="shadow-card hover:scale-[1.01]"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
          {business.name}
        </h3>
        {business.isFilipino && (
          <span style={{
            background: 'rgba(54,244,164,0.15)',
            color: '#36F4A4',
            border: '1px solid rgba(54,244,164,0.3)',
            borderRadius: '9999px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            marginLeft: '8px',
            flexShrink: 0,
          }}>
            🇵🇭 Filipino-owned
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {business.categoryName && (
          <span style={{
            background: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '13px',
          }}>
            {business.categoryName}
          </span>
        )}
        {business.regionName && (
          <span style={{ color: '#A1A1AA', fontSize: '13px', padding: '4px 0' }}>
            📍 {business.regionName}
          </span>
        )}
      </div>

      {business.description && (
        <p style={{ color: '#A1A1AA', fontSize: '15px', lineHeight: 1.5, margin: '0 0 12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {business.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {business.avgRating != null && business.avgRating > 0 ? (
            <>
              <StarRating rating={Math.round(business.avgRating)} />
              <span style={{ color: '#71717A', fontSize: '13px' }}>
                ({business.reviewCount ?? 0})
              </span>
            </>
          ) : (
            <span style={{ color: '#52525B', fontSize: '13px' }}>No reviews yet</span>
          )}
        </div>
        {business.openStatus && (
          <span style={{
            color: business.openStatus === 'open' ? '#36F4A4' : '#71717A',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {business.openStatus === 'open' ? '● Open' : '● Closed'}
          </span>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Create `components/CategoryGrid.tsx`**

```typescript
import Link from 'next/link'

type Category = { id: number; name: string; slug: string; icon: string }

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: '16px',
    }}>
      {categories.map(cat => (
        <Link
          key={cat.id}
          href={`/search?category=${cat.slug}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            background: '#061A1C',
            border: '1px solid #1E2C31',
            borderRadius: '9999px',
            padding: '20px 16px',
            textDecoration: 'none',
            transition: 'background 200ms ease, border-color 200ms ease',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            textAlign: 'center',
          }}
          className="hover:border-[#36F4A4] hover:bg-[#102620]"
        >
          <span style={{ fontSize: '28px' }}>{cat.icon}</span>
          <span>{cat.name}</span>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create `components/Nav.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: scrolled ? '#102620' : 'transparent',
      transition: 'background 300ms ease',
      borderBottom: scrolled ? '1px solid #1E2C31' : '1px solid transparent',
    }}>
      <Link href="/" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>
        🇵🇭 Filipino Hub NZ
      </Link>

      {/* Desktop nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="hidden md:flex">
        <Link href="/search" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '16px', letterSpacing: '0.5px', opacity: 0.8 }}>
          Browse
        </Link>
        <Link href="/submit" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '16px', letterSpacing: '0.5px', opacity: 0.8 }}>
          Submit a Business
        </Link>
        <Link href="/auth/sign-in" className="btn-ghost" style={{ padding: '8px 20px', fontSize: '15px' }}>
          Sign In
        </Link>
        <Link href="/dashboard" className="btn-primary" style={{ padding: '8px 20px', fontSize: '15px' }}>
          Dashboard
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex md:hidden"
        style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer' }}
        aria-label="Toggle menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0,
          background: '#02090A', padding: '32px',
          display: 'flex', flexDirection: 'column', gap: '24px',
        }} className="md:hidden">
          <Link href="/search" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px' }}>Browse</Link>
          <Link href="/submit" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px' }}>Submit a Business</Link>
          <Link href="/auth/sign-in" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px' }}>Sign In</Link>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px' }}>Dashboard</Link>
        </div>
      )}
    </nav>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add components/
git commit -m "feat: add Nav, SearchBar, BusinessCard, CategoryGrid, StarRating components"
```

---

### Task 7: Homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```typescript
import Nav from '@/components/Nav'
import SearchBar from '@/components/SearchBar'
import CategoryGrid from '@/components/CategoryGrid'
import BusinessCard from '@/components/BusinessCard'
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq, desc, sql, avg, count } from 'drizzle-orm'

export default async function HomePage() {
  const allCategories = await db.select().from(categories)

  const featured = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      isFilipino: businesses.isFilipino,
      openStatus: businesses.openStatus,
      categoryName: categories.name,
      regionName: regions.name,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
      reviewCount: sql<number>`COUNT(${reviews.id})`,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .leftJoin(reviews, eq(reviews.businessId, businesses.id))
    .where(eq(businesses.status, 'active'))
    .groupBy(businesses.id)
    .orderBy(desc(businesses.createdAt))
    .limit(6)

  return (
    <main>
      <Nav />

      {/* Hero */}
      <section style={{
        background: '#000000',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: 330,
          lineHeight: 1.0,
          color: '#ffffff',
          margin: '0 0 24px',
          maxWidth: '800px',
          letterSpacing: '-0.5px',
        }}>
          Find your<br />kababayan&apos;s business.
        </h1>
        <p style={{
          color: '#A1A1AA',
          fontSize: '20px',
          fontWeight: 400,
          margin: '0 0 48px',
          maxWidth: '500px',
          lineHeight: 1.5,
        }}>
          The definitive Filipino business directory for New Zealand. Discover, review, and support your community.
        </p>
        <SearchBar />

        <div style={{ display: 'flex', gap: '16px', marginTop: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ color: '#71717A', fontSize: '14px' }}>Popular:</span>
          {['Food & Dining', 'Remittance & Travel', 'Health & Wellness'].map(tag => (
            <a
              key={tag}
              href={`/search?category=${tag.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
              style={{ color: '#A1A1AA', fontSize: '14px', textDecoration: 'underline', textDecorationColor: '#3F3F46' }}
            >
              {tag}
            </a>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section style={{
        background: '#061A1C',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{ color: '#ffffff', fontSize: '40px', fontWeight: 330, margin: '0 0 16px', textAlign: 'center' }}>
            Browse by Category
          </h2>
          <p style={{ color: '#A1A1AA', textAlign: 'center', margin: '0 0 48px', fontSize: '18px' }}>
            8 categories covering every Filipino business in NZ
          </p>
          <CategoryGrid categories={allCategories} />
        </div>
      </section>

      {/* Featured Listings */}
      <section style={{ background: '#000000', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{ color: '#ffffff', fontSize: '40px', fontWeight: 330, margin: '0 0 16px' }}>
            Recently Added
          </h2>
          <p style={{ color: '#A1A1AA', margin: '0 0 48px', fontSize: '18px' }}>
            The latest Filipino businesses listed on Filipino Hub NZ
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}>
            {featured.map(b => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <a href="/search" className="btn-ghost">View all listings</a>
          </div>
        </div>
      </section>

      {/* Tagline footer strip */}
      <section style={{
        background: '#102620',
        padding: '48px 24px',
        textAlign: 'center',
        borderTop: '1px solid #1E2C31',
      }}>
        <p style={{ color: '#A1A1AA', fontSize: '16px', margin: '0 0 16px' }}>
          Is your business missing?
        </p>
        <a href="/submit" className="btn-primary">Submit a Business — It&apos;s Free</a>
      </section>

      <footer style={{ background: '#000000', padding: '32px 24px', textAlign: 'center', borderTop: '1px solid #1E2C31' }}>
        <p style={{ color: '#52525B', fontSize: '14px', margin: 0 }}>
          © 2026 Filipino Hub NZ · <a href="/submit" style={{ color: '#71717A' }}>Submit a Business</a> · <a href="/admin" style={{ color: '#71717A' }}>Admin</a>
        </p>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: build homepage with hero, category grid, and featured listings"
```

---

### Task 8: Search Page

**Files:**
- Create: `app/search/page.tsx`

- [ ] **Step 1: Create `app/search/page.tsx`**

```typescript
import Nav from '@/components/Nav'
import BusinessCard from '@/components/BusinessCard'
import SearchBar from '@/components/SearchBar'
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq, like, and, desc, asc, sql, or } from 'drizzle-orm'

type SearchParams = Promise<{
  q?: string
  category?: string
  region?: string
  sort?: string
}>

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const q = params.q ?? ''
  const category = params.category ?? ''
  const region = params.region ?? ''
  const sort = params.sort ?? 'newest'

  const allCategories = await db.select().from(categories)
  const allRegions = await db.select().from(regions)

  // Build where conditions
  const conditions = [eq(businesses.status, 'active')]

  if (q) {
    conditions.push(
      or(
        like(businesses.name, `%${q}%`),
        like(businesses.description, `%${q}%`)
      )!
    )
  }

  if (category) {
    const cat = allCategories.find(c => c.slug === category)
    if (cat) conditions.push(eq(businesses.categoryId, cat.id))
  }

  if (region) {
    const reg = allRegions.find(r => r.slug === region)
    if (reg) conditions.push(eq(businesses.regionId, reg.id))
  }

  const orderBy = sort === 'alpha'
    ? asc(businesses.name)
    : desc(businesses.createdAt)

  const results = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      isFilipino: businesses.isFilipino,
      openStatus: businesses.openStatus,
      categoryName: categories.name,
      regionName: regions.name,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
      reviewCount: sql<number>`COUNT(${reviews.id})`,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .leftJoin(reviews, eq(reviews.businessId, businesses.id))
    .where(and(...conditions))
    .groupBy(businesses.id)
    .orderBy(orderBy)

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#000000' }}>
        {/* Search header */}
        <section style={{ background: '#061A1C', padding: '40px 24px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <SearchBar defaultValue={q} />
          </div>
        </section>

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          {/* Sidebar filters */}
          <aside style={{ width: '240px', flexShrink: 0 }} className="hidden md:block">
            <form method="GET" action="/search">
              {q && <input type="hidden" name="q" value={q} />}

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Category
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A1A1AA', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="radio" name="category" value="" defaultChecked={!category} style={{ accentColor: '#36F4A4' }} />
                    All categories
                  </label>
                  {allCategories.map(cat => (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A1A1AA', fontSize: '14px', cursor: 'pointer' }}>
                      <input type="radio" name="category" value={cat.slug} defaultChecked={category === cat.slug} style={{ accentColor: '#36F4A4' }} />
                      {cat.icon} {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Region
                </h3>
                <select
                  name="region"
                  defaultValue={region}
                  className="input-dark"
                  style={{ fontSize: '14px' }}
                >
                  <option value="">All regions</option>
                  {allRegions.map(r => (
                    <option key={r.id} value={r.slug}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Sort by
                </h3>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="input-dark"
                  style={{ fontSize: '14px' }}
                >
                  <option value="newest">Newest first</option>
                  <option value="alpha">A–Z</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Apply Filters
              </button>
            </form>
          </aside>

          {/* Results */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <p style={{ color: '#A1A1AA', fontSize: '16px', margin: 0 }}>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{results.length}</span> business{results.length !== 1 ? 'es' : ''} found
                {q && <span> for &ldquo;<span style={{ color: '#36F4A4' }}>{q}</span>&rdquo;</span>}
              </p>
            </div>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', color: '#52525B' }}>
                <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🔍</p>
                <p style={{ fontSize: '18px', color: '#A1A1AA' }}>No businesses found.</p>
                <p style={{ fontSize: '15px' }}>Try a different search or <a href="/submit" style={{ color: '#36F4A4' }}>submit a listing</a>.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {results.map(b => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/search/
git commit -m "feat: add search results page with category/region/sort filters"
```

---

### Task 9: Business Detail Page

**Files:**
- Create: `app/business/[slug]/page.tsx`

- [ ] **Step 1: Create `app/business/[slug]/page.tsx`**

```typescript
import Nav from '@/components/Nav'
import StarRating from '@/components/StarRating'
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq, avg, count, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'

type Params = Promise<{ slug: string }>

export default async function BusinessPage({ params }: { params: Params }) {
  const { slug } = await params

  const [biz] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      phone: businesses.phone,
      website: businesses.website,
      facebookUrl: businesses.facebookUrl,
      googleMapsUrl: businesses.googleMapsUrl,
      isFilipino: businesses.isFilipino,
      photoUrl: businesses.photoUrl,
      openStatus: businesses.openStatus,
      categoryName: categories.name,
      regionName: regions.name,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .where(eq(businesses.slug, slug))
    .limit(1)

  if (!biz) notFound()

  const bizReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.businessId, biz.id))
    .orderBy(reviews.createdAt)

  const avgRating = bizReviews.length > 0
    ? bizReviews.reduce((sum, r) => sum + r.rating, 0) / bizReviews.length
    : 0

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#000000' }}>
        {/* Hero */}
        <section style={{ background: '#061A1C', padding: '48px 24px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {biz.categoryName && (
                    <span style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '9999px', padding: '4px 12px', fontSize: '13px' }}>
                      {biz.categoryName}
                    </span>
                  )}
                  {biz.regionName && (
                    <span style={{ color: '#A1A1AA', fontSize: '13px', padding: '4px 0' }}>📍 {biz.regionName}</span>
                  )}
                  {biz.isFilipino && (
                    <span style={{ background: 'rgba(54,244,164,0.15)', color: '#36F4A4', border: '1px solid rgba(54,244,164,0.3)', borderRadius: '9999px', padding: '4px 12px', fontSize: '13px', fontWeight: 600 }}>
                      🇵🇭 Filipino-owned
                    </span>
                  )}
                </div>
                <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 330, margin: '0 0 16px', lineHeight: 1.1 }}>
                  {biz.name}
                </h1>
                {biz.description && (
                  <p style={{ color: '#A1A1AA', fontSize: '18px', lineHeight: 1.6, margin: 0, maxWidth: '600px' }}>
                    {biz.description}
                  </p>
                )}
              </div>
              {biz.openStatus && (
                <span style={{ color: biz.openStatus === 'open' ? '#36F4A4' : '#71717A', fontWeight: 600, fontSize: '16px' }}>
                  ● {biz.openStatus === 'open' ? 'Open now' : 'Closed'}
                </span>
              )}
            </div>

            {/* Contact links */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexWrap: 'wrap' }}>
              {biz.phone && (
                <a href={`tel:${biz.phone}`} className="btn-primary" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  📞 {biz.phone}
                </a>
              )}
              {biz.website && (
                <a href={biz.website} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  🌐 Website
                </a>
              )}
              {biz.facebookUrl && (
                <a href={biz.facebookUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  📘 Facebook
                </a>
              )}
              {biz.googleMapsUrl && (
                <a href={biz.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  📍 Google Maps
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: 0 }}>Reviews</h2>
            {bizReviews.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StarRating rating={Math.round(avgRating)} />
                <span style={{ color: '#A1A1AA', fontSize: '16px' }}>
                  {avgRating.toFixed(1)} ({bizReviews.length} review{bizReviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          {/* Write a review form */}
          <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '24px', marginBottom: '40px' }}>
            <h3 style={{ color: '#ffffff', fontSize: '18px', margin: '0 0 20px' }}>Write a Review</h3>
            <form action="/api/reviews" method="POST" id="review-form">
              <input type="hidden" name="businessId" value={biz.id} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Your Name *</label>
                  <input type="text" name="reviewerName" required maxLength={100} placeholder="Maria Santos" className="input-dark" />
                </div>
                <div>
                  <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Your Suburb *</label>
                  <input type="text" name="suburb" required maxLength={100} placeholder="Manukau" className="input-dark" />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Rating *</label>
                <select name="rating" required className="input-dark">
                  <option value="">Select rating</option>
                  <option value="5">★★★★★ Excellent</option>
                  <option value="4">★★★★ Good</option>
                  <option value="3">★★★ Average</option>
                  <option value="2">★★ Poor</option>
                  <option value="1">★ Terrible</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Review (max 300 chars) *</label>
                <textarea
                  name="body"
                  required
                  maxLength={300}
                  rows={3}
                  placeholder="Share your experience..."
                  className="input-dark"
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <button type="submit" className="btn-primary">Submit Review</button>
            </form>
          </div>

          {/* Review list */}
          {bizReviews.length === 0 ? (
            <p style={{ color: '#52525B', textAlign: 'center', padding: '40px 0' }}>No reviews yet. Be the first!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {bizReviews.map(review => (
                <div
                  key={review.id}
                  style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px' }}
                  className="shadow-card"
                >
                  {review.isFlagged && (
                    <p style={{ color: '#71717A', fontSize: '13px', margin: '0 0 8px' }}>⚠️ This review has been flagged for moderation.</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{review.reviewerName}</span>
                      <span style={{ color: '#71717A', fontSize: '14px', marginLeft: '8px' }}>{review.suburb}</span>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  <p style={{ color: '#A1A1AA', fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
                    {review.body}
                  </p>
                  {review.ownerResponse && (
                    <div style={{ background: '#061A1C', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
                      <p style={{ color: '#71717A', fontSize: '12px', margin: '0 0 4px', fontWeight: 600 }}>OWNER RESPONSE</p>
                      <p style={{ color: '#A1A1AA', fontSize: '14px', margin: 0 }}>{review.ownerResponse}</p>
                    </div>
                  )}
                  <form action={`/api/reviews/${review.id}/flag`} method="POST" style={{ display: 'inline' }}>
                    <button type="submit" style={{ background: 'none', border: 'none', color: '#52525B', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                      🚩 Flag review
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/business/
git commit -m "feat: add business detail page with reviews and review form"
```

---

### Task 10: Submit + Auth Pages

**Files:**
- Create: `app/submit/page.tsx`
- Create: `app/auth/sign-in/page.tsx`
- Create: `app/auth/sign-up/page.tsx`

- [ ] **Step 1: Create `app/submit/page.tsx`**

```typescript
import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { categories, regions } from '@/lib/db/schema'

export default async function SubmitPage() {
  const allCategories = await db.select().from(categories)
  const allRegions = await db.select().from(regions)

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#000000' }}>
        <section style={{ maxWidth: '640px', margin: '0 auto', padding: '60px 24px' }}>
          <h1 style={{ color: '#ffffff', fontSize: '40px', fontWeight: 330, margin: '0 0 12px' }}>
            Submit a Business
          </h1>
          <p style={{ color: '#A1A1AA', fontSize: '18px', margin: '0 0 40px' }}>
            Know a Filipino business that should be listed? Submit it below — it&apos;s free. We&apos;ll review it within 24–48 hours.
          </p>

          <form action="/api/submit" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Business Name *</label>
              <input type="text" name="name" required maxLength={200} placeholder="e.g. Aling Rosa Catering" className="input-dark" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Category *</label>
                <select name="categoryId" required className="input-dark">
                  <option value="">Select category</option>
                  {allCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Region *</label>
                <select name="regionId" required className="input-dark">
                  <option value="">Select region</option>
                  {allRegions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Phone</label>
              <input type="tel" name="phone" placeholder="+64 9 123 4567" className="input-dark" />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Website</label>
              <input type="url" name="website" placeholder="https://example.co.nz" className="input-dark" />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Description (max 200 chars) *
              </label>
              <textarea
                name="description"
                required
                maxLength={200}
                rows={3}
                placeholder="Brief description of what this business does..."
                className="input-dark"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Your Email (optional — to receive updates)</label>
              <input type="email" name="submitterEmail" placeholder="you@example.com" className="input-dark" />
            </div>

            <button type="submit" className="btn-primary" style={{ fontSize: '16px', height: '52px' }}>
              Submit for Review
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create `app/auth/sign-in/page.tsx`**

```typescript
import Nav from '@/components/Nav'
import { signIn } from '@/auth'

export default function SignInPage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
          <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '40px' }} className="shadow-card">
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: '0 0 8px' }}>Sign In</h1>
            <p style={{ color: '#A1A1AA', fontSize: '15px', margin: '0 0 32px' }}>
              Access your business dashboard.
            </p>

            <form
              action={async (formData: FormData) => {
                'use server'
                await signIn('credentials', {
                  email: formData.get('email'),
                  password: formData.get('password'),
                  redirectTo: '/dashboard',
                })
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" className="input-dark" />
              </div>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Password</label>
                <input type="password" name="password" required autoComplete="current-password" placeholder="••••••••" className="input-dark" />
              </div>
              <button type="submit" className="btn-primary" style={{ height: '48px', marginTop: '8px' }}>
                Sign In
              </button>
            </form>

            <p style={{ color: '#71717A', fontSize: '14px', textAlign: 'center', margin: '24px 0 0' }}>
              Don&apos;t have an account?{' '}
              <a href="/auth/sign-up" style={{ color: '#36F4A4' }}>Sign up</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create `app/auth/sign-up/page.tsx`**

```typescript
import Nav from '@/components/Nav'

export default function SignUpPage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
          <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '40px' }} className="shadow-card">
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: '0 0 8px' }}>Create Account</h1>
            <p style={{ color: '#A1A1AA', fontSize: '15px', margin: '0 0 32px' }}>
              List your Filipino business for free.
            </p>

            <form action="/api/auth/register" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Full Name</label>
                <input type="text" name="name" required placeholder="Maria Santos" className="input-dark" />
              </div>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" className="input-dark" />
              </div>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Password</label>
                <input type="password" name="password" required minLength={8} autoComplete="new-password" placeholder="Minimum 8 characters" className="input-dark" />
              </div>
              <button type="submit" className="btn-primary" style={{ height: '48px', marginTop: '8px' }}>
                Create Account
              </button>
            </form>

            <p style={{ color: '#71717A', fontSize: '14px', textAlign: 'center', margin: '24px 0 0' }}>
              Already have an account?{' '}
              <a href="/auth/sign-in" style={{ color: '#36F4A4' }}>Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/submit/ app/auth/
git commit -m "feat: add submit business page and auth sign-in/sign-up pages"
```

---

### Task 11: Dashboard + Admin Pages

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create `app/dashboard/page.tsx`**

```typescript
import Nav from '@/components/Nav'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { businesses, reviews, categories, regions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/sign-in')

  const userId = session.user.id

  const myBusinesses = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      status: businesses.status,
      categoryName: categories.name,
      regionName: regions.name,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .where(eq(businesses.ownerId, userId))

  // Get reviews for owned businesses
  const bizIds = myBusinesses.map(b => b.id)
  const myReviews = bizIds.length > 0
    ? await db
        .select()
        .from(reviews)
        .where(eq(reviews.businessId, bizIds[0])) // simplified — for MVP
    : []

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#000000' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 24px' }}>
          <h1 style={{ color: '#ffffff', fontSize: '40px', fontWeight: 330, margin: '0 0 8px' }}>
            Dashboard
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 48px' }}>
            Welcome back, {session.user.name ?? session.user.email}
          </p>

          <section style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: 0 }}>Your Listings</h2>
              <a href="/submit" className="btn-primary" style={{ padding: '8px 20px', fontSize: '15px' }}>
                + Add Listing
              </a>
            </div>

            {myBusinesses.length === 0 ? (
              <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#A1A1AA', margin: '0 0 16px' }}>You haven&apos;t claimed or added any listings yet.</p>
                <a href="/submit" className="btn-primary">Submit a Business</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myBusinesses.map(b => (
                  <div
                    key={b.id}
                    style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
                    className="shadow-card"
                  >
                    <div>
                      <h3 style={{ color: '#ffffff', margin: '0 0 4px', fontSize: '18px' }}>{b.name}</h3>
                      <p style={{ color: '#71717A', margin: 0, fontSize: '14px' }}>
                        {b.categoryName} · {b.regionName} ·{' '}
                        <span style={{ color: b.status === 'active' ? '#36F4A4' : '#71717A' }}>
                          {b.status}
                        </span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={`/business/${b.slug}`} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '14px' }}>View</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {myReviews.length > 0 && (
            <section>
              <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: '0 0 24px' }}>Recent Reviews</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myReviews.slice(0, 10).map(r => (
                  <div key={r.id} style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{r.reviewerName} <span style={{ color: '#71717A', fontWeight: 400 }}>from {r.suburb}</span></span>
                      <span style={{ color: '#36F4A4' }}>{'★'.repeat(r.rating)}</span>
                    </div>
                    <p style={{ color: '#A1A1AA', margin: '0 0 12px', fontSize: '15px' }}>{r.body}</p>
                    {!r.ownerResponse && (
                      <form action={`/api/reviews/${r.id}/respond`} method="POST" style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          name="response"
                          placeholder="Write a response..."
                          className="input-dark"
                          style={{ flex: 1, fontSize: '14px' }}
                        />
                        <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                          Respond
                        </button>
                      </form>
                    )}
                    {r.ownerResponse && (
                      <p style={{ color: '#71717A', fontSize: '14px', fontStyle: 'italic' }}>
                        Your response: &ldquo;{r.ownerResponse}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create `app/admin/page.tsx`**

```typescript
import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { submissions, reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token

  if (token !== process.env.ADMIN_TOKEN) {
    redirect(`/admin?token=${process.env.ADMIN_TOKEN ?? 'not-set'}`)
  }

  const pendingSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, 'pending'))
    .orderBy(submissions.createdAt)

  const flaggedReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.isFlagged, true))
    .orderBy(reviews.createdAt)

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#000000' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 24px' }}>
          <h1 style={{ color: '#ffffff', fontSize: '40px', fontWeight: 330, margin: '0 0 8px' }}>Admin Panel</h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 48px' }}>Moderation queue</p>

          <section style={{ marginBottom: '56px' }}>
            <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: '0 0 24px' }}>
              Pending Submissions ({pendingSubmissions.length})
            </h2>
            {pendingSubmissions.length === 0 ? (
              <p style={{ color: '#52525B' }}>No pending submissions.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingSubmissions.map(sub => (
                  <div key={sub.id} style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px' }} className="shadow-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3 style={{ color: '#ffffff', margin: '0 0 4px' }}>{sub.name}</h3>
                        <p style={{ color: '#71717A', margin: '0 0 8px', fontSize: '14px' }}>
                          {sub.phone} · {sub.website} · {sub.submitterEmail}
                        </p>
                        {sub.description && (
                          <p style={{ color: '#A1A1AA', margin: 0, fontSize: '15px' }}>{sub.description}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <form action={`/api/admin/submissions/${sub.id}`} method="POST">
                          <input type="hidden" name="_method" value="PATCH" />
                          <input type="hidden" name="status" value="approved" />
                          <input type="hidden" name="token" value={token} />
                          <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>Approve</button>
                        </form>
                        <form action={`/api/admin/submissions/${sub.id}`} method="POST">
                          <input type="hidden" name="_method" value="PATCH" />
                          <input type="hidden" name="status" value="rejected" />
                          <input type="hidden" name="token" value={token} />
                          <button type="submit" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '14px', borderColor: '#3F3F46', color: '#A1A1AA' }}>Reject</button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: '0 0 24px' }}>
              Flagged Reviews ({flaggedReviews.length})
            </h2>
            {flaggedReviews.length === 0 ? (
              <p style={{ color: '#52525B' }}>No flagged reviews.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {flaggedReviews.map(r => (
                  <div key={r.id} style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px' }}>
                    <p style={{ color: '#A1A1AA', margin: '0 0 8px' }}>
                      <strong style={{ color: '#ffffff' }}>{r.reviewerName}</strong> ({r.suburb}) — {'★'.repeat(r.rating)}
                    </p>
                    <p style={{ color: '#A1A1AA', margin: 0, fontSize: '15px' }}>{r.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/ app/admin/
git commit -m "feat: add owner dashboard and admin moderation panel"
```

---

### Task 12: API Routes

**Files:**
- Create: `app/api/reviews/route.ts`
- Create: `app/api/reviews/[id]/flag/route.ts`
- Create: `app/api/reviews/[id]/respond/route.ts`
- Create: `app/api/businesses/[slug]/route.ts`
- Create: `app/api/submit/route.ts`
- Create: `app/api/admin/submissions/[id]/route.ts`
- Create: `app/api/auth/register/route.ts`

- [ ] **Step 1: Create `app/api/reviews/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { reviews } from '@/lib/db/schema'
import { redirect } from 'next/navigation'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const businessId = formData.get('businessId') as string
  const reviewerName = formData.get('reviewerName') as string
  const suburb = formData.get('suburb') as string
  const rating = parseInt(formData.get('rating') as string)
  const body = formData.get('body') as string

  if (!businessId || !reviewerName || !suburb || !rating || !body) {
    return new Response('Missing required fields', { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return new Response('Rating must be 1-5', { status: 400 })
  }
  if (body.length > 300) {
    return new Response('Review too long', { status: 400 })
  }

  await db.insert(reviews).values({
    businessId,
    reviewerName: reviewerName.slice(0, 100),
    suburb: suburb.slice(0, 100),
    rating,
    body: body.slice(0, 300),
  })

  // Find slug for redirect
  const { businesses } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const [biz] = await db.select({ slug: businesses.slug }).from(businesses).where(eq(businesses.id, businessId)).limit(1)

  return Response.redirect(new URL(`/business/${biz?.slug ?? ''}`, request.url))
}
```

- [ ] **Step 2: Create `app/api/reviews/[id]/flag/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.update(reviews).set({ isFlagged: true }).where(eq(reviews.id, id))
  return Response.redirect(request.headers.get('referer') ?? '/', 302)
}
```

- [ ] **Step 3: Create `app/api/reviews/[id]/respond/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params
  const formData = await request.formData()
  const response = formData.get('response') as string

  if (!response?.trim()) {
    return new Response('Response is required', { status: 400 })
  }

  await db
    .update(reviews)
    .set({ ownerResponse: response.slice(0, 500) })
    .where(eq(reviews.id, id))

  return Response.redirect(request.headers.get('referer') ?? '/dashboard', 302)
}
```

- [ ] **Step 4: Create `app/api/businesses/[slug]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const [biz] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      phone: businesses.phone,
      website: businesses.website,
      facebookUrl: businesses.facebookUrl,
      googleMapsUrl: businesses.googleMapsUrl,
      isFilipino: businesses.isFilipino,
      photoUrl: businesses.photoUrl,
      openStatus: businesses.openStatus,
      status: businesses.status,
      categoryName: categories.name,
      regionName: regions.name,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .where(eq(businesses.slug, slug))
    .limit(1)

  if (!biz) return Response.json({ error: 'Not found' }, { status: 404 })

  const bizReviews = await db.select().from(reviews).where(eq(reviews.businessId, biz.id))

  return Response.json({ ...biz, reviews: bizReviews })
}
```

- [ ] **Step 5: Create `app/api/submit/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now()
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const name = formData.get('name') as string
  const categoryId = formData.get('categoryId') ? parseInt(formData.get('categoryId') as string) : null
  const regionId = formData.get('regionId') ? parseInt(formData.get('regionId') as string) : null
  const phone = formData.get('phone') as string | null
  const website = formData.get('website') as string | null
  const description = formData.get('description') as string | null
  const submitterEmail = formData.get('submitterEmail') as string | null

  if (!name?.trim()) {
    return new Response('Business name is required', { status: 400 })
  }

  await db.insert(submissions).values({
    name: name.trim().slice(0, 200),
    slug: slugify(name.trim()),
    categoryId,
    regionId,
    phone: phone?.trim() || null,
    website: website?.trim() || null,
    description: description?.trim().slice(0, 200) || null,
    submitterEmail: submitterEmail?.trim() || null,
    status: 'pending',
  })

  return Response.redirect(new URL('/submit?success=1', request.url))
}
```

- [ ] **Step 6: Create `app/api/admin/submissions/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { submissions, businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const formData = body ? null : await request.formData().catch(() => null)

  const token = body?.token ?? formData?.get('token')
  const status = body?.status ?? formData?.get('status')

  if (token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['approved', 'rejected'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  const [sub] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1)
  if (!sub) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.update(submissions).set({ status }).where(eq(submissions.id, id))

  if (status === 'approved') {
    await db.insert(businesses).values({
      name: sub.name,
      slug: slugify(sub.name) + '-' + Date.now(),
      categoryId: sub.categoryId,
      regionId: sub.regionId,
      description: sub.description,
      phone: sub.phone,
      website: sub.website,
      facebookUrl: sub.facebookUrl,
      googleMapsUrl: sub.googleMapsUrl,
      isFilipino: true,
      status: 'active',
    })
  }

  return Response.json({ success: true })
}

// Support form POST from admin page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const formData = await request.formData()
  const token = formData.get('token') as string
  const status = formData.get('status') as string

  if (token !== process.env.ADMIN_TOKEN) {
    return Response.redirect(new URL('/admin?error=unauthorized', request.url))
  }

  const [sub] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1)
  if (!sub) return Response.redirect(new URL('/admin?error=not-found', request.url))

  await db.update(submissions).set({ status: status as 'approved' | 'rejected' }).where(eq(submissions.id, id))

  if (status === 'approved') {
    await db.insert(businesses).values({
      name: sub.name,
      slug: slugify(sub.name) + '-' + Date.now(),
      categoryId: sub.categoryId,
      regionId: sub.regionId,
      description: sub.description,
      phone: sub.phone,
      website: sub.website,
      facebookUrl: sub.facebookUrl,
      googleMapsUrl: sub.googleMapsUrl,
      isFilipino: true,
      status: 'active',
    })
  }

  return Response.redirect(new URL(`/admin?token=${token}`, request.url))
}
```

- [ ] **Step 7: Create `app/api/auth/register/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email?.trim() || !password?.trim() || !name?.trim()) {
    return Response.redirect(new URL('/auth/sign-up?error=missing', request.url))
  }

  if (password.length < 8) {
    return Response.redirect(new URL('/auth/sign-up?error=password', request.url))
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    return Response.redirect(new URL('/auth/sign-up?error=exists', request.url))
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.insert(users).values({
    email: email.trim(),
    name: name.trim(),
    passwordHash,
  })

  return Response.redirect(new URL('/auth/sign-in?registered=1', request.url))
}
```

- [ ] **Step 8: Commit**

```bash
git add app/api/
git commit -m "feat: add all API routes — reviews, submissions, admin, auth register"
```

---

### Task 13: Build + Fix TypeScript Errors

- [ ] **Step 1: Run the build**

```bash
cd /Users/openclaw/Desktop/filipinohub-nz-app
npm run build 2>&1
```

- [ ] **Step 2: Fix common issues**

Expected issues and fixes:

**Issue: `bcryptjs` has no default export types**
Fix — change import in `auth.ts`:
```typescript
import bcrypt from 'bcryptjs'
// If TS error, add to tsconfig or use:
const bcrypt = require('bcryptjs')
```
Or add `"types": ["bcryptjs"]` to tsconfig. Simplest fix: add `"@types/bcryptjs": "^2.4.6"` to devDependencies if missing.

Check if types exist:
```bash
ls /Users/openclaw/Desktop/filipinohub-nz-app/node_modules/@types/bcryptjs 2>/dev/null || echo "no types"
```
If missing:
```bash
cd /Users/openclaw/Desktop/filipinohub-nz-app && npm install --save-dev @types/bcryptjs
```

**Issue: `or()` returning `undefined` in Drizzle query**
The `or()` from drizzle-orm can return `undefined` when called with undefined args. The `!` non-null assertion is already in the plan. If TS still complains, wrap:
```typescript
const searchCondition = or(
  like(businesses.name, `%${q}%`),
  like(businesses.description, `%${q}%`)
)
if (searchCondition) conditions.push(searchCondition)
```

**Issue: `and(...conditions)` spread type**
If `and()` doesn't accept spread of mixed types, use:
```typescript
import type { SQL } from 'drizzle-orm'
const conditions: SQL[] = [eq(businesses.status, 'active')]
```

**Issue: `session.user.id` not on Session type**
This requires augmenting the Session type. Add `types/next-auth.d.ts`:
```typescript
// types/next-auth.d.ts
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}
```

**Issue: Sign-in page with server action in async form**
The server action in `app/auth/sign-in/page.tsx` needs to be in a separate server action file in Next.js 16. Move to `app/auth/sign-in/actions.ts`:
```typescript
'use server'
import { signIn } from '@/auth'

export async function signInAction(formData: FormData) {
  await signIn('credentials', {
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: '/dashboard',
  })
}
```
Then in `sign-in/page.tsx`, import and use `signInAction` as the form action.

- [ ] **Step 3: Re-run build after fixes**

```bash
cd /Users/openclaw/Desktop/filipinohub-nz-app && npm run build
```

Expected: Build completes with static/dynamic routes listed.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve TypeScript build errors and finalize MVP"
```

---

## Self-Review: Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Business listings with all fields | Task 1 schema, Task 7/9 pages |
| 8 categories | Task 3 seed |
| 5 regions | Task 3 seed |
| Keyword + category + region search | Task 8 search page |
| Sort by newest/alpha | Task 8 search page |
| Star ratings 1–5, 300 char reviews | Task 9 detail page, Task 12 API |
| No-login review submission | Task 12 reviews API |
| Flag review | Task 12 flag API |
| Business owner accounts | Task 4 auth |
| Owner respond to reviews | Task 11 dashboard, Task 12 respond API |
| Submit a business (moderation queue) | Task 10 submit page, Task 12 submit API |
| Admin approve/reject submissions | Task 11 admin page, Task 12 admin API |
| Admin flagged reviews list | Task 11 admin page |
| Dashboard: owner sees their listings | Task 11 dashboard |
| Dark design system (all pages) | Task 5 CSS, all pages |
| Filipino-owned badge | BusinessCard component |
| Nav with scroll transparency | Task 6 Nav component |
| Mobile hamburger nav | Task 6 Nav component |
| `AUTH_SECRET`, `ADMIN_TOKEN` env | Task 2 .env.local |
| Drizzle push + seed | Tasks 2, 3 |

**Gaps addressed:**
- `types/next-auth.d.ts` for `session.user.id` — handled in Task 13
- Sign-up success flow — redirects to sign-in with `?registered=1`
- Submit success — redirects to `/submit?success=1` (page should check this param and show message)

**One additional fix needed** — `app/submit/page.tsx` should show success message if `?success=1`:

Add to submit page (after `await db.select()` calls, before the return):
```typescript
// In app/submit/page.tsx — add searchParams prop
export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const success = params.success === '1'
  const allCategories = await db.select().from(categories)
  const allRegions = await db.select().from(regions)
  // ... rest of component
  // Add above the form:
  // {success && <div style={{ background: 'rgba(54,244,164,0.1)', border: '1px solid rgba(54,244,164,0.3)', borderRadius: '8px', padding: '16px', color: '#36F4A4', marginBottom: '24px' }}>✅ Your submission has been received! We'll review it within 24–48 hours.</div>}
```
