import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {ORDERS_CRON,scheduledJobs} from '../lib/server/schedule.ts';

// Real background selection and loop; generation, delivery and storage are offline fakes.
const root=new URL('../',import.meta.url).pathname;
const compiled=await build({entryPoints:[root+'lib/server/background.ts'],bundle:true,write:false,platform:'node',format:'esm',tsconfig:root+'tsconfig.json',plugins:[{
 name:'offline-background',setup(build){
  build.onResolve({filter:/^@\/lib\/server\/(runtime|generation|payments)$/},args=>({path:args.path.split('/').pop(),namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},args=>({resolveDir:root,contents:{
   runtime:`export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
    export const infrastructure=()=>globalThis.__bg.env;
    export const findOrder=async id=>globalThis.__bg.order(id);`,
   generation:`export const runGenerationStep=async id=>globalThis.__bg.step(id);`,
   payments:`export const deliver=async order=>globalThis.__bg.deliver(order);`,
  }[args.path]}));
 }
}]});
const {finishAbandonedOrders,ABANDONED_AFTER_MS}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

const NOW=Date.UTC(2026,10,22,12);
const idle=NOW-ABANDONED_AFTER_MS-1;
function setup(t,rows){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE orders (id TEXT PRIMARY KEY,status TEXT,payment_status TEXT,payment_verified_at INTEGER,generated INTEGER,
  pdf_key TEXT,delivery_status TEXT,email_attempt_at INTEGER,lock_until INTEGER,created_at INTEGER,updated_at INTEGER)`);
 for(const patch of rows){
  const row={status:'paid',payment_status:'paid',payment_verified_at:NOW-600000,generated:0,pdf_key:null,delivery_status:'pending',email_attempt_at:null,lock_until:0,created_at:NOW-3600000,updated_at:idle,...patch};
  db.prepare(`INSERT INTO orders (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(()=>'?').join(',')})`).run(...Object.values(row));
 }
 const state={steps:[],deliveries:[],sceneCount:3,failWith:null,busy:false};
 state.order=id=>({...db.prepare('SELECT * FROM orders WHERE id=?').get(id)});
 state.step=async id=>{
  state.steps.push(id);
  if(state.busy)return {busy:true,retryAfter:30};
  if(state.failWith)throw state.failWith;
  const next=state.order(id).generated+1;
  db.prepare("UPDATE orders SET generated=?,status=?,pdf_key=?,updated_at=? WHERE id=?").run(next,next>state.sceneCount?'assembled':'generating',next>state.sceneCount?'book.pdf':null,NOW,id);
  return {busy:false};
 };
 state.deliver=async order=>{state.deliveries.push(order.id);db.prepare("UPDATE orders SET delivery_status='sent',status='delivered' WHERE id=?").run(order.id);};
 state.env={DB:{prepare(sql){return {bind(...args){return {async all(){return {results:db.prepare(sql).all(...args)};}};}};}}};
 globalThis.__bg=state;
 t.after(()=>{delete globalThis.__bg;db.close();});
 return state;
}

test('an abandoned paid order is finished and e-mailed once without the browser',async t=>{
 const s=setup(t,[{id:'abandoned'}]);
 const summary=await finishAbandonedOrders({now:NOW});
 assert.deepEqual(summary,{orders:1,steps:4,delivered:1,failed:0});
 assert.equal(s.order('abandoned').status,'delivered');
 assert.deepEqual(s.deliveries,['abandoned']);
 assert.deepEqual(await finishAbandonedOrders({now:NOW+ABANDONED_AFTER_MS*2}),{orders:0,steps:0,delivered:0,failed:0});
});

test('orders that are active, unpaid, locked, blocked, finished or stale are left alone',async t=>{
 const s=setup(t,[
  {id:'active',updated_at:NOW-1000},
  {id:'unpaid',payment_status:'unpaid'},
  {id:'unverified',payment_verified_at:null},
  {id:'locked',lock_until:NOW+60000},
  {id:'unsafe',status:'safety_blocked'},
  {id:'refund',status:'needs_refund'},
  {id:'sent',status:'assembled',pdf_key:'book.pdf',delivery_status:'sent'},
  {id:'old',created_at:NOW-15*24*3600000},
  {id:'gave-up',status:'assembled',pdf_key:'book.pdf',delivery_status:'failed',email_attempt_at:NOW-24*3600000},
 ]);
 assert.equal((await finishAbandonedOrders({now:NOW})).orders,0);
 assert.deepEqual(s.steps,[]);assert.deepEqual(s.deliveries,[]);
});

test('an assembled book whose e-mail never went out is delivered without new AI work',async t=>{
 const s=setup(t,[{id:'unsent',status:'assembled',pdf_key:'book.pdf',delivery_status:'failed',email_attempt_at:NOW-3600000}]);
 assert.deepEqual(await finishAbandonedOrders({now:NOW}),{orders:1,steps:0,delivered:1,failed:0});
 assert.deepEqual(s.steps,[]);
});

test('a capacity error keeps saved progress and the next order still runs',async t=>{
 const s=setup(t,[{id:'first',updated_at:idle-1000},{id:'second',status:'assembled',pdf_key:'book.pdf'}]);
 s.failWith=Object.assign(new Error('limit'),{status:503});
 const summary=await finishAbandonedOrders({now:NOW});
 assert.equal(summary.failed,1);assert.equal(summary.delivered,1);
 assert.equal(s.order('first').generated,0);assert.deepEqual(s.deliveries,['second']);
});

test('a step held by the browser stops the background loop for that order',async t=>{
 const s=setup(t,[{id:'held'}]);s.busy=true;
 assert.deepEqual(await finishAbandonedOrders({now:NOW}),{orders:1,steps:0,delivered:0,failed:0});
 assert.deepEqual(s.steps,['held']);
});

test('an exhausted time budget starts no work',async t=>{
 const s=setup(t,[{id:'late'}]);
 await finishAbandonedOrders({now:NOW,budgetMs:0});
 assert.deepEqual(s.steps,[]);
});

test('scheduled jobs match the production cron triggers',()=>{
 const config=JSON.parse(readFileSync(new URL('../cloudflare.production.json',import.meta.url),'utf8'));
 // One trigger only: the Workers Free plan caps cron triggers per account.
 assert.deepEqual(config.triggers.crons,[ORDERS_CRON]);
 const at=(h,m)=>Date.UTC(2026,10,22,h,m);
 assert.deepEqual(scheduledJobs(at(2,0)),['orders','retention']);
 for(const [h,m] of [[2,2],[1,58],[3,0],[14,0],[0,0]])assert.deepEqual(scheduledJobs(at(h,m)),['orders'],`${h}:${m}`);
 // Exactly one retention run among the 720 even-minute runs of a day.
 let runs=0;for(let minute=0;minute<1440;minute+=2)runs+=scheduledJobs(Date.UTC(2026,10,22,0,minute)).includes('retention')?1:0;
 assert.equal(runs,1);
});
