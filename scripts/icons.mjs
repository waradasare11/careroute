import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const svg=await fs.readFile('public/icon.svg','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true});
async function render(markup, size, path) {
 const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
 try {
  await page.setContent(`<html><body style="margin:0">${markup.replace('<svg ','<svg width="100%" height="100%" ')}</body></html>`);
  await page.screenshot({path,omitBackground:true});
 } finally {
  await page.close();
 }
}
try {
 for(const size of [48,72,96,144,192,512]) await render(svg,size,`public/icon-${size}.png`);
 const adaptiveMark=svg.replace('viewBox="0 0 192 192"','viewBox="-35 -35 262 262"').replace(/<rect[^>]*\/>/,'');
 const densities={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
 for(const [density,size] of Object.entries(densities)){
  const folder=`android/app/src/main/res/mipmap-${density}`;
  for(const name of ['ic_launcher.png','ic_launcher_round.png']) await fs.copyFile(`public/icon-${size}.png`,`${folder}/${name}`);
  await render(adaptiveMark,Math.round(size*2.25),`${folder}/ic_launcher_foreground.png`);
 }
} finally {
 await browser.close();
}
console.log('Generated web and Android icons');
