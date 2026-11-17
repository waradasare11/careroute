import {useState} from 'react';
import index from '../data/health-index.json';

export function Knowledge(){
 const [query,setQuery]=useState('');const [category,setCategory]=useState('All');const [limit,setLimit]=useState(24);
 const results=index.entries.filter(x=>(category==='All'||x.category===category)&&x.title.toLowerCase().includes(query.trim().toLowerCase()));
 return <section className="panel">
  <h2>Health reference explorer</h2>
  <p>Search {index.entries.length} indexed NHS topic links for conditions, symptoms and medicines. Open the original article for its information and review date. This searches titles, not your symptoms, and does not diagnose or recommend treatment.</p>
  <div className="quiet-banner"><div><b>No automatic medical updates are downloaded.</b><p>Index retrieved {index.retrievedAt}. These are saved names and links, not downloaded clinical articles. The source may have changed since retrieval. External articles require internet access; this app does not monitor them in real time.</p></div></div>
  <p>Medicine names, availability, formulations, emergency numbers and services can differ between countries. Discuss treatment with a qualified clinician or pharmacist in India. No guaranteed cures, dose checks or complete specialist knowledge are provided.</p>
  <div className="directory-toolbar"><label className="field"><span>Search health topics</span><input value={query} onChange={e=>{setQuery(e.target.value);setLimit(24)}} placeholder="Topic or medicine name"/></label><label className="field"><span>Reference category</span><select value={category} onChange={e=>{setCategory(e.target.value);setLimit(24)}}>{['All','Conditions & symptoms','Medicines'].map(x=><option key={x}>{x}</option>)}</select></label></div>
  <p role="status">{results.length} matching indexed titles</p>
  <div className="directory-grid">{results.slice(0,limit).map(x=><article className="directory-card health-result" key={x.url}><span className="soft-tag">{x.category}</span><h3>{x.title}</h3><p>{x.publisher} · Original external reference</p><a className="text-link" href={x.url} target="_blank" rel="noreferrer">Read source: {x.title} ↗</a></article>)}</div>
  {!results.length&&<p>No matching indexed titles.</p>}{results.length>limit&&<button className="load-more" onClick={()=>setLimit(limit+24)}>Show more topics</button>}
  <h3>More coverage and current source updates</h3><p>These links open the publishers’ current pages. They are not a live feed inside CareRoute.</p>
  <div className="actions"><a className="button" href="https://medlineplus.gov/healthtopics.html" target="_blank" rel="noreferrer">MedlinePlus health topics</a><a className="button" href="https://medlineplus.gov/druginformation.html" target="_blank" rel="noreferrer">Medicine information</a><a className="button" href="https://www.who.int/news-room/fact-sheets" target="_blank" rel="noreferrer">WHO disease fact sheets</a><a className="button" href="https://www.who.int/emergencies/disease-outbreak-news" target="_blank" rel="noreferrer">WHO outbreak updates</a><a className="button" href="https://www.sja.org.uk/first-aid-advice/" target="_blank" rel="noreferrer">Full first-aid guidance</a></div>
  <p className="small">No search text is sent automatically to a medical service. Opening a source connects you to that external site. Not every condition has a cure; treatment and prevention depend on the condition and person.</p>
 </section>;
}
