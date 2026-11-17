import {test,expect} from '@playwright/test';
test('health reference search is bounded, sourced and explicit about freshness',async({page})=>{
 await page.goto('/#/library');
 await expect(page.getByRole('heading',{name:'Health reference explorer'})).toBeVisible();
 await page.getByLabel('Search health topics').fill('amoxicillin');
 await page.getByLabel('Reference category').selectOption('Medicines');
 await expect(page.locator('.health-result')).toHaveCount(1);
 await expect(page.locator('.health-result a')).toHaveAttribute('href','https://www.nhs.uk/medicines/amoxicillin/');
 await expect(page.getByText('No automatic medical updates are downloaded.')).toBeVisible();
 await page.getByLabel('Search health topics').fill('no-such-health-topic-xyz');
 await expect(page.getByText('No matching indexed titles.')).toBeVisible();
 await expect(page.getByRole('link',{name:'WHO outbreak updates'})).toHaveAttribute('href','https://www.who.int/emergencies/disease-outbreak-news');
});
