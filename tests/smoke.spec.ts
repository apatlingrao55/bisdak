import { test, expect, type Page } from '@playwright/test'

let businessSlug: string | null = null

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('/search')
  const firstLink = page.locator('a[href^="/business/"]').first()
  const count = await firstLink.count()
  if (count > 0) {
    const href = await firstLink.getAttribute('href')
    businessSlug = href ?? null
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

test('home page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Lutong Pinoy')
  expect(errors).toHaveLength(0)
})

test('search page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/search')
  await expect(page.locator('input[type="search"], input[name="q"]').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('search with category filter loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/search?category=food-dining')
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('blog page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/blog')
  await expect(page.locator('h2').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('submit page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/submit')
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('business detail page loads', async ({ page }) => {
  if (!businessSlug) {
    test.skip(true, 'No active businesses in DB — skipping business detail smoke test')
    return
  }
  const errors = collectConsoleErrors(page)
  await page.goto(businessSlug)
  await expect(page.locator('h1').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})
