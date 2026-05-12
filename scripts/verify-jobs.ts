import { readFileSync } from 'fs'
import postgres from 'postgres'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
    ORDER BY ordinal_position
  `
  console.log('jobs columns:')
  for (const c of cols) console.log(` - ${c.column_name} ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${c.column_default ?? ''}`.trim())

  const idx = await sql`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'jobs' ORDER BY indexname
  `
  console.log('jobs indexes:', idx.map((r: any) => r.indexname))

  const cons = await sql`
    SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.jobs'::regclass ORDER BY conname
  `
  console.log('jobs constraints:', cons.map((r: any) => `${r.conname} (${r.contype})`))

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
