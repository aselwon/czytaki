import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require=createRequire(import.meta.url);
async function renderPage(path){
 const result=await build({entryPoints:[new URL('../app/'+path,import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},plugins:[{
  name:'local-react',setup(build){
   build.onResolve({filter:/^react(?:\/.*)?$/},args=>({path:pathToFileURL(require.resolve(args.path)).href,external:true}));
   build.onResolve({filter:/^next\/link$/},()=>({path:pathToFileURL(require.resolve('next/link.js')).href,external:true}));
  }
 }]});
 const {default:Page}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 return renderToStaticMarkup(createElement(Page));
}
for(const [path,title] of [['regulamin/page.tsx','Regulamin Czytaki'],['prywatnosc/page.tsx','Polityka prywatności Czytaki']])test(`${path} renders a draft with navigation`,async()=>{
 const html=await renderPage(path);
 assert.ok(html.includes(`<h1>${title}</h1>`));
 assert.match(html,/Szkic do akceptacji właściciela/);
 assert.match(html,/href="\/regulamin"/);
 assert.match(html,/href="\/prywatnosc"/);
 assert.match(html,/href="\/"/);
 assert.match(html,/OpenAI/);
});
test('privacy draft describes retention and terms cover likeness and manual refunds',async()=>{
 const privacy=await renderPage('prywatnosc/page.tsx'),terms=await renderPage('regulamin/page.tsx');
 for(const text of ['podmiot przetwarzający','dopiero po płatności','po 7 dniach','porzucone zamówienia','po 30 dniach','Ilustracje, PDF'])assert.ok(privacy.includes(text),text);
 assert.match(terms,/Nie gwarantujemy podobieństwa/);
 assert.match(terms,/zwrot wykonuje ręcznie/);
});
test('studio has footer links and separate unchecked required checkout consent',async()=>{
 const source=await readFile(new URL('../app/studio.tsx',import.meta.url),'utf8');
 assert.match(source,/<footer>.*<LegalLinks\/>.*<\/footer>/);
 assert.match(source,/\[termsAccepted,setTermsAccepted\]=useState\(false\)/);
 assert.match(source,/<input type="checkbox" required checked=\{termsAccepted\}/);
 assert.match(source,/disabled=\{busy\|\|!config\?\.checkout\|\|!termsAccepted\}/);
 assert.match(source,/JSON.stringify\(\{email,termsAccepted\}\)/);
 for(const path of ['regulamin','prywatnosc'])assert.ok(source.includes(`href="/${path}" target="_blank"`));
});
