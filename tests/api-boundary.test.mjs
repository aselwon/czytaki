import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {apiResponse} from '../lib/api-response.ts';

const routes=(await readdir(new URL('../app/api/orders/',import.meta.url),{recursive:true})).filter(path=>path.endsWith('route.ts'));
const root=new URL('../',import.meta.url).pathname;
const runtimeSource=await readFile(new URL('../lib/server/runtime.ts',import.meta.url),'utf8');
const runtimeNames=[...runtimeSource.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(match=>match[1]);
for(const route of routes)test(`order route returns JSON on infrastructure exception: ${route}`,async()=>{
 const compiled=await build({entryPoints:[root+'app/api/orders/'+route],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'route-fault',setup(build){
  build.onResolve({filter:/(?:server\/runtime|\.\/runtime|cloudflare:workers|\.ttf\?inline)$/},args=>({path:args.path,namespace:'fault'}));
  build.onLoad({filter:/.*/,namespace:'fault'},args=>({contents:args.path.includes('.ttf')?'export default "data:font/ttf;base64,AA==";':args.path==='cloudflare:workers'?'export const env={};':[
   'export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}',
   ...runtimeNames.map(name=>name==='apiError'?'export const apiError=()=>Response.json({error:"Unavailable"},{status:503});':`export const ${name}=()=>{throw Error('Infrastructure unavailable');};`)
  ].join('\n')}));
 }}]});
 const handlers=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const url='https://example.test/api/orders/'+route.replace(/\/?route.ts$/,'').replaceAll('[id]','fixture').replaceAll('[page]','0');
 for(const [method,handle] of Object.entries(handlers)){
  const request=new Request(url,{method});
  const response=await apiResponse(request,()=>handle(request,{params:Promise.resolve({id:'fixture',page:'0'})}));
  assert.equal(response.status,503);assert.match(response.headers.get('content-type'),/application\/json/);
  assert.equal(typeof (await response.json()).error,'string');
 }
});
const compiled=await build({stdin:{contents:await readFile(new URL('../worker.ts',import.meta.url),'utf8'),resolveDir:new URL('../',import.meta.url).pathname,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'worker-stubs',setup(build){
 build.onResolve({filter:/fetch-handler|server\/(retention|test-checkout)$/},args=>({path:args.path,namespace:'stub'}));
 build.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path.includes('fetch-handler')?'export default {fetch:()=>globalThis.__workerResponse()};':args.path.includes('retention')?'export const cleanExpiredOrders=()=>{};':'export const testCheckoutEntry=async()=>null;'}));
}}]});
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('worker normalizes Next HTML 5xx and exceptions, preserving successful binary and page responses',async t=>{
 t.after(()=>delete globalThis.__workerResponse);
 for(const status of [500,502,503]){
  globalThis.__workerResponse=()=>new Response('<html>failed</html>',{status,headers:{'content-type':'text/html'}});
  const response=await worker.fetch(new Request('https://example.test/api/orders/fixture'));
  assert.equal(response.status,status);assert.equal(typeof (await response.json()).error,'string');
 }
 globalThis.__workerResponse=()=>{throw Error('Next failed');};
 assert.equal((await worker.fetch(new Request('https://example.test/api/config'))).status,503);
 for(const [path,status,type] of [['/api/orders/fixture/download',200,'application/pdf'],['/',502,'text/html'],['/api/config',503,'application/json']]){
  const original=new Response('body',{status,headers:{'content-type':type}});globalThis.__workerResponse=()=>original;
  assert.equal(await worker.fetch(new Request('https://example.test'+path)),original);
 }
});
