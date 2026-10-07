import { expect, test } from '@playwright/test'

test('home is the lesson grid', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Lessons' })).toBeAttached()
  const lessons = page.getByRole('list', { name: 'Lessons' })
  await expect(lessons.getByRole('listitem')).toHaveCount(13)
  await expect(lessons.getByRole('listitem').first()).toContainText('Lesson 1')
  await expect(lessons.getByRole('listitem').first()).toContainText('First Chords')
})

test('a guest plays a whole lesson and the card says so', async ({ page }) => {
  await page.goto('/')
  const card = page.getByRole('listitem', { name: 'First Chords' })
  await expect(card.getByText('Never played')).toBeVisible()
  await card.getByRole('link', { name: 'Play First Chords' }).click()

  await expect(page).toHaveURL(/\/lesson\/first-chords$/)
  for (const chord of ['G', 'C', 'D']) {
    await expect(page.getByRole('heading', { level: 2, name: chord, exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: chord, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Got it' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to lessons' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(
    // exact: the badge's hidden "Last played today" would also match.
    page.getByRole('listitem', { name: 'First Chords' }).getByText('Today', { exact: true }),
  ).toBeVisible()
})

test('an unknown lesson slug is a real 404', async ({ page }) => {
  const response = await page.goto('/lesson/no-such-lesson')
  expect(response?.status()).toBe(404)
})

test('Sign In → Sign Up front-loads onboarding and keeps the settings on this device', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page
    .getByRole('dialog', { name: 'Sign in' })
    .getByRole('button', { name: 'Sign Up' })
    .click()
  const onboarding = page.getByRole('dialog', { name: 'Let\u2019s play' })
  await onboarding.getByRole('textbox', { name: 'Your name' }).fill('Paul')
  await onboarding.getByRole('switch', { name: 'Handedness: Right' }).click()
  await onboarding.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('dialog', { name: 'Create your account' })).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('casper:pending-player-settings'))
  // The profile, plus this device's preferences (which travel with it).
  expect(JSON.parse(stored ?? 'null')).toMatchObject({
    displayName: 'Paul',
    instrument: 'guitar',
    handedness: 'left',
  })
})
