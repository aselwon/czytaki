import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {build} from 'esbuild';

const root=new URL('../',import.meta.url).pathname;
const env={};globalThis.__webhookEnv=env;
const bundled=await build({entryPoints:[root+'app/api/payments/webhook/route.ts'],bundle:true,write:false,platform:'node',format:'esm',tsconfig:root+'tsconfig.json',plugins:[{
 name:'offline-webhook',setup(build){
  build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'offline'}));
  build.onResolve({filter:/^@\/lib\/server\/payments$/},()=>({path:'delivery',namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},args=>({contents:args.path==='env'
   ?'export const env=globalThis.__webhookEnv;'
   :'export const confirmAndDeliver=async order=>globalThis.__webhookConfirm(order);'}));
 }
}]});
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const secret='whsec_offline_fixture',id='11111111-1111-4111-8111-111111111111';
function setup(){
 const calls={db:0,confirm:0};
 Object.assign(env,{STRIPE_WEBHOOK_SECRET:secret,BUCKET:{},DB:{prepare(){return {bind(){return {async first(){calls.db++;return {id,stripe_session:'cs_fixture'};}};}};}}});
 globalThis.__webhookConfirm=async order=>{assert.deepEqual(order,{id,stripe_session:'cs_fixture'});calls.confirm++;};
 const event={type:'checkout.session.completed',data:{object:{id:'cs_fixture',metadata:{orderId:id}}}};
 return {calls,event};
}
function request(event,{signed=true,stamp=Math.floor(Date.now()/1000),body=JSON.stringify(event)}={}){
 const headers={};
 if(signed)headers['stripe-signature']=`t=${stamp},v1=${createHmac('sha256',secret).update(stamp+'.'+body).digest('hex')}`;
 return new Request('https://shop.example/api/payments/webhook',{method:'POST',headers,body});
}
test('unsigned and stale webhook requests never reach orders or delivery',async()=>{
 const {calls,event}=setup();
 assert.equal((await POST(request(event,{signed:false}))).status,400);
 assert.equal((await POST(request(event,{stamp:Math.floor(Date.now()/1000)-600}))).status,400);
 assert.deepEqual(calls,{db:0,confirm:0});
});
test('signed unrelated events are acknowledged without touching orders',async()=>{
 const {calls,event}=setup();event.type='customer.created';
 assert.equal((await POST(request(event))).status,200);
 assert.deepEqual(calls,{db:0,confirm:0});
});
test('signed event for another Stripe session cannot trigger delivery',async()=>{
 const {calls,event}=setup();event.data.object.id='cs_another';
 assert.equal((await POST(request(event))).status,400);
 assert.deepEqual(calls,{db:1,confirm:0});
});
for(const type of ['checkout.session.completed','checkout.session.async_payment_succeeded'])test(`${type} forwards only the stored order to confirmation`,async()=>{
 const {calls,event}=setup();event.type=type;
 const r=await POST(request(event));
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{received:true});
 assert.deepEqual(calls,{db:1,confirm:1});
});
test('oversized webhook body is rejected before lookup or delivery',async()=>{
 const {calls,event}=setup();
 assert.equal((await POST(request(event,{body:'x'.repeat(262145)}))).status,413);
 assert.deepEqual(calls,{db:0,confirm:0});
});
test('missing webhook secret fails closed',async()=>{
 const {calls,event}=setup();delete env.STRIPE_WEBHOOK_SECRET;
 assert.equal((await POST(request(event))).status,503);
 assert.deepEqual(calls,{db:0,confirm:0});
});
