import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const env={};globalThis.__testCheckoutEnv=env;
const root=new URL('../',import.meta.url).pathname;
const bundle=await build({stdin:{contents:`
 export {default as worker} from './worker';
 export {GET as config} from './app/api/config/route';
 export {POST as checkout} from './app/api/orders/[id]/checkout/route';
 export {hash} from './lib/server/runtime';
`,resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',plugins:[{
 name:'offline',setup(build){
  build.onResolve({filter:/^(cloudflare:workers|vinext\/server\/fetch-handler)$/},args=>({path:args.path,namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},args=>({contents:args.path==='cloudflare:workers'?'export const env=globalThis.__testCheckoutEnv;':'export default {fetch:()=>new Response("page")};'}));
 }
}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const id='11111111-1111-4111-8111-111111111111',owner='a'.repeat(73);
const fixture='synthetic-checkout-token-for-offline-tests';
function request(path,cookie='',options={}){
 return new Request('https://shop.example'+path,{...options,headers:{origin:'https://shop.example',cookie,...options.headers}});
}
async function setup(t){
 for(const name of Object.keys(env))delete env[name];
 const row={id,owner_hash:await api.hash(owner),status:'draft',payment_status:'unpaid',email:null,stripe_session:null,book:null,amount:2900,currency:'pln',settings:JSON.stringify({name:'Iskra',subject:'pet',format:'comic',pages:8,world:'forest',style:'storybook',age:'6-8',dedication:'',consent:true})};
 Object.assign(env,{SALES_ENABLED:'false',TEST_CHECKOUT_TOKEN:fixture,STRIPE_SECRET_KEY:'sk_test_offline',STRIPE_WEBHOOK_SECRET:'offline',RESEND_API_KEY:'offline',EMAIL_FROM:'test@example.invalid',APP_URL:'https://shop.example',PRICE_CENTS:'2900',BUCKET:{},DB:{prepare(){return {bind(){return {async first(){return row;},async run(){return {meta:{changes:1}};}};}};}}});
 const calls=[];const original=globalThis.fetch;
 globalThis.fetch=async(url)=>{assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');calls.push(url);return Response.json({id:'cs_test_offline',url:'https://checkout.stripe.com/c/pay/offline'});};
 t.after(()=>{globalThis.fetch=original;});
 return {calls,row};
}
async function entry(token=fixture){return api.worker.fetch(request('/?keep=1&test_checkout='+encodeURIComponent(token)));}
async function cookie(){return (await entry()).headers.get('set-cookie').split(';')[0];}
async function checkAccess(expected,c=''){
 const config=await api.config(request('/api/config',c));
 assert.equal((await config.json()).checkout,expected);
 assert.equal(config.headers.get('cache-control'),'no-store');
 const response=await api.checkout(request(`/api/orders/${id}/checkout`,`czytaki_session=${owner}; ${c}`,{method:'POST',body:JSON.stringify({email:'buyer@example.invalid',termsAccepted:true})}),{params:Promise.resolve({id})});
 assert.equal(response.status,expected?200:503);
 if(expected)assert.equal((await response.json()).url,'https://checkout.stripe.com/c/pay/offline');
}
test('disabled public sales reject config and checkout without a cookie',async t=>{
 const s=await setup(t);await checkAccess(false);assert.equal(s.calls.length,0);
});
test('valid test cookie enables config and the real checkout route with mocked Stripe',async t=>{
 const s=await setup(t);await checkAccess(true,await cookie());assert.equal(s.calls.length,1);
 assert.equal(s.row.payment_status,'unpaid');assert.equal(s.row.payment_verified_at,undefined);
});
for(const variant of ['live','missing secret','wrong token','forged cookie','expired cookie','rotated secret','malformed cookie'])test(`test checkout denies ${variant}`,async t=>{
 const s=await setup(t);let c=await cookie();
 if(variant==='live')env.STRIPE_SECRET_KEY='sk_live_offline';
 if(variant==='missing secret')delete env.TEST_CHECKOUT_TOKEN;
 if(variant==='wrong token') {assert.equal((await entry('incorrect')).headers.get('set-cookie'),null);c='';}
 if(variant==='forged cookie')c=c.slice(0,-1)+(c.endsWith('0')?'1':'0');
 if(variant==='malformed cookie')c='__Host-czytaki_test_checkout=broken';
 if(variant==='rotated secret')env.TEST_CHECKOUT_TOKEN='different-synthetic-token';
 if(variant==='expired cookie'){
  const original=Date.now;Date.now=()=>original()-25*60*60*1000;
  try{c=await cookie();}finally{Date.now=original;}
 }
 await checkAccess(false,c);assert.equal(s.calls.length,0);
 if(['live','missing secret'].includes(variant))assert.equal((await entry()).headers.get('set-cookie'),null);
});
for(const field of ['STRIPE_WEBHOOK_SECRET','RESEND_API_KEY','EMAIL_FROM','APP_URL','PRICE_CENTS'])test(`test cookie still requires ${field}`,async t=>{
 const s=await setup(t);const c=await cookie();delete env[field];await checkAccess(false,c);assert.equal(s.calls.length,0);
});
test('entry strips all token parameters, avoids caching/referrers and sets secure expiring cookie',async t=>{
 await setup(t);const response=await entry();
 assert.equal(response.status,303);assert.equal(response.headers.get('location'),'https://shop.example/?keep=1');
 assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.match(response.headers.get('cache-control'),/no-store/);
 const header=response.headers.get('set-cookie');
 assert.match(header,/^__Host-czytaki_test_checkout=\d{13}\.[a-f0-9]{64};/);
 for(const flag of ['Path=/','HttpOnly','Secure','SameSite=Lax','Max-Age=86400'])assert.ok(header.includes(flag));
 assert.ok(!header.includes(fixture));assert.equal(await response.text(),'');
 const duplicate=await api.worker.fetch(request('/?test_checkout=bad&test_checkout=bad&keep=1'));
 assert.equal(duplicate.headers.get('location'),'https://shop.example/?keep=1');assert.equal(duplicate.headers.get('set-cookie'),null);
 assert.equal(await (await api.worker.fetch(request('/'))).text(),'page');
});
test('public enabled sales retain normal checkout without test secret or cookie',async t=>{
 const s=await setup(t);env.SALES_ENABLED='true';env.STRIPE_SECRET_KEY='sk_live_offline';delete env.TEST_CHECKOUT_TOKEN;
 await checkAccess(true);assert.equal(s.calls.length,1);
});
