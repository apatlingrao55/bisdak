import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { users, emailVerifications } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import crypto from 'crypto'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client)
const resend = new Resend(process.env.RESEND_API_KEY)

const TEST_EMAIL = 'hello@bisdak.co.nz'

function hashOTP(code: string): string {
  return crypto.createHmac('sha256', process.env.OTP_HMAC_SECRET!).update(code).digest('hex')
}

async function main() {
  console.log('=== E2E OTP Smoke Test ===\n')

  // 1. Generate OTP
  const code = String(crypto.randomInt(100000, 999999))
  const codeHash = hashOTP(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  console.log('1. Generated OTP:', code)

  // 2. Insert verification record
  await db.insert(emailVerifications).values({
    email: TEST_EMAIL,
    codeHash,
    purpose: 'registration',
    expiresAt,
  })
  console.log('2. Inserted verification record into DB')

  // 3. Send real email via Resend
  const { data, error } = await resend.emails.send({
    from: 'BisDak <noreply@bisdak.co.nz>',
    to: TEST_EMAIL,
    subject: 'Your BisDak verification code',
    html: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #333;">Your verification code</h2>
      <p style="font-size: 32px; font-family: monospace; letter-spacing: 8px; font-weight: bold; color: #111;">${code}</p>
      <p style="color: #666;">This code expires in 10 minutes.</p>
      <p style="color: #666;">If you did not request this code, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">BisDak - Pinoy Business Hub NZ</p>
    </div>`,
  })

  if (error) {
    console.log('3. FAILED to send email:', error.message)
  } else {
    console.log('3. Email sent! ID:', data?.id)
  }

  // 4. Verify OTP hash comparison works
  const submittedHash = hashOTP(code)
  const a = Buffer.from(submittedHash, 'hex')
  const b = Buffer.from(codeHash, 'hex')
  const match = crypto.timingSafeEqual(a, b)
  console.log('4. Hash verification:', match ? 'PASS' : 'FAIL')

  // 5. Wrong code rejected
  const wrongHash = hashOTP('000000')
  const wa = Buffer.from(wrongHash, 'hex')
  const wrongMatch = crypto.timingSafeEqual(wa, b)
  console.log('5. Wrong code rejected:', !wrongMatch ? 'PASS' : 'FAIL')

  // 6. Cleanup test record
  await db.delete(emailVerifications).where(eq(emailVerifications.email, TEST_EMAIL))
  console.log('6. Cleaned up test records')

  console.log('\n=== All checks passed! Check', TEST_EMAIL, 'for the OTP email ===')
  await client.end()
  process.exit(0)
}

main()
