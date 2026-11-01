import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const calls=[];
globalThis.__checkoutConsentCalls=calls;
const compiled=await build({entryPoints:[new URL('../app/api/orders/[id]/checkout/route.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm',plugins:[{
 name:'offline-checkout',setup(build){
  build.onResolve({filter:/^@\/lib\/server\/(runtime|payments)$/},args=>({path:args.path.split('/').pop(),namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},args=>({contents:args.path==='payments'
   ?'export async function checkoutSession(order,email){globalThis.__checkoutConsentCalls.push({order,email});return "https://checkout.stripe.com/fixture";}'
   :`export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
     export const apiError=e=>Response.json({error:e.message},{status:e.status||500});
     export const sameOrigin=()=>{};
     export const ownOrder=async()=>({id:'fixture'});
     export const findOrder=async id=>({id});
     export const boundedBytes=async req=>new Uint8Array(await req.arrayBuffer());
     export const infrastructure=()=>({DB:{prepare:sql=>({bind:()=>({run:async()=>{globalThis.__checkoutConsentCalls.push(sql);return {meta:{changes:1}};}})})}});`}));
 }
}]});
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function request(body){return POST(new Request('https://example.invalid/api/orders/fixture/checkout',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({id:'fixture'})});}
for(const value of [undefined,false,'true',1,null,{},[]])test(`checkout rejects consent ${JSON.stringify(value)} before payment or mutation`,async()=>{
 calls.length=0;
 const response=await request({email:'buyer@example.invalid',termsAccepted:value});
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/Zaakceptuj regulamin/);
 assert.deepEqual(calls,[]);
});
test('explicit terms acceptance permits checkout and releases its lock',async()=>{
 calls.length=0;
 const response=await request({email:'buyer@example.invalid',termsAccepted:true});
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{url:'https://checkout.stripe.com/fixture'});
 assert.equal(calls.length,3);
 assert.match(calls[0],/UPDATE orders SET lock_token=/);
 assert.deepEqual(calls[1],{order:{id:'fixture'},email:'buyer@example.invalid'});
 assert.match(calls[2],/SET lock_token=NULL/);
});
test('terms acceptance does not bypass email validation',async()=>{
 calls.length=0;
 assert.equal((await request({email:'invalid',termsAccepted:true})).status,400);
 assert.deepEqual(calls,[]);
});
