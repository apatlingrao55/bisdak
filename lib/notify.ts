import { Resend } from 'resend'

const ADMIN_EMAIL = 'alex@aiconsult.co.nz'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function notifyAdmin(subject: string, html: string) {
  try {
    await getResend().emails.send({
      from: 'BisDak <noreply@mail.bisdak.co.nz>',
      to: ADMIN_EMAIL,
      subject: `[BisDak] ${subject}`,
      html,
    })
  } catch {
    // Don't fail the request if notification fails
    console.error('Failed to send admin notification:', subject)
  }
}
