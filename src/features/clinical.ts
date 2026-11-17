export interface Medicine {name:string;strength:string;dose:string;route:string;frequency:string;duration:string;quantity:string;instructions:string}
export interface Prescription {id:string;patientId:string;patientName:string;age:string;date:string;clinician:string;registration:string;clinic:string;allergies:string;assessment:string;medicines:Medicine[];advice:string;followUp:string;reviewed:boolean;updatedAt:string}
export interface VisitNote {history:string;examination:string;assessment:string;plan:string;allergies:string;currentMedicines:string;referral:string;updatedAt:string}
export interface Preparation {concerns:string;medicines:string;allergies:string;questions:string;checked:string[]}
export interface Task {id:string;patientId:string;title:string;due:string;done:boolean}
export interface Extras {schema:1;drafts:Prescription[];notes:Record<string,VisitNote>;preparation:Record<string,Preparation>;favorites:string[];tasks:Task[]}
export const EXTRAS_KEY='careroute.workspace.v2';
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const emptyMedicine=():Medicine=>({name:'',strength:'',dose:'',route:'',frequency:'',duration:'',quantity:'',instructions:''});
export const emptyDraft=(patientId:string):Prescription=>({id:crypto.randomUUID(),patientId,patientName:'',age:'',date:today(),clinician:'',registration:'',clinic:'',allergies:'',assessment:'',medicines:[emptyMedicine()],advice:'',followUp:'',reviewed:false,updatedAt:''});
export const emptyExtras=():Extras=>({schema:1,drafts:[],notes:{},preparation:{},favorites:[],tasks:[]});
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const strings=(v:Record<string,unknown>,keys:string[])=>keys.every(k=>typeof v[k]==='string');
const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function validatePrescription(d:Prescription):string[]{
 const errors:string[]=[];
 for(const [key,label] of [['patientName','Patient'],['age','Patient age'],['clinician','Clinician name'],['registration','Registration number'],['clinic','Clinic details'],['allergies','Allergy review']] as const)if(!d[key].trim())errors.push(`${label} is required.`);
 if(d.age&&(!Number.isFinite(Number(d.age))||Number(d.age)<0||Number(d.age)>130))errors.push('Enter a valid age in years.');
 if(!validDate(d.date)||d.date>today())errors.push('Choose a valid prescription date that is not in the future.');
 if(d.followUp&&(!validDate(d.followUp)||d.followUp<d.date))errors.push('Follow-up date must be on or after the draft date.');
 if(!d.medicines.length)errors.push('Add at least one clinician-entered medicine.');
 const seen=new Set<string>();d.medicines.forEach((m,i)=>{const key=m.name.trim().toLowerCase();if(key&&seen.has(key))errors.push(`Medicine ${i+1}: duplicate medicine name; review the entries.`);seen.add(key);for(const k of ['name','strength','dose','route','frequency','duration','quantity'] as const)if(!m[k].trim())errors.push(`Medicine ${i+1}: ${k} is required.`);});
 if(!d.reviewed)errors.push('Complete the clinician review acknowledgement.');
 return errors;
}
export function readExtras():Extras {
 const raw=localStorage.getItem(EXTRAS_KEY);if(!raw)return emptyExtras();
 let v:unknown;try{v=JSON.parse(raw)}catch{throw new Error('Saved workspace data could not be read. Export or clear it in Settings before continuing.')}
 if(!record(v)||v.schema!==1||!Array.isArray(v.drafts)||!record(v.notes)||!record(v.preparation)||!Array.isArray(v.favorites)||!Array.isArray(v.tasks)||!v.favorites.every(x=>typeof x==='string'))throw new Error('Saved workspace data has an unsupported format. Clear this device’s demo data in Settings.');
 if(!v.drafts.every(d=>record(d)&&strings(d,['id','patientId','patientName','age','date','clinician','registration','clinic','allergies','assessment','advice','followUp','updatedAt'])&&typeof d.reviewed==='boolean'&&Array.isArray(d.medicines)&&d.medicines.every(m=>record(m)&&strings(m,['name','strength','dose','route','frequency','duration','quantity','instructions']))))throw new Error('A saved prescription draft is damaged. Clear the demo data in Settings.');
 if(!Object.values(v.notes).every(n=>record(n)&&strings(n,['history','examination','assessment','plan','allergies','currentMedicines','referral','updatedAt']))||!Object.values(v.preparation).every(p=>record(p)&&strings(p,['concerns','medicines','allergies','questions'])&&Array.isArray(p.checked)&&p.checked.every(x=>typeof x==='string'))||!v.tasks.every(t=>record(t)&&strings(t,['id','patientId','title','due'])&&typeof t.done==='boolean'))throw new Error('Saved notes or tasks are damaged. Clear the demo data in Settings.');
 return v as unknown as Extras;
}
export class WorkspaceChangedError extends Error {}
export function writeExtras(value:Extras,expected?:Extras){
 if(localStorage.getItem('careroute.demo.deleted.v1')==='1')throw new Error('Demo data was deleted. Restore sample data in Settings before saving new workspace information.');
 if(expected&&JSON.stringify(readExtras())!==JSON.stringify(expected))throw new WorkspaceChangedError('The workspace changed in another tab. Review the latest copy and try again.');
 localStorage.setItem(EXTRAS_KEY,JSON.stringify(value));
}
export function scopedExtras(patientId?:string){const e=readExtras();if(!patientId)return e;return {...e,drafts:[],notes:{},tasks:[],preparation:e.preparation[patientId]?{[patientId]:e.preparation[patientId]}:{}};}
export function prescriptionText(d:Prescription){return ['CAREROUTE — PRESCRIPTION DRAFT','DRAFT — NOT VALID FOR DISPENSING','Fictional demonstration. No verified prescriber or signature.',`Date: ${d.date}`,`Patient: ${d.patientName} | Age: ${d.age}`,`Clinician (unverified): ${d.clinician} | Registration (unverified): ${d.registration}`,`Clinic: ${d.clinic}`,`Allergy review: ${d.allergies}`,`Assessment entered by clinician: ${d.assessment}`,'',...d.medicines.map((m,i)=>`${i+1}. ${m.name} | Strength: ${m.strength} | Dose: ${m.dose} | Route: ${m.route} | Frequency: ${m.frequency} | Duration: ${m.duration} | Quantity: ${m.quantity}\nInstructions: ${m.instructions}`),'',`Advice: ${d.advice}`,`Follow-up: ${d.followUp||'Not entered'}`,'Clinical suitability, interactions and dose accuracy have NOT been checked by this software.'].join('\n');}
