import test from 'node:test';
import assert from 'node:assert/strict';
import {request,requestGeneration,RequestError,unavailableMessage,rememberOrder,restoreOrder} from '../lib/client-request.ts';

test('HTML 502 and malformed JSON produce Polish recovery message, not SyntaxError',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 for(const headers of [{'content-type':'text/html'},{'content-type':'application/json'}]){
  globalThis.fetch=async()=>new Response('<!DOCTYPE html>',{status:502,headers});
  await assert.rejects(request('/api/orders/fixture'),error=>error instanceof RequestError&&error.message===unavailableMessage);
 }
 globalThis.fetch=async()=>Response.json({error:'Zajęte',retryAfter:120},{status:409});
 await assert.rejects(request('/api/orders/fixture/generate'),error=>error.retryAfter===120);
});
test('refresh restores only the order id and preserves URL parameters; explicit URL wins',t=>{
 const saved=new Map(),id='12345678-1234-1234-1234-123456789abc',other='aaaaaaaa-1234-1234-1234-123456789abc';
 for(const key of ['localStorage','location','history']){const prior=Object.getOwnPropertyDescriptor(globalThis,key);t.after(()=>{if(prior)Object.defineProperty(globalThis,key,prior);else delete globalThis[key];});}
 globalThis.localStorage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
 globalThis.location={href:'https://example.test/?checkout=success'};
 globalThis.history={replaceState:(_state,_title,url)=>{globalThis.location.href=String(url);}};
 rememberOrder(id);assert.deepEqual([...saved.values()],[id]);
 assert.equal(restoreOrder(),id);assert.equal(new URL(location.href).searchParams.get('order'),id);
 assert.equal(new URL(location.href).searchParams.get('checkout'),'success');
 location.href='https://example.test/?order='+other;assert.equal(restoreOrder(),other);
 location.href='https://example.test/';saved.set('czytaki.activeOrder','invalid');assert.equal(restoreOrder(),null);
 localStorage.getItem=()=>{throw Error('disabled');};assert.equal(restoreOrder(),null);
 localStorage.setItem=()=>{throw Error('disabled');};assert.doesNotThrow(()=>rememberOrder(id));
});

test('generation automatically retries only after the lease delay',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let calls=0;const messages=[];
 t.mock.method(globalThis,'fetch',async()=>++calls===1?Response.json({error:'Poczekaj',retryAfter:2},{status:409}):Response.json({generated:1}));
 const result=requestGeneration('/api/orders/fixture/generate',message=>messages.push(message));
 // Flush response.json() before advancing the fake timer.
 while(messages.length===0)await new Promise(resolve=>setImmediate(resolve));
 t.mock.timers.tick(1999);assert.equal(calls,1);
 t.mock.timers.tick(1);assert.deepEqual(await result,{generated:1});
 assert.equal(calls,2);assert.deepEqual(messages,['Poczekaj','']);
});
