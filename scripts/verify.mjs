import { readFile, readdir } from 'node:fs/promises';
import { renderSite } from './render.mjs';

function verify(renderSite, data) {
  const fail = msg => { throw Error(msg); };
  const check = (yes,msg) => { if(!yes) fail(msg); };
  const publicSite=renderSite(data,{baseUrl:'https://example.test/engineering-portfolio'});
  const local=renderSite(data,{review:true});
  const paths=Object.keys(local.pages);
  for (const route of ['index.html','about/index.html','projects/index.html','skills/index.html','writing/index.html']) check(paths.includes(route),`Missing ${route}`);
  const known=new Set([...paths,...local.assets,'assets/site.css','assets/mark.svg']);
  for(const [name,page] of Object.entries(local.pages)) {
    check((page.match(/<h1[ >]/g)||[]).length===1,`Expected one h1 in ${name}`);
    check(page.includes('aria-label="Main navigation"'),`Missing navigation in ${name}`);
    for(const match of page.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const href=match[1];
      if(href.startsWith('https://')||href.startsWith('mailto:')) continue;
      const [path,anchor]=href.split('#');
      const parts=[];
      for(const part of [...name.split('/').slice(0,-1),...path.split('/')]) {
        if(part==='..') parts.pop();
        else if(part!==''&&part!=='.')parts.push(part);
      }
      if(path)check(known.has(parts.join('/')),`Broken ${href} in ${name}`);
      else if(anchor)check(page.includes(`id="${anchor}"`),`Missing anchor ${anchor} in ${name}`);
    }
    for(const img of page.matchAll(/<img\b[^>]*>/g)) check(/\balt="[^"]+"/.test(img[0]),`Missing alt in ${name}`);
  }
  const sample = JSON.parse(JSON.stringify(data));
  const profile = ['https://www.linkedin.com/in/sample/','https://github.com/sample','https://www.naukri.com/sample'];
  sample.site.profiles={linkedin:profile[0],github:profile[1],naukri:profile[2]};
  sample.site.navigation.writing='Notes';
  sample.articles.push({slug:'hidden-fixture',title:'Hidden fixture',summary:'Draft',published:false});
  sample.articles.push({slug:'visible-fixture',title:'Visible article',summary:'Written for tests.',published:true,blocks:[{kind:'Code',text:'<script>alert(1)</script>'}]});
  const original='https://www.linkedin.com/feed/update/urn:li:ugcPost:7434968009623973889/?a=1&b=2';
  sample.posts.push({title:'Photo test',url:original,excerpt:'A local test post.',photos:[{src:'/media/test-1.jpg',alt:'First photograph'},{src:'/media/test-2.jpg',alt:'Second photograph'}],published:true});
  const p=sample.projects.sort((a,b)=>a.order-b.order)[0];
  if(p){
    p.website='https://example.test/live';
    p.documents=[{src:'/documents/test.pdf',title:'Project note'}];
  }
  const built=renderSite(sample);
  for(const url of profile)check(built.pages['index.html'].includes(url),'Missing profile');
  check(!built.pages['index.html'].includes('Open Pages CMS'),'Review shortcut in public output');
  check(local.pages['index.html'].includes('Open Pages CMS'),'Review shortcut missing');
  check(!('writing/hidden-fixture/index.html' in built.pages),'Draft article published');
  check(built.pages['writing/visible-fixture/index.html'].includes('&lt;script&gt;'),'Article code not escaped');
  check(built.pages['writing/index.html'].includes('<h1>Notes</h1>'),'Writing navigation and page labels differ');
  const card=built.pages['index.html'].match(/<article class="linkedin-card">.*?<\/article>/s)?.[0]??'';
  check(card.includes(original.replace('&','&amp;'))&&card.includes('First photograph')&&card.includes('Second photograph'),'LinkedIn card click or photo missing');
  if(p)check(built.pages[`projects/${p.slug}/index.html`].includes('href="../../documents/test.pdf" download')&&built.pages['projects/index.html'].includes('https://example.test/live'),'Project links or file download missing');
  check(!publicSite.pages['index.html'].includes('noindex'),'Public view has noindex');
  return paths.length;
}

const read = async name => JSON.parse(await readFile(new URL('../content/'+name,import.meta.url),'utf8'));
const list = async folder => Promise.all((await readdir(new URL('../content/'+folder+'/',import.meta.url))).filter(x=>x.endsWith('.json')).map(x=>read(folder+'/'+x)));
const data={};
for(const name of ['site','home','about','skills','writing'])data[name]=await read(name+'.json');
data.projects=await list('projects');
data.articles=await list('articles');
data.posts=await list('linkedin');
console.log('Checked '+verify(renderSite,data)+' page routes and CMS test records.');
