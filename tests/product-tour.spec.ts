import {expect, test} from '@playwright/test';

test('the tour visits each chapter and links to its feature', async ({page}) => {
  await page.goto('/');
  await page.getByRole('link', {name: 'View the product tour'}).click();
  const tour = page.getByRole('region', {name: 'Product tour'});
  await expect(tour.getByRole('heading', {name: 'One visit. A shared plan.'})).toBeVisible();
  const chapters = tour.getByRole('navigation', {name: 'Slideshow chapters'}).getByRole('button');
  await expect(chapters).toHaveCount(11);
  for (let position = 0; position < 11; position++) {
    await chapters.nth(position).click();
    await expect(chapters.nth(position)).toHaveAttribute('aria-current', 'step');
    await expect(tour.locator('.tour-copy li')).toHaveCount(4);
    await expect(tour.locator('.tour-copy a')).toHaveAttribute('href', /^#\//);
  }
  const next = tour.getByRole('button', {name: 'Next slide'});
  await next.click();
  await expect(chapters.first()).toHaveAttribute('aria-current', 'step');
  await next.press('ArrowLeft');
  await expect(chapters.last()).toHaveAttribute('aria-current', 'step');
  await tour.getByRole('button', {name: 'Play slideshow'}).click();
  await expect(tour.getByRole('button', {name: 'Pause slideshow'})).toBeVisible();
  await next.click();
  await expect(tour.getByRole('button', {name: 'Play slideshow'})).toBeVisible();
  await chapters.getByText('Health references', {exact: true}).click();
  await tour.getByRole('link', {name: 'Explore health references'}).click();
  await expect(page.getByRole('heading', {name: 'Health reference explorer'})).toBeVisible();
});

test('the mobile dark tour has a usable chapter picker', async ({page}) => {
  await page.setViewportSize({width: 360, height: 780});
  await page.goto('/');
  await page.getByRole('combobox', {name: 'Colour theme'}).selectOption('dark');
  const picker = page.getByRole('combobox', {name: 'Jump to a chapter'});
  await picker.selectOption({label: 'Prescription drafts'});
  await expect(page.getByRole('heading', {name: 'Turn handwritten instructions into a readable draft.'})).toBeVisible();
  await expect(page.getByText('Each preview and export is marked', {exact: false})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({path: 'test-results/tour-mobile-dark.png', fullPage: true});
});
