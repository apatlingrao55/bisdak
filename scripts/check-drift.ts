import { readFileSync } from 'fs'
import postgres from 'postgres'

// Tiny inline .env.local loader
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  // Check whether the drift items already exist in the live DB.
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('email_verifications', 'jobs')
    ORDER BY table_name
  `

  const businessCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses'
      AND column_name IN ('is_premium', 'video_url')
    ORDER BY column_name
  `

  const userCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('email_verified')
  `

  console.log('Tables present:', tables.map((r: any) => r.table_name))
  console.log('businesses cols present:', businessCols.map((r: any) => r.column_name))
  console.log('users cols present:', userCols.map((r: any) => r.column_name))

  const migTable = await sql`
    SELECT table_schema, table_name FROM information_schema.tables
    WHERE table_name = '__drizzle_migrations'
  `
  console.log('drizzle migration tracking table:', migTable)

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
