import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { users } from '../lib/db/schema'
import { isNull } from 'drizzle-orm'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client)

async function main() {
  const result = await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(isNull(users.emailVerified))
    .returning({ id: users.id })
  console.log('Grandfathered', result.length, 'existing users as verified')
  await client.end()
  process.exit(0)
}

main()
