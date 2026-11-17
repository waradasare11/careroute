import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const svg=await fs.readFile('public/icon.svg','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true});
for(const size of [48,72,96,144,192,512]){
 const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
 await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ','<svg width="100%" height="100%" ')}</body></html>`);
 await page.screenshot({path:`public/icon-${size}.png`,omitBackground:true});await page.close();
}
await browser.close();
const densities={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
for(const [density,size] of Object.entries(densities))for(const name of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'])await fs.copyFile(`public/icon-${size}.png`,`android/app/src/main/res/mipmap-${density}/${name}`);
console.log('Generated web and Android icons');
