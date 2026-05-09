import { getResend } from '@/lib/resend'

const ADMIN_EMAIL = 'alex@aiconsult.co.nz'

export async function notifyAdmin(subject: string, html: string) {
  try {
    await getResend().emails.send({
      from: 'BisDak <noreply@mail.bisdak.co.nz>',
      to: ADMIN_EMAIL,
      subject: `[BisDak] ${subject}`,
      html,
    })
  } catch (err) {
    console.error('Failed to send admin notification:', subject, err)
  }
}
