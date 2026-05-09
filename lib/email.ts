import { Resend } from 'resend'
import crypto from 'crypto'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export function generateOTP(): { code: string; hash: string } {
  const code = String(crypto.randomInt(100000, 999999))
  const hash = hashOTP(code)
  return { code, hash }
}

export function hashOTP(code: string): string {
  return crypto
    .createHmac('sha256', process.env.OTP_HMAC_SECRET!)
    .update(code)
    .digest('hex')
}

export function verifyOTPHash(submitted: string, stored: string): boolean {
  const a = Buffer.from(submitted, 'hex')
  const b = Buffer.from(stored, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function sendOTPEmail(email: string, code: string) {
  const { error } = await getResend().emails.send({
    from: 'BisDak <noreply@mail.bisdak.co.nz>',
    to: email,
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
  if (error) throw new Error(`Failed to send OTP: ${error.message}`)
}
