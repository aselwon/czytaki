import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const root=new URL('../',import.meta.url).pathname;
const bundled=await build({stdin:{contents:`
 export {GET as download} from './app/api/orders/[id]/download/route.ts';
 export {GET as adminDownload} from './app/api/admin/orders/[id]/download/route.ts';
 export {POST as adminLogin} from './app/api/admin/session/route.ts';
 export {adminCookie} from './lib/server/admin.ts';
 export {hash,boundedBytes} from './lib/server/runtime.ts';
`,resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',tsconfig:root+'tsconfig.json',plugins:[{
 name:'offline-cloudflare',setup(build){
  build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:'export const env=globalThis.__accessTestEnv;'}));
 }
}]});
const env={};globalThis.__accessTestEnv=env;
const {download,adminDownload,adminCookie,adminLogin,hash,boundedBytes}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const id='11111111-1111-4111-8111-111111111111';
const owner='a'.repeat(73),stranger='b'.repeat(73);
test('bounded body reader rejects chunked data exceeding the editor limit without a size header',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(200001));},cancel(){cancelled=true;}});
 const req=new Request('https://shop.example/layout',{method:'POST',body:stream,duplex:'half'});
 assert.equal(req.headers.get('content-length'),null);
 await assert.rejects(boundedBytes(req,400000),{status:413});
 assert.equal(cancelled,true);
});
test('bounded body reader accepts exactly the configured byte limit',async()=>{
 const req=new Request('https://shop.example/layout',{method:'POST',body:new Uint8Array(400000)});
 assert.equal((await boundedBytes(req,400000)).length,400000);
});
async function setup(){
 const row={id,owner_hash:await hash(owner),payment_status:'paid',pdf_key:'private/test.pdf'};
 const calls={bucket:0,db:0};
 Object.assign(env,{APP_URL:'https://shop.example',SALES_ENABLED:'true',ADMIN_PASSWORD:'offline-test-password-not-a-real-secret',
  DB:{prepare(){return {bind(){return {async first(){calls.db++;return row;}};}};}},
  BUCKET:{async get(){calls.bucket++;return {body:new TextEncoder().encode('test pdf')};}}
 });
 const request=(cookie='',base=env.APP_URL)=>new Request(base+'/api/orders/'+id+'/download?view=1',{headers:cookie?{cookie}:{}});
 const run=cookie=>download(request(cookie),{params:Promise.resolve({id})});
 return {row,calls,request,run};
}
test('knowing an order ID without a cookie cannot read its PDF',async()=>{
 const s=await setup(),r=await s.run('');
 assert.equal(r.status,404);assert.equal(s.calls.db,0);assert.equal(s.calls.bucket,0);
});
test('another valid-looking session cannot read a paid PDF',async()=>{
 const s=await setup(),r=await s.run('czytaki_session='+stranger);
 assert.equal(r.status,404);assert.equal(s.calls.bucket,0);
});
test('owner can read paid PDF with private no-store response',async()=>{
 const s=await setup(),r=await s.run('czytaki_session='+owner);
 assert.equal(r.status,200);assert.equal(s.calls.bucket,1);
 assert.equal(r.headers.get('content-type'),'application/pdf');
 assert.match(r.headers.get('cache-control'),/private, no-store/);
 assert.match(r.headers.get('content-disposition'),/^inline/);
});
test('public unpaid PDF stays locked even when sales are disabled',async()=>{
 const s=await setup();s.row.payment_status='unpaid';env.SALES_ENABLED='false';
 const r=await s.run('czytaki_session='+owner);
 assert.equal(r.status,403);assert.equal(s.calls.bucket,0);
});
test('local unpaid preview still requires ownership',async()=>{
 const s=await setup();s.row.payment_status='unpaid';env.APP_URL='http://127.0.0.1:8787';env.SALES_ENABLED='false';
 assert.equal((await s.run('czytaki_session='+stranger)).status,404);
 assert.equal((await s.run('czytaki_session='+owner)).status,200);
 assert.equal(s.calls.bucket,1);
});
test('admin download requires a signed session, not an owner cookie',async()=>{
 const s=await setup();
 const r=await adminDownload(s.request('czytaki_session='+owner),{params:Promise.resolve({id})});
 assert.equal(r.status,401);assert.equal(s.calls.db,0);assert.equal(s.calls.bucket,0);
});
test('admin login accepts only the configured password',async()=>{
 env.APP_URL='https://shop.example';
 env.ADMIN_PASSWORD='offline-test-password-not-a-real-secret';
 env.DB={prepare(){return {bind(){return {
  async first(){return null;},
  async run(){return {success:true};},
 };}};}};
 const request=password=>new Request('https://shop.example/api/admin/session',{method:'POST',headers:{origin:'https://shop.example','content-type':'application/json'},body:JSON.stringify({password})});
 assert.equal((await adminLogin(request('wrong-password'))).status,401);
 const accepted=await adminLogin(request(env.ADMIN_PASSWORD));
 assert.equal(accepted.status,200);
 assert.match(accepted.headers.get('set-cookie'),/^__Host-czytaki_admin=/);
});
test('signed admin can download, forged signature is rejected',async()=>{
 const s=await setup(),cookie=(await adminCookie(s.request())).split(';')[0];
 assert.match(cookie,/^__Host-czytaki_admin=/);
 const good=await adminDownload(s.request(cookie),{params:Promise.resolve({id})});
 assert.equal(good.status,200);assert.match(good.headers.get('cache-control'),/no-store/);
 const forged=cookie.slice(0,-1)+(cookie.endsWith('0')?'1':'0');
 const bad=await adminDownload(s.request(forged),{params:Promise.resolve({id})});
 assert.equal(bad.status,401);assert.equal(s.calls.bucket,1);
});
