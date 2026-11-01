import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';

const root=new URL('../',import.meta.url).pathname;
const compiled=await build({stdin:{contents:'export * from "./lib/server/ai"; export * from "./lib/server/ai-costs"; export * from "./lib/server/ai-budget";',resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',plugins:[{
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
 env.OPENAI_DAILY_COST_CAP_GROSZE='500';env.OPENAI_USD_PLN_RATE='4.00';
 env.BUCKET={};env.OPENAI_API_KEY='offline-fixture';
 const original=globalThis.fetch;
 const state={db,calls:0,requests:[],response:{results:[{flagged:false}]}};
 globalThis.fetch=async (url,options)=>{state.calls++;state.requests.push({url,body:options.body});return Response.json(url.endsWith('/moderations')&&state.moderation?state.moderation:state.response);};
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
 const request=s.requests[0];
 assert.equal(request.url,'https://api.openai.com/v1/images/edits');
 assert.equal(request.body.get('model'),'gpt-image-2');
 assert.equal(request.body.has('input_fidelity'),false);
 assert.equal(request.body.get('size'),'1024x1024');
 assert.equal(request.body.get('quality'),'medium');
 assert.equal(request.body.get('output_format'),'jpeg');
 assert.equal(request.body.get('output_compression'),'85');
 const [row,moderation]=s.rows();assert.equal(row.model,'gpt-image-2');assert.equal(moderation.kind,'moderations');assert.equal(moderation.cost_cents,0);assert.equal(row.cost_cents,15);assert.equal(row.images,1);assert.equal(row.size,'1024x1024');assert.equal(row.quality,'medium');
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

for(const referenceKind of ['photo','illustration'])test('portrait image request preserves references: '+referenceKind,async t=>{
 const s=setup(t);env.OPENAI_IMAGE_MODEL='gpt-image-2';
 t.after(()=>delete env.OPENAI_IMAGE_MODEL);
 s.response={usage:{input_tokens:0,output_tokens:10000,input_tokens_details:{text_tokens:0,image_tokens:0}},data:[{b64_json:'AQID'}]};
 s.moderation={results:[{flagged:false,categories:{violence:false}}]};
 await ai.generateIllustration('order',{format:'comic',heroRole:'hero',age:'6'},
  {character:'synthetic',scenes:[{imagePrompt:'forest',panels:Array.from({length:5},()=>({visual:'forest',speaker:'fox'}))}]},
  0,new Uint8Array([1]),'image/jpeg',new Uint8Array([137]),referenceKind);
 const body=s.requests[0].body;
 assert.equal(body.get('model'),'gpt-image-2');assert.equal(body.has('input_fidelity'),false);
 assert.equal(body.get('size'),'1024x1536');assert.equal(body.get('quality'),'medium');
 assert.equal(body.get('output_format'),'jpeg');assert.equal(body.get('output_compression'),'85');
 assert.deepEqual(body.getAll('image[]').map(file=>file.type),['image/jpeg','image/png']);
 assert.equal(s.rows()[0].cost_cents,30);
});
for(const opts of [{paid:false},{verified:false}])test('image payment gate blocks HTTP '+JSON.stringify(opts),async t=>{
 const s=setup(t,opts);
 await assert.rejects(ai.generateIllustration('order',{format:'story',heroRole:'hero'},
  {character:'synthetic',scenes:[{imagePrompt:'forest'}]},0,new Uint8Array([1]),'image/jpeg'),/płatności/);
 assert.equal(s.calls,0);assert.equal(s.rows().length,0);
});
for(const [text_tokens,image_tokens,cents] of [[10000,0,5],[0,10000,8]])test('image input tariff '+text_tokens+'/'+image_tokens,async t=>{
 const s=setup(t);
 const call=await ai.startAiCall('order','images/edits',{model:'gpt-image-2'});
 await ai.finishAiCall(call,{usage:{input_tokens:10000,output_tokens:0,input_tokens_details:{text_tokens,image_tokens}}},'completed');
 assert.equal(s.rows()[0].cost_cents,cents);
});

for(const value of [undefined,'','0','-1','NaN','1.5','Infinity'])test('invalid cap fails closed: '+value,async t=>{
 const s=setup(t);env.OPENAI_DAILY_COST_CAP_GROSZE=value;
 await assert.rejects(ai.moderate('order','fixture'),e=>e.status===503);
 assert.equal(s.calls,0);assert.equal(s.rows().length,0);
});
for(const value of [undefined,'','0','-1','NaN','Infinity'])test('invalid FX fails closed: '+value,async t=>{
 const s=setup(t);env.OPENAI_USD_PLN_RATE=value;
 await assert.rejects(ai.moderate('order','fixture'),e=>e.status===503);
 assert.equal(s.calls,0);
});
test('full Warsaw day blocks HTTP and next day allows paid generation without losing progress',async t=>{
 const s=setup(t);s.response={results:[{flagged:false,categories:{violence:false}}]};t.mock.method(Date,'now',()=>Date.parse('2026-03-28T22:59:59Z'));
 assert.equal(ai.budgetDay(),'2026-03-28');
 s.db.prepare('INSERT INTO ai_daily_budget VALUES (?,500)').run(ai.budgetDay());
 s.db.exec("UPDATE orders SET generated=3,book='saved-book'");
 await assert.rejects(ai.moderate('order','fixture'),e=>e.status===503);
 assert.equal(s.calls,0);assert.equal(s.db.prepare('SELECT status FROM orders').get().status,'waiting_capacity');
 Date.now.mock.mockImplementation(()=>Date.parse('2026-03-28T23:00:00Z'));
 assert.equal(ai.budgetDay(),'2026-03-29');
 await ai.moderate('order','fixture');assert.equal(s.calls,1);
 assert.deepEqual({...s.db.prepare('SELECT generated,book,payment_status FROM orders').get()},{generated:3,book:'saved-book',payment_status:'paid'});
 Date.now.mock.mockImplementation(()=>Date.parse('2026-03-29T22:00:00Z'));
 assert.equal(ai.budgetDay(),'2026-03-30');
});
test('concurrent reservations never exceed 500 grosze',async t=>{
 const s=setup(t);
 const results=await Promise.allSettled(Array.from({length:40},()=>ai.startAiCall('order','responses',{model:'gpt-4.1-mini',max_output_tokens:28000})));
 assert.ok(results.some(r=>r.status==='fulfilled'));assert.ok(results.some(r=>r.status==='rejected'));
 const total=s.rows().reduce((sum,r)=>sum+r.reserved_grosze,0);
 assert.ok(total<=500);assert.equal(s.db.prepare('SELECT reserved_grosze FROM ai_daily_budget').get().reserved_grosze,total);
});
test('settlement releases surplus once; failures and unknown calls retain reservations',async t=>{
 const s=setup(t),request={model:'gpt-4.1-mini',max_output_tokens:4500};
 const completed=await ai.startAiCall('order','responses',request);
 const response={usage:{input_tokens:1000,output_tokens:2000}};
 await ai.finishAiCall(completed,response,'completed');await ai.finishAiCall(completed,response,'completed');
 assert.equal(s.rows()[0].cost_grosze,2);
 assert.equal(s.db.prepare('SELECT reserved_grosze FROM ai_daily_budget').get().reserved_grosze,2);
 for(const status of ['failed','unknown']){
  const call=await ai.startAiCall('order','responses',request);
  await ai.finishAiCall(call,null,status);
 }
 assert.equal(s.db.prepare('SELECT reserved_grosze FROM ai_daily_budget').get().reserved_grosze,2+s.rows().slice(1).reduce((n,r)=>n+r.reserved_grosze,0));
});
test('Resend alert claims are once per threshold and Warsaw day',async t=>{
 const s=setup(t);env.OWNER_ALERT_EMAIL='owner@example.invalid';env.RESEND_API_KEY='fixture';env.EMAIL_FROM='fixture@example.invalid';
 t.after(()=>{delete env.OWNER_ALERT_EMAIL;delete env.RESEND_API_KEY;delete env.EMAIL_FROM;});
 s.db.prepare('INSERT INTO ai_daily_budget VALUES (?,400)').run(ai.budgetDay());
 await Promise.all(Array.from({length:10},()=>ai.budgetAlerts(ai.budgetDay(),500)));
 assert.equal(s.calls,1);assert.match(s.requests[0].body,/80%/);
 s.db.prepare('UPDATE ai_daily_budget SET reserved_grosze=500').run();
 await Promise.all([ai.budgetAlerts(ai.budgetDay(),500),ai.budgetAlerts(ai.budgetDay(),500)]);
 assert.equal(s.calls,2);assert.match(s.requests[1].body,/100%/);
 s.db.prepare('INSERT INTO ai_daily_budget VALUES (?,500)').run('2099-01-01');
 await ai.budgetAlerts('2099-01-01',500);assert.equal(s.calls,4);
 assert.ok(s.requests.every(r=>r.url==='https://api.resend.com/emails'));
});
for(const path of ['text','image','layout','moderation'])test('exhausted budget prevents OpenAI HTTP: '+path,async t=>{
 const s=setup(t);s.db.prepare('INSERT INTO ai_daily_budget VALUES (?,500)').run(ai.budgetDay());
 const scene={imagePrompt:'forest',panels:Array.from({length:5},()=>({visual:'forest',speaker:'fox'}))};
 const action={
  text:()=>ai.planLegacyComic('order',{},{character:'synthetic',scenes:[]}),
  image:()=>ai.generateIllustration('order',{format:'story',heroRole:'hero'},{character:'synthetic',scenes:[scene]},0,new Uint8Array([1]),'image/jpeg'),
  layout:()=>ai.locateComicSpeech('order',scene,new Uint8Array([1])),
  moderation:()=>ai.moderate('order','fixture'),
 }[path];
 await assert.rejects(action,e=>e.status===503);assert.equal(s.calls,0);assert.equal(s.rows().length,0);
});
test('settling after midnight charges original reservation day with original FX',async t=>{
 const s=setup(t);t.mock.method(Date,'now',()=>Date.parse('2026-10-24T21:59:59Z'));
 const day=ai.budgetDay(),call=await ai.startAiCall('order','responses',{model:'gpt-4.1-mini',max_output_tokens:4500});
 Date.now.mock.mockImplementation(()=>Date.parse('2026-10-24T22:00:00Z'));env.OPENAI_USD_PLN_RATE='8';
 await ai.finishAiCall(call,{usage:{input_tokens:1000,output_tokens:2000}},'completed');
 assert.deepEqual({...s.db.prepare('SELECT * FROM ai_daily_budget').get()},{day,reserved_grosze:2});
 assert.equal(ai.budgetDay(),'2026-10-25');
});
test('rejected reservation sends only capacity alert below 80 percent',async t=>{
 const s=setup(t);env.OWNER_ALERT_EMAIL='owner@example.invalid';env.RESEND_API_KEY='fixture';env.EMAIL_FROM='fixture@example.invalid';
 t.after(()=>{delete env.OWNER_ALERT_EMAIL;delete env.RESEND_API_KEY;delete env.EMAIL_FROM;});
 s.db.prepare('INSERT INTO ai_daily_budget VALUES (?,100)').run(ai.budgetDay());
 await ai.budgetAlerts(ai.budgetDay(),500,true);
 assert.equal(s.calls,1);assert.match(s.requests[0].body,/100%/);
});
