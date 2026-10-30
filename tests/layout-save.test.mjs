import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
const root=new URL('../',import.meta.url).pathname;
const compiled=await build({entryPoints:[root+'app/api/orders/[id]/layout/route.ts'],bundle:true,write:false,platform:'node',format:'esm',tsconfig:root+'tsconfig.json',plugins:[{
 name:'offline-layout-save',setup(build){
  build.onResolve({filter:/^@\/lib\/server\/(runtime|pdf)$/},args=>({path:args.path.split('/').pop(),namespace:'offline'}));
  build.onResolve({filter:/\.ttf\?inline$/},()=>({path:'font',namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},args=>({contents:{
   font:'export default "data:font/ttf;base64,AA==";',
   pdf:`export const createBookPdf=async()=>{const s=globalThis.__layoutTest;s.renders++;if(s.overflow)throw new Error('Comic bubble text exceeds bounds');return new Uint8Array([1,2,3]);};`,
   runtime:`export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
    export const infrastructure=()=>globalThis.__layoutTest.env;
    export const findOrder=async()=>globalThis.__layoutTest.order();
    export const ownOrder=findOrder;
    export const sameOrigin=()=>{};
    export const ownerPreviewAllowed=()=>true;
    export const settings=()=>({format:'comic'});
    export const story=r=>JSON.parse(r.book);
    export const boundedBytes=async req=>new Uint8Array(await req.arrayBuffer());
    export const apiError=e=>Response.json({error:e.message},{status:e.status||503});`
  }[args.path]}));
 }
}]});
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function setup(t){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE orders (id TEXT PRIMARY KEY,status TEXT,payment_status TEXT,book TEXT,pdf_key TEXT,lock_token TEXT,lock_until INTEGER,updated_at INTEGER)');
 const scene={title:'Testowa plansza',text:'Bohater wyrusza na nową przygodę.',comicTemplate:0,imagePrompt:'A colorful forest scene for this technical test.',panels:Array.from({length:5},()=>({visual:'The hero waves to a friend in the forest.',line:'Hej!',kind:'dialogue'})),lettering:Array.from({length:5},(_,i)=>({x:.1,y:.05+i*.16,width:.3,height:.08,speaker:{x:.5,y:.1+i*.16}}))};
 const book={title:'Testowa historia',comicLayoutVersion:2,scenes:Array.from({length:6},()=>structuredClone(scene))};
 const originalBook=JSON.stringify(book),oldKey='orders/fixture/original.pdf';
 db.prepare('INSERT INTO orders VALUES (?,?,?,?,?,?,?,?)').run('fixture','ready','unpaid',originalBook,oldKey,null,0,10);
 const objects=new Map([[oldKey,new Uint8Array([9,8,7])]]);
 const s={renders:0,puts:0,overflow:false,missingArt:false,objects,oldKey,originalBook,order:()=>({...db.prepare('SELECT * FROM orders').get()}),update:{revision:10,scenes:structuredClone(book.scenes)}};
 s.update.scenes[0].panels[0].line='Nowa wypowiedź!';
 s.env={DB:{prepare(sql){return {bind(...args){return {async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}};}},BUCKET:{
  async get(){return s.missingArt?null:{async arrayBuffer(){return new Uint8Array([4,5]).buffer;}};},
  async put(key,bytes){s.puts++;objects.set(key,bytes);}
 }};
 globalThis.__layoutTest=s;
 t.after(()=>{delete globalThis.__layoutTest;db.close();});
 s.run=(body=JSON.stringify(s.update))=>POST(new Request('http://localhost/layout',{method:'POST',body}),{params:Promise.resolve({id:'fixture'})});
 s.unchanged=()=>{assert.equal(s.order().pdf_key,oldKey);assert.equal(s.order().book,originalBook);assert.equal(s.order().updated_at,10);assert.equal(s.order().lock_until,0);assert.equal(s.puts,0);};
 return s;
}
test('overflow response preserves the previous PDF and book and releases the lock',async t=>{
 const s=setup(t);s.overflow=true;
 const response=await s.run();assert.equal(response.status,400);
 assert.match((await response.json()).error,/Tekst nie mieści/);s.unchanged();
});
test('missing illustration preserves the original editor state',async t=>{
 const s=setup(t);s.missingArt=true;
 assert.equal((await s.run()).status,503);s.unchanged();assert.equal(s.renders,0);
});
test('stale editor revision cannot overwrite a saved PDF',async t=>{
 const s=setup(t);s.update.revision=9;
 assert.equal((await s.run()).status,409);s.unchanged();assert.equal(s.renders,0);
});
test('successful save writes a new PDF key and retains the original file',async t=>{
 const s=setup(t);const response=await s.run();assert.equal(response.status,200);
 assert.notEqual(s.order().pdf_key,s.oldKey);assert.ok(s.objects.has(s.oldKey));assert.ok(s.objects.has(s.order().pdf_key));
 assert.equal(s.puts,1);assert.ok(s.order().updated_at>10);assert.equal(s.order().lock_until,0);
 assert.equal(JSON.parse(s.order().book).scenes[0].panels[0].line,'Nowa wypowiedź!');
 assert.deepEqual(JSON.parse(s.order().book).scenes[0].lettering[0].speaker,{x:.5,y:.1});
});
test('invalid JSON returns a useful client error without modifying stored data',async t=>{
 const s=setup(t);assert.equal((await s.run('{bad')).status,400);s.unchanged();assert.equal(s.renders,0);
});
