import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const root=new URL('../',import.meta.url).pathname;
const env={};globalThis.__sampleEnv=env;
const compiled=await build({stdin:{contents:`
 export {POST as upload} from './app/api/orders/route';
 export {POST as checkout} from './app/api/orders/[id]/checkout/route';
 export {GET as preview} from './app/api/orders/[id]/preview/route';
 export {GET as download} from './app/api/orders/[id]/download/route';
 export {view} from './lib/server/runtime';
 export {confirmAndDeliver} from './lib/server/payments';
 export {samplePreview,SAMPLE_PREVIEW_LABEL} from './lib/sample-preview';
 export {default as ComicPreview} from './app/comic-preview';
`,resolveDir:root},bundle:true,write:false,metafile:true,platform:'node',format:'esm',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{
 name:'offline-sample',setup(build){
  build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:'export const env=globalThis.__sampleEnv;'}));
 }
}]});
// A file URL allows the bundled component to use this repository's React instance.
import {writeFileSync,unlinkSync} from 'node:fs';
const bundlePath=root+'tests/.sample-preview-bundle.mjs';
writeFileSync(bundlePath,compiled.outputFiles[0].text);
let api;try{api=await import(bundlePath);}finally{unlinkSync(bundlePath);}
const migrations=readdirSync(root+'drizzle').filter(f=>f.endsWith('.sql')).sort();
const product={name:'Iskra',title:'Wyprawa Iskry',subject:'pet',format:'comic',pages:8,world:'forest',style:'storybook',age:'6-8',dedication:'Dla odkrywców!',consent:true};
function setup(t,{legacy=false}={}){
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(root+'drizzle/'+migrations[0],'utf8'));
 const objects=new Map();
 if(legacy){
  const book={title:'Dawna książka',summary:'Przygoda dawnego bohatera.',character:'Syntetyczny bohater testowy.',scenes:Array.from({length:6},()=>({title:'Las',text:'Bohater odkrywa leśną ścieżkę.',imagePrompt:'A synthetic forest illustration.'}))};
  db.prepare('INSERT INTO orders (id,owner_hash,settings,status,book,generated,pdf_key,amount,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('00000000-0000-0000-0000-000000000001','owner',JSON.stringify(product),'ready',JSON.stringify(book),6,'old.pdf',2900,1,1);
  objects.set('old.pdf',new Uint8Array([37,80,68,70]));
 }
 for(const file of migrations.slice(1))db.exec(readFileSync(root+'drizzle/'+file,'utf8'));
 env.DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}};}};
 env.BUCKET={async put(key,bytes){objects.set(key,bytes);},async delete(key){objects.delete(key);},async get(key){const bytes=objects.get(key);return bytes?{body:bytes,async arrayBuffer(){return bytes.buffer;}}:null;}};
 Object.assign(env,{APP_URL:'http://localhost',DAILY_GENERATION_LIMIT:'0',SALES_ENABLED:'true',PRICE_CENTS:'2900',STRIPE_SECRET_KEY:'offline',STRIPE_WEBHOOK_SECRET:'offline',RESEND_API_KEY:'offline',EMAIL_FROM:'test@example.invalid'});
 delete env.OPENAI_API_KEY;
 const original=globalThis.fetch;const calls=[];
 const state={db,objects,calls,openai:0,session:null};
 globalThis.fetch=async(url,options)=>{
  if(new URL(url).hostname==='api.openai.com'){state.openai++;throw new Error('OpenAI blocked');}
  calls.push({url,options});
  if(url==='https://api.stripe.com/v1/checkout/sessions')return Response.json({id:'cs_offline',url:'https://checkout.stripe.com/c/pay/offline'});
  if(url==='https://api.stripe.com/v1/checkout/sessions/cs_offline')return Response.json(state.session);
  if(url==='https://api.resend.com/emails')return Response.json({id:'offline-email'});
  throw new Error('Network blocked: '+url);
 };
 t.after(()=>{globalThis.fetch=original;delete env.AI;delete env.PREVIEW_WORKERS_AI;delete env.PREVIEW_DAILY_NEURON_CAP;db.close();});
 state.row=()=>({...db.prepare('SELECT * FROM orders').get()});
 return state;
}
function request(path,options={}){return new Request('http://localhost'+path,{...options,headers:{origin:'http://localhost',...options.headers}});}
for(const pages of [8,15,30])test(`photo → sample → checkout uses no OpenAI (${pages} pages)`,async t=>{
 const s=setup(t);const body=new FormData();
 body.set('settings',JSON.stringify({...product,pages}));
 const bytes=new Uint8Array(128);bytes.set([137,80,78,71,13,10,26,10]);
 body.set('photo',new File([bytes],'synthetic.png',{type:'image/png'}));
 const uploaded=await api.upload(request('/api/orders',{method:'POST',body}));
 assert.equal(uploaded.status,201);const order=await uploaded.json();
 assert.equal(order.status,'awaiting_payment');assert.equal(order.samplePreview,true);
 assert.equal(order.title,product.title);assert.equal(order.dedication,product.dedication);
 assert.equal(api.view(s.row()).previewWorkersAi,false);
 assert.match(order.previewText,/Iskra/);assert.equal(order.generated,0);
 assert.equal(s.row().book,null);assert.equal(s.row().pdf_key,null);
 assert.equal(s.objects.size,1);assert.deepEqual(s.objects.get(s.row().photo_key),bytes);
 const cookie=uploaded.headers.get('set-cookie').split(';')[0],params=Promise.resolve({id:order.id});
 const preview=await api.preview(request(`/api/orders/${order.id}/preview`,{headers:{cookie}}),{params});
 assert.equal(preview.status,302);assert.equal(preview.headers.get('location'),order.sampleImage);
 assert.match(readFileSync(root+'public'+order.sampleImage,'utf8'),/<svg/);
 const checkout=await api.checkout(request(`/api/orders/${order.id}/checkout`,{method:'POST',headers:{cookie},body:JSON.stringify({email:'buyer@example.invalid',termsAccepted:true})}),{params});
 assert.equal(checkout.status,200);assert.match((await checkout.json()).url,/^https:\/\/checkout.stripe.com\//);
 assert.equal(s.calls.length,1);assert.equal(s.openai,0);
 assert.equal(s.calls[0].options.body.get('metadata[page_count]'),String(pages));
 const denied=await api.preview(request('/preview'),{params});assert.equal(denied.status,404);
 const download=await api.download(request('/download',{headers:{cookie}}),{params});assert.equal(download.status,403);
 // Confirmation without a PDF must succeed and wait for the verified webhook.
 s.session={id:'cs_offline',status:'complete',payment_status:'paid',amount_total:s.row().amount,currency:s.row().currency,mode:'payment',metadata:{orderId:order.id},client_reference_id:order.id,customer_details:{email:'buyer@example.invalid'}};
 await api.confirmAndDeliver(s.row());assert.equal(s.row().payment_verified_at,null);
 await api.confirmAndDeliver(s.row(),true);assert.equal(s.row().status,'paid');assert.ok(s.row().payment_verified_at);
 const verified=s.row().payment_verified_at;await api.confirmAndDeliver(s.row(),true);assert.equal(s.row().payment_verified_at,verified);
 assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,0);assert.equal(s.openai,0);
});
test('sample label, customer text and illustration render for every format/world/style',()=>{
 for(const format of ['comic','story','fairytale'])for(const world of ['forest','space','ocean','city','kingdom'])for(const style of ['storybook','comic','watercolor']){
  const sample=api.samplePreview({...product,format,world,style});
  const html=renderToStaticMarkup(React.createElement(api.ComicPreview,{order:{...product,...sample,format,id:'sample',sceneCount:6}}));
  assert.ok(html.includes(api.SAMPLE_PREVIEW_LABEL));assert.ok(html.includes(product.title));assert.ok(html.includes(product.dedication));assert.ok(html.includes('Iskra'));
  assert.ok(html.includes(sample.sampleImage));assert.match(readFileSync(root+'public'+sample.sampleImage,'utf8'),/<svg/);
 }
});
test('Workers AI preview falls back after quota exhaustion or inference failure without OpenAI',async t=>{
 for(const failure of ['limit','quota-error','inference']){
  const s=setup(t);env.PREVIEW_WORKERS_AI='true';env.PREVIEW_DAILY_NEURON_CAP=failure==='limit'?'0':'40';
  env.AI={async run(){if(failure==='inference')throw new Error('offline');return {image:new Uint8Array([1,2,3]).buffer};}};
  if(failure==='quota-error'){const prepare=env.DB.prepare;env.DB.prepare=sql=>sql.includes('preview_neuron_quotas')?{bind(){return{async first(){throw new Error('db offline');}};}}:prepare(sql);}
  const body=new FormData();body.set('settings',JSON.stringify(product));const bytes=new Uint8Array(128);bytes.set([137,80,78,71,13,10,26,10]);body.set('photo',new File([bytes],'synthetic.png',{type:'image/png'}));
  const upload=await api.upload(request('/api/orders',{method:'POST',body}));const order=await upload.json();const cookie=upload.headers.get('set-cookie').split(';')[0];
  const response=await api.preview(request(`/api/orders/${order.id}/preview`,{headers:{cookie}}),{params:Promise.resolve({id:order.id})});
  assert.equal(response.status,302);assert.equal(response.headers.get('location'),order.sampleImage);assert.equal(s.openai,0);
  delete env.AI;delete env.PREVIEW_WORKERS_AI;delete env.PREVIEW_DAILY_NEURON_CAP;
 }
});
test('Workers AI preview is opt-in and returns a low-quality sketch without OpenAI',async t=>{
 const s=setup(t);env.PREVIEW_WORKERS_AI='true';env.PREVIEW_DAILY_NEURON_CAP='40';env.AI={async run(model,input){s.aiArgs={model,input};return {image:'AQID'};}};
 const body=new FormData();body.set('settings',JSON.stringify(product));const bytes=new Uint8Array(128);bytes.set([137,80,78,71,13,10,26,10]);body.set('photo',new File([bytes],'synthetic.png',{type:'image/png'}));
 const upload=await api.upload(request('/api/orders',{method:'POST',body}));const order=await upload.json();const cookie=upload.headers.get('set-cookie').split(';')[0];
 const response=await api.preview(request(`/api/orders/${order.id}/preview`,{headers:{cookie}}),{params:Promise.resolve({id:order.id})});
 assert.equal(response.status,200);assert.equal(response.headers.get('X-Czytaki-Preview'),'low-quality-sketch');assert.equal(s.aiArgs.model,'@cf/black-forest-labs/flux-1-schnell');assert.equal(s.aiArgs.input.steps,4);assert.equal(s.openai,0);
 assert.equal(api.view(s.row()).previewWorkersAi,true);
 delete env.AI;delete env.PREVIEW_WORKERS_AI;delete env.PREVIEW_DAILY_NEURON_CAP;
});
test('prepayment import graph contains no AI client',()=>{
 assert.equal(Object.keys(compiled.metafile.inputs).some(p=>/lib\/server\/ai(?:-costs)?\.ts$/.test(p)),false);
});
test('migration preserves a legacy ready book and its checkout and delivery',async t=>{
 const s=setup(t,{legacy:true}),old=s.row();
 const view=api.view(old);assert.equal(view.title,'Dawna książka');assert.equal(view.samplePreview,undefined);
 assert.equal(old.status,'ready');assert.equal(old.generated,6);assert.equal(old.pdf_key,'old.pdf');assert.equal(old.payment_verified_at,null);
 // Use the actual checkout route after providing the matching owner session.
 const token=crypto.randomUUID()+'-'+crypto.randomUUID();
 const owner=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 s.db.prepare('UPDATE orders SET owner_hash=?').run(owner);
 const params=Promise.resolve({id:old.id}),cookie='czytaki_session='+token;
 const response=await api.checkout(request('/checkout',{method:'POST',headers:{cookie},body:JSON.stringify({email:'buyer@example.invalid',termsAccepted:true})}),{params});assert.equal(response.status,200);
 s.session={id:'cs_offline',status:'complete',payment_status:'paid',amount_total:2900,currency:'pln',mode:'payment',metadata:{orderId:old.id},client_reference_id:old.id,customer_details:{email:'buyer@example.invalid'}};
 await api.confirmAndDeliver(s.row(),true);
 assert.equal(s.row().status,'delivered');assert.equal(s.row().book,old.book);assert.equal(s.row().pdf_key,old.pdf_key);
 assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,1);
 const pdf=await api.download(request('/download',{headers:{cookie}}),{params});assert.equal(pdf.status,200);assert.equal(await pdf.text(),'%PDF');
});
