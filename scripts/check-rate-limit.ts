import { readFileSync } from 'fs'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

async function main() {
  const { rateLimit } = await import('../lib/rate-limit')
  const ip = `test-${Date.now()}`
  for (let i = 1; i <= 12; i++) {
    const r = await rateLimit({ ip, route: 'test', max: 10, windowSec: 60 })
    console.log(`call ${i}: ok=${r.ok} remaining=${r.remaining}`)
  }
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
