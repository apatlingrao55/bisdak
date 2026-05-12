import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { emailVerifications } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { generateOTP, hashOTP, verifyOTPHash } from '../lib/email'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client)

async function main() {
  console.log('--- OTP Generation Test ---')
  const { code, hash } = generateOTP()
  console.log('Generated code:', code)
  console.log('Hash length:', hash.length)
  console.log('Code is 6 digits:', /^\d{6}$/.test(code))

  console.log('\n--- Hash Verification Test ---')
  const reHash = hashOTP(code)
  console.log('Same hash:', hash === reHash)
  console.log('Timing-safe match:', verifyOTPHash(reHash, hash))
  console.log('Wrong code rejected:', !verifyOTPHash(hashOTP('000000'), hash))

  console.log('\n--- DB Insert/Query Test ---')
  const testEmail = 'test-otp@example.com'
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await db.insert(emailVerifications).values({
    email: testEmail,
    codeHash: hash,
    purpose: 'registration',
    expiresAt,
  })
  console.log('Inserted OTP record')

  const [record] = await db
    .select()
    .from(emailVerifications)
    .where(and(
      eq(emailVerifications.email, testEmail),
      eq(emailVerifications.used, false),
    ))
    .limit(1)

  console.log('Found record:', !!record)
  console.log('Code hash matches:', record?.codeHash === hash)

  // Cleanup
  await db.delete(emailVerifications).where(eq(emailVerifications.email, testEmail))
  console.log('Cleaned up test record')

  console.log('\n--- Resend API Test ---')
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: 'BisDak <onboarding@resend.dev>',
      to: 'delivered@resend.dev',
      subject: 'OTP Test',
      html: `<p>Test code: <strong>${code}</strong></p>`,
    })
    if (error) {
      console.log('Resend error:', error.message)
    } else {
      console.log('Email sent! ID:', data?.id)
    }
  } catch (err: any) {
    console.log('Resend failed:', err.message)
  }

  console.log('\nAll tests passed!')
  await client.end()
  process.exit(0)
}

main()
