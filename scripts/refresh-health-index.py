"""Manually refresh names and links only. Review the diff before releasing."""
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlparse
from datetime import datetime, timezone
from pathlib import Path
import json

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.href=None; self.label=[]; self.rows=[]
    def handle_starttag(self, tag, attrs):
        if tag=='a': self.href=dict(attrs).get('href'); self.label=[]
    def handle_data(self, text):
        if self.href: self.label.append(text)
    def handle_endtag(self, tag):
        if tag=='a' and self.href:
            self.rows.append((self.href,' '.join(''.join(self.label).split())))
            self.href=None

rows=[]
for category, path in [('Conditions & symptoms','conditions'),('Medicines','medicines')]:
    url=f'https://www.nhs.uk/{path}/'
    with urlopen(Request(url,headers={'User-Agent':'CareRoute-reference-index/0.3'}),timeout=45) as response:
        parser=Links(); parser.feed(response.read().decode('utf-8'))
    found={}
    for href,title in parser.rows:
        full=urljoin(url,href); parsed=urlparse(full)
        if parsed.hostname=='www.nhs.uk' and parsed.path.startswith('/'+path+'/') and parsed.path!='/'+path+'/' and not parsed.fragment and title:
            found.setdefault(full,{'title':title,'url':full,'category':category,'publisher':'NHS'})
    if len(found)<100: raise RuntimeError(f'Unexpectedly small {category} index; existing file left unchanged')
    rows.extend(found.values())
result={'retrievedAt':datetime.now(timezone.utc).date().isoformat(),'entries':sorted(rows,key=lambda x:(x['category'],x['title'].lower()))}
target=Path(__file__).resolve().parents[1]/'src/data/health-index.json'
target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Wrote {len(rows)} source links; no articles, dosage data or clinical recommendations copied.')
