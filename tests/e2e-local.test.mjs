import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {PDFDocument} from 'pdf-lib';
import jpeg from 'jpeg-js';

const root=new URL('../',import.meta.url).pathname;
const secret='whsec_e2e_fixture';
const env={};
globalThis.__e2e={env};
const routes=[
 ['create','app/api/orders/route.ts'],
 ['preview','app/api/orders/[id]/preview/route.ts'],
 ['checkout','app/api/orders/[id]/checkout/route.ts'],
 ['webhook','app/api/payments/webhook/route.ts'],
 ['generate','app/api/orders/[id]/generate/route.ts'],
];
const modules={};
for(const [name,path] of routes){
 const result=await build({entryPoints:[root+path],bundle:true,write:false,platform:'node',format:'esm',tsconfig:root+'tsconfig.json',plugins:[{
  name:'local-worker-fixtures',setup(build){
   build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'fixture'}));
   build.onResolve({filter:/^@\/lib\/server\/ai$/},()=>({path:'ai',namespace:'fixture'}));
   build.onResolve({filter:/^@\/lib\/server\/pdf$/},()=>({path:'pdf',namespace:'fixture'}));
   build.onResolve({filter:/\.ttf\?inline$/},()=>({path:'font',namespace:'fixture'}));
   build.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:root,contents:{
    env:'export const env=globalThis.__e2e.env;',
    ai:'export const generateBook=async(id,p)=>{globalThis.__e2e.aiCalls++;return globalThis.__e2e.book(p);}; export const generateIllustration=async()=>{globalThis.__e2e.aiCalls++;return globalThis.__e2e.image;}; export const locateComicSpeech=async()=>[];',
    pdf:'export const createBookPdf=(...args)=>globalThis.__e2e.createPdf(...args);',
    font:'export default "data:font/ttf;base64,AA==";'
   }[args.path]}));
  }
 }]});
 modules[name]=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}

test('purchase flow uses signed webhook, creates an 8-page PDF and emails its attachment',async t=>{
 const db=new DatabaseSync(':memory:');
 for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort()){
  const sql=await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8');
  db.exec(sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).join(';'));
 }
 // Deterministic synthetic pixels: no photographs or large marketing assets.
 const pixels=Uint8Array.from({length:32*32*4},(_,i)=>i%4===3?255:(i*37)%256);
 const objects=new Map(),image=new Uint8Array(jpeg.encode({data:pixels,width:32,height:32},60).data);
 const state={image,emails:[],aiCalls:0,session:null};
 const DB={prepare(sql){return{bind(...values){return{
  async first(){return db.prepare(sql).get(...values);},
  async run(){const result=db.prepare(sql).run(...values);return{meta:{changes:Number(result.changes)}};},
  async all(){return{results:db.prepare(sql).all(...values)}}
 };}};}};
 const BUCKET={async put(key,value){objects.set(key,new Uint8Array(value));},async get(key){const bytes=objects.get(key);return bytes?{body:new Blob([bytes]).stream(),async arrayBuffer(){return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}}:null;},async delete(key){objects.delete(key);}};
 Object.assign(env,{DB,BUCKET,APP_URL:'http://127.0.0.1',PRICE_CENTS:'2900',SALES_ENABLED:'true',STRIPE_WEBHOOK_SECRET:secret,STRIPE_SECRET_KEY:'stripe_fixture',RESEND_API_KEY:'resend_fixture',EMAIL_FROM:'Czytaki <test@example.test>',OPENAI_API_KEY:'openai_fixture',DAILY_GENERATION_LIMIT:'0'});
 state.env=env;
 state.book=p=>({title:'Leśna przygoda',summary:'Historia testowa.',character:'A forest explorer.',scenes:Array.from({length:p.pages-2},(_,i)=>({title:`Rozdział ${i+1}`,text:'Bohater odkrywa leśną ścieżkę.',imagePrompt:'A friendly forest adventure.'}))});
 const font=new Uint8Array(await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url)));
 state.createPdf=async(book,p,images)=>{const {createBookPdf}=await import('../lib/server/pdf.ts');return createBookPdf(book,p,images,font);};
 globalThis.__e2e=state;
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(input,init={})=>{
  const url=new URL(input instanceof Request?input.url:input);
  if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return originalFetch(input,init);
  if(url.href==='https://api.stripe.com/v1/checkout/sessions'){
   const data=init.body;
   state.session={id:'cs_fixture',status:'complete',payment_status:'paid',mode:'payment',amount_total:Number(data.get('line_items[0][price_data][unit_amount]')),currency:data.get('line_items[0][price_data][currency]'),metadata:{orderId:data.get('metadata[orderId]')},client_reference_id:data.get('client_reference_id'),customer_details:{email:data.get('customer_email')}};
   return Response.json({id:'cs_fixture',url:'https://checkout.stripe.com/cs_fixture'});
  }
  if(url.href==='https://api.stripe.com/v1/checkout/sessions/cs_fixture')return Response.json(state.session);
  if(url.href==='https://api.resend.com/emails'){
   const message=JSON.parse(init.body);state.emails.push(message);return Response.json({id:'email_fixture'});
  }
  throw new Error(`Blocked non-local network request: ${url.origin}`);
 };
 for(const destination of ['https://example.invalid/','https://api.openai.com/v1/responses','http://127.0.0.1.example.invalid/']){
  await assert.rejects(globalThis.fetch(destination),/Blocked non-local network request/);
 }
 // Both transports dispatch the same built route handlers. No test is skipped
 // when the sandbox forbids listening on a local socket.
 const dispatch=async request=>{
  const path=new URL(request.url).pathname;
  if(path==='/api/orders')return modules.create.POST(request);
  if(path==='/api/payments/webhook')return modules.webhook.POST(request);
  const match=path.match(/^\/api\/orders\/([^/]+)\/(preview|checkout|generate)$/);
  if(!match)return new Response('Not found',{status:404});
  return modules[match[2]][request.method](request,{params:Promise.resolve({id:match[1]})});
 };
 const server=createServer(async(req,res)=>{
  try{
   const body=[];for await(const part of req)body.push(part);
   const response=await dispatch(new Request(`http://127.0.0.1:${server.address().port}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(body)}));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end(String(error));}
 });
 t.after(async()=>{globalThis.fetch=originalFetch;delete globalThis.__e2e;if(server.listening)await new Promise(resolve=>server.close(resolve));db.close();});
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});}
 catch(error){if(error.code!=='EPERM')throw error;t.diagnostic('Port blocked: exercising bundled handlers through Request/Response transport.');}
 const base=server.listening?`http://127.0.0.1:${server.address().port}`:'http://127.0.0.1';env.APP_URL=base;
 const client=async(path,init)=>server.listening?globalThis.fetch(base+path,{redirect:'manual',...init}):dispatch(new Request(base+path,init));
 const form=new FormData();form.set('settings',JSON.stringify({name:'Maja',subject:'child',format:'fairytale',pages:8,world:'forest',style:'storybook',age:'6-8',dedication:'Dla Mai.',consent:true}));form.set('photo',new Blob([image],{type:'image/jpeg'}),'synthetic.jpg');
 const created=await client('/api/orders',{method:'POST',headers:{origin:base},body:form});assert.equal(created.status,201);
 const order=await created.json(),cookie=created.headers.get('set-cookie').split(';')[0];
 const preview=await client(`/api/orders/${order.id}/preview`,{headers:{cookie}});assert.equal(preview.status,302);assert.equal(preview.headers.get('location'),order.sampleImage);
 assert.match(await readFile(new URL('../public'+order.sampleImage,import.meta.url),'utf8'),/<svg/);
 const checkout=await client(`/api/orders/${order.id}/checkout`,{method:'POST',headers:{origin:base,cookie,'content-type':'application/json'},body:JSON.stringify({email:'reader@example.test',termsAccepted:true})});assert.equal(checkout.status,200);assert.equal((await checkout.json()).url,'https://checkout.stripe.com/cs_fixture');
 assert.equal(state.aiCalls,0);
 const denied=await client(`/api/orders/${order.id}/generate`,{method:'POST',headers:{origin:base,cookie}});assert.equal(denied.status,403);
 const event=JSON.stringify({type:'checkout.session.completed',data:{object:{id:'cs_fixture',metadata:{orderId:order.id}}}}),stamp=Math.floor(Date.now()/1000),signature=createHmac('sha256',secret).update(`${stamp}.${event}`).digest('hex');
 const unsigned=await client('/api/payments/webhook',{method:'POST',body:event});assert.equal(unsigned.status,400);
 assert.equal(db.prepare('SELECT payment_status FROM orders WHERE id=?').get(order.id).payment_status,'unpaid');
 const webhook=await client('/api/payments/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':`t=${stamp},v1=${signature}`},body:event});assert.equal(webhook.status,200);
 for(let i=0;i<8;i++){const generated=await client(`/api/orders/${order.id}/generate`,{method:'POST',headers:{origin:base,cookie}});assert.equal(generated.status,200,await generated.text());}
 const row=db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);assert.equal(row.status,'assembled');assert.equal(state.aiCalls,7);assert.equal(row.photo_key,null);
 const pdf=await PDFDocument.load(objects.get(row.pdf_key));assert.equal(pdf.getPageCount(),8);
 const sent=await client('/api/payments/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':`t=${stamp},v1=${signature}`},body:event});assert.equal(sent.status,200);
 assert.equal(state.emails.length,1);assert.equal(state.emails[0].to[0],'reader@example.test');
 const attachment=Buffer.from(state.emails[0].attachments[0].content,'base64'),attachedPdf=await PDFDocument.load(attachment);assert.equal(attachedPdf.getPageCount(),8);assert.deepEqual(attachment,Buffer.from(objects.get(row.pdf_key)));
 const retried=await client('/api/payments/webhook',{method:'POST',headers:{'stripe-signature':`t=${stamp},v1=${signature}`},body:event});assert.equal(retried.status,200);assert.equal(state.emails.length,1);
 assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'delivered');
});
