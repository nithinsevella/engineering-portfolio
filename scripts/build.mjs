import {mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {dirname, extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderSite} from './render.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async path => JSON.parse(await readFile(join(root,'content',path),'utf8'));
const list = async path => {
  const entries = await readdir(join(root,'content',path), {withFileTypes:true});
  return Promise.all(entries.filter(x=>x.isFile()&&x.name.endsWith('.json')).map(x=>read(join(path,x.name))));
};

let rootContent = {};
for (const name of ['site','home','about','skills','writing']) rootContent[name] = await read(name + '.json');
const data = {...rootContent,projects:await list('projects'),articles:await list('articles'),posts:await list('linkedin')};
const review = process.argv.includes('--review');
const {pages,assets} = renderSite(data,{review,baseUrl:process.env.PAGES_BASE_URL});
const output = join(root,review?'review':'dist');

async function loadMedia(file){
  const bytes=await readFile(join(root,file));
  const ext=extname(file).toLowerCase();
  const signatures={
    '.png':()=>bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    '.jpg':()=>bytes.subarray(0,3).equals(Buffer.from([255,216,255])),
    '.jpeg':()=>bytes.subarray(0,3).equals(Buffer.from([255,216,255])),
    '.webp':()=>bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP',
    '.avif':()=>bytes.toString('ascii',4,8)==='ftyp' && /avif|avis/.test(bytes.toString('ascii',8,32)),
    '.pdf':()=>bytes.toString('ascii',0,5)==='%PDF-',
  };
  if(!signatures[ext]?.()) throw new Error(file+' does not match its file type.');
  const max=ext==='.pdf'?10:5;
  if(bytes.length>max*1024*1024) throw new Error(file+' exceeds '+max+' MB.');
  return [file,bytes];
}
const media = await Promise.all(assets.map(loadMedia));
const fixed = await Promise.all(['assets/site.css','assets/mark.svg'].map(async file=>[file,await readFile(join(root,file))]));
await rm(output,{recursive:true,force:true});
for (const [file,bytes] of [...Object.entries(pages),...media,...fixed,['.nojekyll','']]) {
  const path=join(output,file);
  await mkdir(dirname(path),{recursive:true});
  await writeFile(path,bytes);
}
if(review) await writeFile(join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log('Built '+Object.keys(pages).length+' pages in '+output);
