import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

const compiled=await build({entryPoints:[new URL('../lib/server/retention.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const {cleanExpiredOrders,deleteOrderData}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function fixture(t){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE orders(id TEXT PRIMARY KEY,created_at INTEGER,photo_key TEXT,photo_type TEXT); CREATE TABLE ai_calls(id TEXT,order_id TEXT);');
 const objects=new Map(),now=40*86400000;
 for(const [id,created,photo] of [['old',0,'orders/old/source'],['recent-photo',now-8*86400000,'orders/recent-photo/source'],['fresh',now-2*86400000,null]]){db.prepare('INSERT INTO orders VALUES(?,?,?,?)').run(id,created,photo,photo?'image/jpeg':null);db.prepare('INSERT INTO ai_calls VALUES(?,?)').run('call-'+id,id);objects.set(`orders/${id}/source`,new Uint8Array([1]));objects.set(`orders/${id}/scene-0.jpg`,new Uint8Array([2]));}
 const env={
  DB:{prepare(sql){return{bind(...args){return{
   async all(){return{results:db.prepare(sql).all(...args)}},
   async run(){return{meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},
  };}}}},
  BUCKET:{
   async list({prefix,cursor}){const keys=[...objects.keys()].filter(key=>key.startsWith(prefix));return{objects:keys.map(key=>({key})),truncated:false,cursor};},
   async delete(key){for(const item of Array.isArray(key)?key:[key])objects.delete(item);},
  },
 };
 t.after(()=>db.close());return{db,env,objects,now};
}
test('retention deletes old photos and all assets and database rows while preserving recent orders',async t=>{
 const f=fixture(t),result=await cleanExpiredOrders(f.env,f.now);
 assert.deepEqual(result,{photos:2,orders:1});
 assert.equal(f.db.prepare('SELECT photo_key FROM orders WHERE id=?').get('recent-photo').photo_key,null);
 assert.equal(f.db.prepare('SELECT COUNT(*) count FROM orders WHERE id=?').get('old').count,0);
 assert.equal(f.db.prepare('SELECT COUNT(*) count FROM ai_calls WHERE order_id=?').get('old').count,0);
 assert.equal(f.objects.has('orders/old/scene-0.jpg'),false);
 assert.equal(f.db.prepare('SELECT COUNT(*) count FROM orders WHERE id=?').get('fresh').count,1);
});
test('on-demand deletion removes the order, AI rows and every R2 object',async t=>{
 const f=fixture(t);await deleteOrderData(f.env,'fresh');
 assert.equal(f.db.prepare('SELECT COUNT(*) count FROM orders WHERE id=?').get('fresh').count,0);
 assert.equal(f.db.prepare('SELECT COUNT(*) count FROM ai_calls WHERE order_id=?').get('fresh').count,0);
 assert.equal([...f.objects.keys()].some(key=>key.startsWith('orders/fresh/')),false);
});
test('invalid deletion token is rejected with HTTP 403',async()=>{
 const tokenBuild=await build({entryPoints:[new URL('../lib/server/retention-token.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'offline-runtime',setup(build){build.onResolve({filter:/^\.\/runtime$/},()=>({path:'runtime',namespace:'offline'}));build.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:'export class HttpError extends Error {constructor(status,message){super(message);this.status=status}}; export const runtime=()=>({DELETE_TOKEN_SECRET:"test-secret"});'}));}}]});
 const {verifyDeletionToken}=await import('data:text/javascript;base64,'+Buffer.from(tokenBuild.outputFiles[0].text).toString('base64'));
 await assert.rejects(verifyDeletionToken('not-a-valid-token'),error=>error.status===403);
});
