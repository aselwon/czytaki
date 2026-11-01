import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';

const root=new URL('../',import.meta.url).pathname;
const compiled=await build({stdin:{contents:'export * from "./lib/server/ai"; export * from "./lib/server/ai-costs";',resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',plugins:[{
 name:'offline-ai',setup(build){
  build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:'export const env=globalThis.__aiCostEnv;'}));
 }
}]});
const env={};globalThis.__aiCostEnv=env;
const ai=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const migrations=readdirSync(root+'drizzle').filter(f=>f.endsWith('.sql')).sort();
function setup(t,{paid=true,verified=true}={}){
 const db=new DatabaseSync(':memory:');
 for(const file of migrations)db.exec(readFileSync(root+'drizzle/'+file,'utf8'));
 db.prepare("INSERT INTO orders (id,owner_hash,settings,amount,created_at,updated_at,payment_status,payment_verified_at) VALUES ('order','owner','{}',2900,1,1,?,?)").run(paid?'paid':'unpaid',verified?1:null);
 function prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)??null;},async run(){return db.prepare(sql).run(...args);},sql,args};}};}
 env.DB={prepare,async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>db.prepare(s.sql).run(...s.args));db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
 env.BUCKET={};env.OPENAI_API_KEY='offline-fixture';
 const original=globalThis.fetch;
 const state={db,calls:0,response:{results:[{flagged:false}]}};
 globalThis.fetch=async url=>{state.calls++;return Response.json(url.endsWith('/moderations')&&state.moderation?state.moderation:state.response);};
 t.after(()=>{globalThis.fetch=original;db.close();});
 state.rows=()=>db.prepare('SELECT * FROM ai_calls ORDER BY rowid').all();
 return state;
}
for(const opts of [{paid:false},{verified:false},{paid:false,verified:false}])test('unpaid or unverified order is rejected without fetch '+JSON.stringify(opts),async t=>{
 const s=setup(t,opts);
 await assert.rejects(ai.moderate('order','fixture'),/płatności/);
 await assert.rejects(ai.moderate('missing','fixture'),/płatności/);
 assert.equal(s.calls,0);assert.equal(s.rows().length,0);
});
test('moderation is recorded even when content is rejected',async t=>{
 const s=setup(t);s.response={results:[{flagged:true,categories:{violence:true}}]};
 await assert.rejects(ai.moderate('order','fixture'),/materiałów/);
 assert.equal(s.rows()[0].cost_cents,0);assert.equal(s.rows()[0].kind,'moderations');
});
test('text fetch records tokens and cost before invalid story parsing',async t=>{
 const s=setup(t);s.response={usage:{input_tokens:1000,output_tokens:2000},output:[]};
 await assert.rejects(ai.planLegacyComic('order',{name:'Test'},{character:'synthetic',scenes:[]}));
 const row=s.rows()[0];
 assert.equal(s.calls,1);assert.equal(row.input_tokens,1000);assert.equal(row.output_tokens,2000);assert.equal(row.cost_cents,1);
 assert.equal(s.db.prepare('SELECT ai_cost_cents FROM orders').get().ai_cost_cents,1);
});
test('image fetch records mixed input usage, output, size and quality',async t=>{
 const s=setup(t);s.response={usage:{input_tokens:3000,output_tokens:4000,input_tokens_details:{text_tokens:1000,image_tokens:2000}},data:[{b64_json:'AQID'}]};
 s.moderation={results:[{flagged:false,categories:{violence:false}}]};
 const result=await ai.generateIllustration('order',{format:'story',heroRole:'hero',style:'watercolor',age:'6'}, {character:'synthetic',scenes:[{imagePrompt:'forest'}]},0,new Uint8Array([1]),'image/jpeg');
 assert.deepEqual(result,new Uint8Array([1,2,3]));
 const [row,moderation]=s.rows();assert.equal(moderation.kind,'moderations');assert.equal(moderation.cost_cents,0);assert.equal(row.cost_cents,15);assert.equal(row.images,1);assert.equal(row.size,'1024x1024');assert.equal(row.quality,'medium');
 assert.equal(s.db.prepare('SELECT ai_cost_cents FROM orders').get().ai_cost_cents,15);
 await ai.finishAiCall({id:row.id,orderId:'order',model:row.model,kind:row.kind},s.response,'completed');
 assert.equal(s.db.prepare('SELECT ai_cost_cents FROM orders').get().ai_cost_cents,15);
});
test('unknown usage is not recorded as a free successful call',async t=>{
 const s=setup(t);s.response={output:[]};
 await assert.rejects(ai.planLegacyComic('order',{},{character:'synthetic',scenes:[]}),/rozliczenia/);
 assert.equal(s.rows()[0].status,'unknown');assert.equal(s.rows()[0].cost_cents,null);
});
test('unknown model fails before fetch',async t=>{
 const s=setup(t);env.OPENAI_TEXT_MODEL='unpriced';
 t.after(()=>delete env.OPENAI_TEXT_MODEL);
 await assert.rejects(ai.planLegacyComic('order',{},{character:'synthetic',scenes:[]}),/cennika/);
 assert.equal(s.calls,0);
});
test('migration preserves legacy orders without granting webhook verification',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  const aiMigration=migrations.findIndex(file=>file.startsWith('0002_'));
  for(const file of migrations.slice(0,aiMigration))db.exec(readFileSync(root+'drizzle/'+file,'utf8'));
  db.exec("INSERT INTO orders (id,owner_hash,settings,amount,created_at,updated_at,payment_status,book,pdf_key) VALUES ('legacy','owner','{}',3900,1,2,'paid','old-book','old.pdf')");
  const before=db.prepare('SELECT * FROM orders').get();
  db.exec(readFileSync(root+'drizzle/'+migrations[aiMigration],'utf8'));
  const {ai_cost_cents,payment_verified_at,...after}=db.prepare('SELECT * FROM orders').get();
  assert.deepEqual(after,{...before});assert.equal(ai_cost_cents,0);assert.equal(payment_verified_at,null);
 }finally{db.close();}
});
