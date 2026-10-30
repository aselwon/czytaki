import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

// Bundle the real payment implementation; replace only its environment boundary.
// Every fetch is intercepted. This suite never reads .env or calls providers.
const compiled=await build({entryPoints:[new URL('../lib/server/payments.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm',plugins:[{
 name:'offline-payment-runtime',setup(build){
  build.onResolve({filter:/^\.\/runtime$/},()=>({path:'runtime',namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:`
   export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
   export const runtime=()=>globalThis.__deliveryTest.env;
   export const infrastructure=runtime;
   export const findOrder=async id=>globalThis.__deliveryTest.order(id);
   export const salesReady=()=>true;
   export const settings=r=>JSON.parse(r.settings);
   export const story=r=>r.book?JSON.parse(r.book):null;
  `}));
 }
}]});
const {deliver,confirmAndDeliver,checkoutSession}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

function setup(t,overrides={}){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE orders (id TEXT PRIMARY KEY,payment_status TEXT,pdf_key TEXT,email TEXT,
 delivery_status TEXT,email_attempt_at INTEGER,updated_at INTEGER,email_id TEXT,
 stripe_session TEXT,amount INTEGER,currency TEXT,status TEXT,settings TEXT,book TEXT)`);
 const row={id:'test-order',payment_status:'paid',pdf_key:'test.pdf',email:'test@example.invalid',delivery_status:'pending',email_attempt_at:null,updated_at:0,email_id:null,stripe_session:'cs_test_fixture',amount:3900,currency:'pln',status:'ready',settings:JSON.stringify({pages:15}),book:JSON.stringify({title:'Testowa przygoda'}),...overrides};
 db.prepare(`INSERT INTO orders (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(()=>'?').join(',')})`).run(...Object.values(row));
 const order=()=>({...db.prepare('SELECT * FROM orders WHERE id=?').get(row.id)});
 const calls=[];
 const session={id:row.stripe_session,status:'complete',payment_status:'paid',amount_total:3900,currency:'pln',mode:'payment',metadata:{orderId:row.id},client_reference_id:row.id,customer_details:{email:'test@example.invalid'}};
 const state={calls,order,session,failEmail:false,missingPdf:false,checkoutUrl:'https://checkout.stripe.com/c/pay/test'};
 const env={APP_URL:'https://shop.example',STRIPE_SECRET_KEY:'fake-offline-key',RESEND_API_KEY:'fake-offline-key',EMAIL_FROM:'test@example.invalid',
  DB:{
   prepare(sql){
    return {bind(...params){
     return {async run(){
      const result=db.prepare(sql).run(...params);
      return {meta:{changes:Number(result.changes)}};
     }};
    }};
   }
  },
  BUCKET:{async get(){return state.missingPdf?null:{async arrayBuffer(){return new TextEncoder().encode('offline pdf fixture').buffer;}};}}
 };
 const originalFetch=globalThis.fetch;
 globalThis.__deliveryTest={env,order};
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  if(url==='https://api.stripe.com/v1/checkout/sessions/cs_test_fixture')return Response.json(session);
  if(url==='https://api.stripe.com/v1/checkout/sessions')return Response.json({id:'cs_created',url:state.checkoutUrl});
  if(url==='https://api.resend.com/emails')return state.failEmail?new Response('',{status:503}):Response.json({id:'email_test_fixture'});
  throw new Error('Unexpected external request blocked: '+url);
 };
 t.after(()=>{globalThis.fetch=originalFetch;delete globalThis.__deliveryTest;db.close();});
 state.emails=()=>calls.filter(call=>call.url==='https://api.resend.com/emails');
 return state;
}

test('checkout uses stored price, currency, page count and order metadata',async t=>{
 const s=setup(t,{payment_status:'unpaid',stripe_session:null,email:null,amount:6500,settings:JSON.stringify({pages:30})});
 assert.equal(await checkoutSession(s.order(),'buyer@example.invalid'),s.checkoutUrl);
 const data=s.calls[0].options.body;
 assert.equal(data.get('line_items[0][price_data][unit_amount]'),'6500');
 assert.equal(data.get('line_items[0][price_data][currency]'),'pln');
 assert.equal(data.get('metadata[page_count]'),'30');
 assert.equal(data.get('metadata[orderId]'),'test-order');
 assert.equal(data.get('customer_email'),'buyer@example.invalid');
 assert.equal(s.order().email,'buyer@example.invalid');
 assert.equal(s.order().stripe_session,'cs_created');
 assert.equal(s.calls[0].options.headers['Idempotency-Key'],'czytaki-checkout-test-order-first');
});
test('checkout reuses an open session without creating another payment',async t=>{
 const s=setup(t,{payment_status:'unpaid'});s.session.status='open';s.session.url=s.checkoutUrl;
 assert.equal(await checkoutSession(s.order(),s.order().email),s.checkoutUrl);
 assert.equal(s.calls.length,1);assert.equal(s.calls[0].options.method,'GET');
});
for(const patch of [{payment_status:'paid'},{status:'generating'},{pdf_key:null},{email:'another@example.invalid'}])test('checkout blocks invalid order state '+JSON.stringify(patch),async t=>{
 const s=setup(t,{payment_status:'unpaid',...patch});
 await assert.rejects(checkoutSession(s.order(),'test@example.invalid'),{status:409});
 assert.equal(s.calls.length,0);
});
test('expired checkout creates a replacement with a distinct idempotency key',async t=>{
 const s=setup(t,{payment_status:'unpaid'});s.session.status='expired';
 await checkoutSession(s.order(),s.order().email);
 assert.equal(s.calls.length,2);
 assert.equal(s.calls[1].options.headers['Idempotency-Key'],'czytaki-checkout-test-order-cs_test_fixture');
 assert.equal(s.order().stripe_session,'cs_created');
});
test('checkout rejects a redirect outside the Stripe checkout host',async t=>{
 const s=setup(t,{payment_status:'unpaid',stripe_session:null});s.checkoutUrl='https://attacker.invalid/pay';
 await assert.rejects(checkoutSession(s.order(),s.order().email),{status:503});
 assert.equal(s.order().stripe_session,null);
});

test('unpaid orders cannot trigger PDF delivery',async t=>{
 const s=setup(t,{payment_status:'unpaid'});
 await assert.rejects(deliver(s.order()),{status:409});
 assert.equal(s.calls.length,0);
});
test('concurrent delivery calls claim one send and replay does not send again',async t=>{
 const s=setup(t),snapshot=s.order();
 await Promise.all([deliver(snapshot),deliver(snapshot),deliver(snapshot)]);
 await deliver(s.order());
 assert.equal(s.emails().length,1);
 assert.equal(s.order().delivery_status,'sent');
 assert.equal(s.order().email_id,'email_test_fixture');
});
test('failed delivery can retry using the same provider idempotency key',async t=>{
 const s=setup(t);s.failEmail=true;
 await assert.rejects(deliver(s.order()),{status:503});
 const attempted=s.order().email_attempt_at;
 assert.equal(s.order().delivery_status,'failed');
 s.failEmail=false;await deliver(s.order());
 assert.equal(s.order().email_attempt_at,attempted);
 assert.equal(s.emails().length,2);
 assert.equal(s.emails()[0].options.headers['Idempotency-Key'],s.emails()[1].options.headers['Idempotency-Key']);
 assert.equal(s.order().delivery_status,'sent');
});
test('payment confirmation replay marks paid and sends only once',async t=>{
 const s=setup(t,{payment_status:'unpaid'});
 await confirmAndDeliver(s.order());
 await confirmAndDeliver(s.order());
 assert.equal(s.order().payment_status,'paid');
 assert.equal(s.emails().length,1);
});
test('wrong payment amount never unlocks or sends the PDF',async t=>{
 const s=setup(t,{payment_status:'unpaid'});s.session.amount_total=1;
 await assert.rejects(confirmAndDeliver(s.order()),{status:409});
 assert.equal(s.order().payment_status,'unpaid');
 assert.equal(s.emails().length,0);
});
test('missing stored PDF fails safely and can resume when restored',async t=>{
 const s=setup(t);s.missingPdf=true;
 await assert.rejects(deliver(s.order()),{status:503});
 assert.equal(s.emails().length,0);
 assert.equal(s.order().delivery_status,'failed');
 s.missingPdf=false;await deliver(s.order());
 assert.equal(s.emails().length,1);
});
test('delivery outside retry safety window requires manual reconciliation',async t=>{
 const s=setup(t,{email_attempt_at:Date.now()-24*60*60*1000,delivery_status:'failed'});
 await assert.rejects(deliver(s.order()),{status:503});
 assert.equal(s.calls.length,0);
});
test('active delivery claim is respected and expired claim can resume',async t=>{
 const s=setup(t,{delivery_status:'sending',updated_at:Date.now()-61000,email_attempt_at:Date.now()-61000});
 await deliver(s.order());
 assert.equal(s.emails().length,1);
 assert.equal(s.order().delivery_status,'sent');
});
test('fresh in-progress claim does not trigger another provider request',async t=>{
 const s=setup(t,{delivery_status:'sending',updated_at:Date.now(),email_attempt_at:Date.now()});
 await deliver(s.order());
 assert.equal(s.emails().length,0);
 assert.equal(s.order().delivery_status,'sending');
});
test('mail failure preserves paid status and subsequent confirmation resumes delivery',async t=>{
 const s=setup(t,{payment_status:'unpaid'});s.failEmail=true;
 await assert.rejects(confirmAndDeliver(s.order()),{status:503});
 assert.equal(s.order().payment_status,'paid');
 assert.equal(s.order().delivery_status,'failed');
 s.failEmail=false;await confirmAndDeliver(s.order());
 assert.equal(s.order().payment_status,'paid');
 assert.equal(s.order().delivery_status,'sent');
});
