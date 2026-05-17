import { test, expect, type Page } from '@playwright/test'

let businessSlug: string | null = null
let blogSlug: string | null = null

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()

  // Find a real business slug
  await page.goto('/search')
  const bizLink = page.locator('a[href^="/business/"]').first()
  if ((await bizLink.count()) > 0) {
    businessSlug = await bizLink.getAttribute('href')
  }

  // Find a real blog slug
  await page.goto('/blog')
  const blogLink = page.locator('a[href^="/blog/"]').first()
  if ((await blogLink.count()) > 0) {
    blogSlug = await blogLink.getAttribute('href')
  }

  await page.close()
})

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

// ── Public Pages ──

test('homepage loads with hero and categories', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible()
  // Category grid should render
  await expect(page.locator('a[href^="/search?category="]').first()).toBeVisible()
  // Business cards should appear
  await expect(page.locator('a[href^="/business/"]').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('search page loads with input', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/search')
  await expect(page.locator('input[placeholder*="Search"]').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('search with query returns results', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/search?q=food')
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('search with category filter loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/search?category=food-dining')
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('business detail page loads', async ({ page }) => {
  if (!businessSlug) {
    test.skip(true, 'No active businesses — skipping')
    return
  }
  const errors = collectConsoleErrors(page)
  await page.goto(businessSlug)
  await expect(page.locator('h1').first()).toBeVisible()
  // Review section visible
  await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible()
  // Contact links or share button visible
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('business detail shows disabled review form for anonymous user', async ({ page }) => {
  if (!businessSlug) {
    test.skip(true, 'No active businesses — skipping')
    return
  }
  await page.goto(businessSlug)
  await expect(page.locator('text=Write a Review')).toBeVisible()
  // Should show sign-in prompt in review section
  await expect(page.locator('a[href*="sign-in?callbackUrl"]')).toBeVisible()
  // Form fields should be disabled
  const nameInput = page.locator('input[name="reviewerName"]')
  if ((await nameInput.count()) > 0) {
    await expect(nameInput).toBeDisabled()
  }
})

test('blog listing page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/blog')
  await expect(page.locator('h1').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('blog post page loads', async ({ page }) => {
  if (!blogSlug) {
    test.skip(true, 'No blog posts — skipping')
    return
  }
  const errors = collectConsoleErrors(page)
  await page.goto(blogSlug)
  await expect(page.locator('h1').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('submit page loads with form', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/submit')
  await expect(page.locator('h1')).toContainText('Submit a Business')
  await expect(page.locator('input[name="name"]')).toBeVisible()
  await expect(page.locator('select[name="categoryId"]')).toBeVisible()
  await expect(page.locator('select[name="regionId"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
  expect(errors).toHaveLength(0)
})

// ── Auth Pages ──

test('sign-up page loads with all fields', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/auth/sign-up')
  await expect(page.locator('h1')).toContainText('Create Account')
  await expect(page.locator('input[name="name"]')).toBeVisible()
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
  await expect(page.locator('input[name="agreeTerms"]')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('sign-in page loads with fields and forgot password link', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/auth/sign-in')
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
  await expect(page.locator('a[href*="forgot-password"]')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('forgot password page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/auth/forgot-password')
  await expect(page.locator('h1')).toContainText('Forgot Password')
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
  expect(errors).toHaveLength(0)
})

// ── Legal Pages ──

test('privacy policy page loads', async ({ page }) => {
  await page.goto('/privacy')
  await expect(page.locator('h1')).toContainText('Privacy Policy')
})

test('terms of use page loads', async ({ page }) => {
  await page.goto('/terms')
  await expect(page.locator('h1')).toContainText('Terms')
})

test('cookie policy page loads', async ({ page }) => {
  await page.goto('/cookies')
  await expect(page.locator('h1')).toContainText('Cookie')
})

test('disclaimer page loads', async ({ page }) => {
  await page.goto('/disclaimer')
  await expect(page.locator('h1')).toContainText('Disclaimer')
})

// ── Navigation ──

test('nav links work from homepage', async ({ page, viewport }) => {
  await page.goto('/')

  // On mobile, open hamburger menu first
  if (viewport && viewport.width < 768) {
    const hamburger = page.locator('.nav-mobile-toggle')
    if ((await hamburger.count()) > 0) {
      await hamburger.click()
      await page.waitForTimeout(300)
    }
  }

  // Browse link goes to search
  const browseLink = page.locator('a[href="/search"]').first()
  if ((await browseLink.count()) > 0 && await browseLink.isVisible()) {
    await browseLink.click()
    await expect(page).toHaveURL(/\/search/)
  }
})

test('footer legal links work', async ({ page }) => {
  await page.goto('/')
  // Check footer links exist
  await expect(page.locator('a[href="/terms"]').last()).toBeVisible()
  await expect(page.locator('a[href="/privacy"]').last()).toBeVisible()
})

// ── Form Submissions ──

test('submit business form works', async ({ page }) => {
  await page.goto('/submit')

  await page.fill('input[name="name"]', '[TEST] Smoke Test Business')
  await page.selectOption('select[name="categoryId"]', { index: 1 })
  await page.selectOption('select[name="regionId"]', { index: 1 })
  await page.fill('textarea[name="description"]', 'Automated smoke test - safe to delete')
  await page.fill('input[name="submitterEmail"]', 'test@example.com')

  await page.click('button[type="submit"]')
  await page.waitForURL(/\/submit\?success=1/)
  await expect(page.locator('text=submission has been received')).toBeVisible()
})

// ── Tools ──

test('/tools index lists passport photo tool', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/tools')
  await expect(page.locator('a[href="/tools/passport-photo"]')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('/tools/passport-photo loads with upload area', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/tools/passport-photo')
  await expect(page.locator('h1')).toContainText(/passport photo/i)
  await expect(page.getByRole('button', { name: /upload/i })).toBeVisible()
  expect(errors).toHaveLength(0)
})

// ── Sitemap ──

test('sitemap.xml returns valid XML', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  const body = await res.text()
  expect(body).toContain('<urlset')
  expect(body).toContain('bisdak.co.nz')
})

test('robots.txt is accessible', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.status()).toBe(200)
})

test('/jobs index loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/jobs')
  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible()
  // Filter form is present
  await expect(page.locator('input[name="q"]')).toBeVisible()
  await expect(page.locator('select[name="region"]')).toBeVisible()
  await expect(page.locator('select[name="type"]')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('/jobs filter by type does not crash', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/jobs?type=full_time')
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('/jobs/<missing-id> shows 404', async ({ page }) => {
  await page.goto('/jobs/this-id-does-not-exist-xyz')
  // Next.js 404 page
  await expect(page.locator('body')).toContainText(/not found|404/i)
})

test('/dashboard/jobs without auth redirects to sign-in', async ({ page }) => {
  await page.goto('/dashboard/jobs')
  await expect(page).toHaveURL(/\/auth\/sign-in/)
})

test('business detail page does not leak phone/email in HTML', async ({ page }) => {
  if (!businessSlug) {
    test.skip(true, 'No active businesses — skipping')
    return
  }
  const errors = collectConsoleErrors(page)
  await page.goto(businessSlug)
  // Show contact button visible
  await expect(page.getByRole('button', { name: /show contact/i }).first()).toBeVisible()
  // No tel: or mailto: anchors in the rendered HTML
  expect(await page.locator('a[href^="tel:"]').count()).toBe(0)
  expect(await page.locator('a[href^="mailto:"]').count()).toBe(0)
  // No telephone field in JSON-LD
  const ldText = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(ldText ?? '').not.toContain('telephone')
  expect(errors).toHaveLength(0)
})

test('clicking show-contact reveals phone or email', async ({ page }) => {
  if (!businessSlug) {
    test.skip(true, 'No active businesses — skipping')
    return
  }
  await page.goto(businessSlug)
  const btn = page.getByRole('button', { name: /show contact/i }).first()
  await btn.click()
  // Wait for either tel:/mailto: link OR the "no public contact" message
  const anyResult = page.locator('a[href^="tel:"], a[href^="mailto:"], text=/no public contact info/i')
  await expect(anyResult.first()).toBeVisible({ timeout: 5000 })
})
