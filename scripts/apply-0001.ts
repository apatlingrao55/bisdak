import { readFileSync } from 'fs'
import postgres from 'postgres'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const file = readFileSync('drizzle/0001_brief_logan.sql', 'utf8')
  const statements = file
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean)

  console.log(`Applying ${statements.length} statements from drizzle/0001_brief_logan.sql`)

  await sql.begin(async tx => {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const preview = stmt.split('\n')[0].slice(0, 80)
      console.log(`[${i + 1}/${statements.length}] ${preview}…`)
      await tx.unsafe(stmt)
    }
  })

  console.log('Migration applied successfully.')

  // Verify the jobs table now exists
  const check = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jobs'
  `
  console.log('jobs table present:', check.length > 0)

  await sql.end()
}

main().catch(async e => {
  console.error('FAILED:', e)
  await sql.end()
  process.exit(1)
})
