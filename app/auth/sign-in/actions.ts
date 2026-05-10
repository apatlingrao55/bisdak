'use server'
import { signIn } from '@/auth'

function safeRedirect(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export async function signInAction(formData: FormData) {
  await signIn('credentials', {
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: safeRedirect(formData.get('callbackUrl')),
  })
}
