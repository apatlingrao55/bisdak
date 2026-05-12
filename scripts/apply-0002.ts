import { readFileSync, readdirSync } from 'fs'
import postgres from 'postgres'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const file = readdirSync('drizzle').find(f => f.startsWith('0002_'))!
  const stmts = readFileSync(`drizzle/${file}`, 'utf8')
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean)

  console.log(`Applying ${stmts.length} statements from drizzle/${file}`)
  await sql.begin(async tx => {
    for (let i = 0; i < stmts.length; i++) {
      console.log(`[${i + 1}/${stmts.length}] ${stmts[i].split('\n')[0].slice(0, 80)}…`)
      await tx.unsafe(stmts[i])
    }
  })
  console.log('Done.')
  await sql.end()
}

main().catch(async e => { console.error('FAILED:', e); await sql.end(); process.exit(1) })
