import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

// RLS is enabled on every table. The app connects as the `postgres` role
// (BYPASSRLS), so Drizzle queries continue to work; this only blocks
// Supabase's auto-exposed PostgREST anon/authenticated access.
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name'),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow(),
}).enableRLS()

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon').notNull(),
}).enableRLS()

export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
}).enableRLS()

export const businesses = pgTable('businesses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  categoryId: integer('category_id').references(() => categories.id),
  regionId: integer('region_id').references(() => regions.id),
  description: text('description'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  facebookUrl: text('facebook_url'),
  googleMapsUrl: text('google_maps_url'),
  ownerId: text('owner_id').references(() => users.id),
  isFilipino: boolean('is_filipino').default(true),
  status: text('status', { enum: ['pending', 'active', 'rejected'] }).default('active'),
  photoUrl: text('photo_url'),
  openStatus: text('open_status', { enum: ['open', 'closed'] }),
  isPremium: boolean('is_premium').default(false),
  videoUrl: text('video_url'),
  createdAt: timestamp('created_at').defaultNow(),
}).enableRLS()

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text('business_id').notNull().references(() => businesses.id),
  reviewerName: text('reviewer_name').notNull(),
  suburb: text('suburb').notNull(),
  rating: integer('rating').notNull(),
  body: text('body').notNull(),
  ownerResponse: text('owner_response'),
  isFlagged: boolean('is_flagged').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}).enableRLS()

export const submissions = pgTable('submissions', {
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
  createdAt: timestamp('created_at').defaultNow(),
}).enableRLS()

export const posts = pgTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  authorName: text('author_name').notNull().default('BisDak Team'),
  status: text('status', { enum: ['draft', 'published'] }).default('published'),
  publishedAt: timestamp('published_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  meta: jsonb('meta'),
}).enableRLS()

export const businessClaims = pgTable('business_claims', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  businessId: text('business_id').notNull().references(() => businesses.id),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow(),
}).enableRLS()

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  employmentType: text('employment_type', { enum: ['full_time', 'part_time', 'casual', 'contract'] }).notNull(),
  applyUrl: text('apply_url'),
  applyEmail: text('apply_email'),
  salary: text('salary'),
  status: text('status', { enum: ['open', 'closed'] }).default('open').notNull(),
  postedAt: timestamp('posted_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  closedAt: timestamp('closed_at'),
}).enableRLS()

// NextAuth v5 tables
export const accounts = pgTable('accounts', {
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
}).enableRLS()

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
}).enableRLS()

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
}).enableRLS()

export const emailVerifications = pgTable('email_verifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  purpose: text('purpose', { enum: ['registration', 'claiming', 'password-reset'] }).notNull(),
  attempts: integer('attempts').default(0),
  used: boolean('used').default(false),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}).enableRLS()

export const rateLimits = pgTable('rate_limits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ip: text('ip').notNull(),
  route: text('route').notNull(),
  ts: timestamp('ts').defaultNow().notNull(),
}).enableRLS()
