import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const calls=[];
globalThis.__checkoutConsentCalls=calls;
const compiled=await build({entryPoints:[new URL('../app/api/orders/[id]/checkout/route.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm',plugins:[{
 name:'offline-checkout',setup(build){
  build.onResolve({filter:/^@\/lib\/consent$/},()=>({path:new URL('../lib/consent.ts',import.meta.url).pathname}));
  build.onResolve({filter:/^@\/lib\/server\/(runtime|payments)$/},args=>({path:args.path.split('/').pop(),namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},args=>({contents:args.path==='payments'
   ?'export async function checkoutSession(order,email){globalThis.__checkoutConsentCalls.push({order,email});return "https://checkout.stripe.com/fixture";}'
   :`export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
     export const apiError=e=>Response.json({error:e.message},{status:e.status||500});
     export const sameOrigin=()=>{};
     export const ownOrder=async()=>({id:'fixture'});
     export const findOrder=async id=>({id});
     export const boundedBytes=async req=>new Uint8Array(await req.arrayBuffer());
     export const infrastructure=()=>({DB:{prepare:sql=>({bind:(...args)=>({run:async()=>{globalThis.__checkoutConsentCalls.push(sql);globalThis.__checkoutConsentBinds?.push(args);return {meta:{changes:1}};}})})}});`}));
 }
}]});
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function request(body){return POST(new Request('https://example.invalid/api/orders/fixture/checkout',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({id:'fixture'})});}
for(const value of [undefined,false,'true',1,null,{},[]])test(`checkout rejects consent ${JSON.stringify(value)} before payment or mutation`,async()=>{
 calls.length=0;
 const response=await request({email:'buyer@example.invalid',termsAccepted:value,digitalConsent:true});
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/Zaakceptuj regulamin/);
 assert.deepEqual(calls,[]);
});
for(const value of [undefined,false,'true',1,null,{},[]])test(`checkout rejects digital-content consent ${JSON.stringify(value)} before payment or mutation`,async()=>{
 calls.length=0;
 const response=await request({email:'buyer@example.invalid',termsAccepted:true,digitalConsent:value});
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/odstąpienie od umowy/);
 assert.deepEqual(calls,[]);
});
test('both consents permit checkout, are stored with a version and release the lock',async()=>{
 calls.length=0;const binds=globalThis.__checkoutConsentBinds=[];
 const response=await request({email:'buyer@example.invalid',termsAccepted:true,digitalConsent:true});
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{url:'https://checkout.stripe.com/fixture'});
 assert.equal(calls.length,4);
 assert.match(calls[0],/UPDATE orders SET lock_token=/);
 assert.match(calls[1],/SET terms_accepted_at=\?,digital_consent_at=\?,consent_version=\?/);
 assert.equal(typeof binds[1][0],'number');
 assert.equal(binds[1][0],binds[1][1]);
 assert.match(binds[1][2],/^\d{4}-\d{2}-\d{2}$/);
 assert.deepEqual(calls[2],{order:{id:'fixture'},email:'buyer@example.invalid'});
 assert.match(calls[3],/SET lock_token=NULL/);
 delete globalThis.__checkoutConsentBinds;
});
test('terms acceptance does not bypass email validation',async()=>{
 calls.length=0;
 assert.equal((await request({email:'invalid',termsAccepted:true,digitalConsent:true})).status,400);
 assert.deepEqual(calls,[]);
});
