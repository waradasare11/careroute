import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAccountRequest} from '../worker/account.mjs';

test.use({serviceWorkers: 'block'});

test('landing sign-in opens a planner that persists visit edits and deletion', async ({page}) => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_planner_visits.sql', import.meta.url), 'utf8'));
  const env = {DB: {prepare: (sql: string) => ({bind: (...args: string[]) => ({
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({results: db.prepare(sql).all(...args)}),
  })})}};
  let signedIn = false;
  try {
    await page.route('**/api/account/**', async route => {
      const request = route.request();
      const headers = new Headers(request.headers());
      if (signedIn) {
        headers.set('oai-authenticated-user-id', 'browser-check');
        headers.set('oai-authenticated-user-email', 'browser-check@example.test');
      }
      const response = await handleAccountRequest(new Request(request.url(), {
        method: request.method(), body: request.postData(), headers,
      }), env);
      await route.fulfill({status: response.status, headers: Object.fromEntries(response.headers), body: await response.text()});
    });
    await page.goto('/');
    await page.getByRole('link', {name: 'Sign in', exact: true}).click();
    await expect(page.getByRole('link', {name: 'Continue with ChatGPT'})).toHaveAttribute('href', '/signin-with-chatgpt?return_to=%2F%23%2Faccount');
    signedIn = true;
    await page.reload();
    await page.getByRole('button', {name: 'Add a visit'}).click();
    await page.getByLabel('Visit label').fill('Follow-up visit');
    await page.getByLabel('Facility or provider').fill('Example clinic');
    await page.getByLabel('Date', {exact: true}).fill('2027-02-01');
    await page.getByLabel('Planned travel and support').check();
    await page.getByRole('button', {name: 'Save visit'}).click();
    await expect(page.getByText('Visit saved to your account.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('1 of 4 preparation steps checked')).toBeVisible();
    await page.getByRole('button', {name: 'Edit', exact: true}).click();
    await page.getByLabel('Visit status').selectOption('complete');
    await page.getByRole('button', {name: 'Save visit'}).click();
    await expect(page.getByText('Completed', {exact: true})).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', {name: 'Export my visits'}).click();
    expect((await download).suggestedFilename()).toBe('careroute-visits.json');
    await page.getByRole('button', {name: 'Delete', exact: true}).click();
    await page.getByRole('button', {name: 'Confirm deletion'}).click();
    await expect(page.getByText('Visit deleted.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Your next visit starts here')).toBeVisible();
    await page.setViewportSize({width: 360, height: 800});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  } finally {
    await page.unroute('**/api/account/**');
    db.close();
  }
});
