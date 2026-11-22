import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {seller,sellerComplete} from '../lib/seller.ts';

const require=createRequire(import.meta.url);
const root=new URL('../',import.meta.url).pathname;
const fixture=new URL('./fixtures/seller-complete.mjs',import.meta.url).pathname;

async function load(entry,{completeSeller,env}={}){
 const result=await build({entryPoints:[root+entry],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic',tsconfig:root+'tsconfig.json',loader:{'.css':'empty'},plugins:[{
  name:'seller-fixture',setup(build){
   if(completeSeller)build.onResolve({filter:/(?:^@\/lib\/seller|^\.\.\/seller)$/},()=>({path:fixture}));
   build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'offline'}));
   build.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:'export const env=globalThis.__sellerTestEnv;'}));
   build.onResolve({filter:/^react(?:\/.*)?$/},args=>({path:pathToFileURL(require.resolve(args.path)).href,external:true}));
   build.onResolve({filter:/^next\/link$/},()=>({path:pathToFileURL(require.resolve('next/link.js')).href,external:true}));
  }
 }]});
 globalThis.__sellerTestEnv=env||{};
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const render=async(entry,options)=>renderToStaticMarkup(createElement((await load(entry,options)).default));

test('seller data requires name, address and a valid e-mail',()=>{
 const full={name:'Jan Kowalski Czytaki',address:'ul. Przykładowa 1, 00-001 Warszawa',taxId:'',registry:'działalność nierejestrowana',email:'kontakt@example.invalid',vatPayer:false};
 assert.equal(sellerComplete(full),true);
 for(const patch of [{name:' '},{address:''},{email:''},{email:'brak-maila'},{email:'a@b'}])assert.equal(sellerComplete({...full,...patch}),false,JSON.stringify(patch));
});

test('repository ships without seller data, so documents stay drafts',async()=>{
 assert.equal(sellerComplete(seller),false);
 const terms=await render('app/regulamin/page.tsx');
 assert.match(terms,/Szkic do akceptacji właściciela/);
 assert.match(terms,/do uzupełnienia w lib\/seller\.ts/);
});

test('complete seller data publishes final documents with seller identity',async()=>{
 const terms=await render('app/regulamin/page.tsx',{completeSeller:true});
 const privacy=await render('app/prywatnosc/page.tsx',{completeSeller:true});
 for(const html of [terms,privacy]){
  assert.doesNotMatch(html,/Szkic do akceptacji|do uzupełnienia/);
  assert.match(html,/Wersja obowiązująca od 22 listopada 2026/);
  assert.match(html,/Testowy Sprzedawca/);
  assert.match(html,/href="mailto:kontakt@example.invalid"/);
 }
 assert.match(terms,/art\. 38 ust\. 1 pkt 13/);
 assert.match(terms,/uokik\.gov\.pl/);
 assert.doesNotMatch(terms,/zawierają podatek VAT/);
 assert.match(privacy,/art\. 6 ust\. 1 lit\. b RODO/);
 assert.match(privacy,/Prezesa Urzędu Ochrony Danych Osobowych/);
 assert.match(privacy,/czytaki_session/);
});

test('public sales stay off without seller data even with SALES_ENABLED=true',async()=>{
 const env={SALES_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_offline',STRIPE_WEBHOOK_SECRET:'offline',RESEND_API_KEY:'offline',EMAIL_FROM:'test@example.invalid',APP_URL:'https://shop.example',PRICE_CENTS:'2900'};
 assert.equal((await load('lib/server/runtime.ts',{env})).salesReady(),false);
 assert.equal((await load('lib/server/runtime.ts',{env,completeSeller:true})).salesReady(),true);
});
