import {test,expect} from '@playwright/test';
test('production app reloads offline with saved plans and blocks edits',async({page,context})=>{
 test.skip(!process.env.CAREROUTE_TEST_URL,'Requires the production preview with its service worker');
 await page.goto('/#/app');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await page.reload();
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await expect(page.locator('.journey-row')).toHaveCount(4);
 await context.setOffline(true);
 await page.reload();
 await expect(page.getByText(/Offline · Viewing/)).toBeVisible();
 await expect(page.locator('.journey-row')).toHaveCount(4);
 await expect(page.getByRole('button',{name:'New care plan'})).toBeDisabled();
 await context.setOffline(false);
});
