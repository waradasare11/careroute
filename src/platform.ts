import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';

export const isNative=()=>Capacitor.isNativePlatform();

/** Keep exports on-device until the user selects a destination in the share sheet. */
export async function exportFile(name:string,text:string,type='application/json') {
 if(isNative()) {
  const safeName=name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const file=await Filesystem.writeFile({path:`exports/${safeName}`,data:text,directory:Directory.Cache,encoding:Encoding.UTF8,recursive:true});
  await Share.share({title:'CareRoute demo export',files:[file.uri],dialogTitle:'Save or share your demo file'});
  return;
 }
 const url=URL.createObjectURL(new Blob([text],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
