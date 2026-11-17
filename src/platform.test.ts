import {beforeEach,describe,expect,it,vi} from 'vitest';
const native=vi.hoisted(()=>({value:false}));
const writeFile=vi.hoisted(()=>vi.fn());
const share=vi.hoisted(()=>vi.fn());
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>native.value}}));
vi.mock('@capacitor/filesystem',()=>({Filesystem:{writeFile},Directory:{Cache:'CACHE'},Encoding:{UTF8:'utf8'}}));
vi.mock('@capacitor/share',()=>({Share:{share}}));
import {exportFile} from './platform';
describe('platform file export',()=>{
 beforeEach(()=>{native.value=true;writeFile.mockReset();share.mockReset();});
 it('writes UTF-8 in private cache and opens the native file chooser',async()=>{
  writeFile.mockResolvedValue({uri:'file:///cache/plan.ics'});share.mockResolvedValue({});
  await exportFile('plan.ics','BEGIN:VCALENDAR','text/calendar');
  expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({directory:'CACHE',encoding:'utf8',data:'BEGIN:VCALENDAR'}));
  expect(share).toHaveBeenCalledWith(expect.objectContaining({files:['file:///cache/plan.ics']}));
 });
 it('does not open sharing when writing fails',async()=>{
  writeFile.mockRejectedValue(new Error('Storage is unavailable'));
  await expect(exportFile('plan.ics','data')).rejects.toThrow('Storage is unavailable');
  expect(share).not.toHaveBeenCalled();
 });
});
