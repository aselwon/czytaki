import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
const root=new URL('../',import.meta.url).pathname;
const compiled=await build({entryPoints:[root+'app/api/orders/[id]/generate/route.ts'],bundle:true,write:false,platform:'node',format:'esm',tsconfig:root+'tsconfig.json',plugins:[{
 name:'offline-generation',setup(build){
  build.onResolve({filter:/^@\/lib\/server\/(runtime|ai|pdf)$/},args=>({path:args.path.split('/').pop(),namespace:'offline'}));
  build.onResolve({filter:/\.ttf\?inline$/},()=>({path:'font',namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},args=>({contents:{
   font:'export default "data:font/ttf;base64,AA==";',
   pdf:'export const createBookPdf=()=>{throw new Error("Unexpected PDF step");};',
   ai:`export const generateBook=()=>{throw new Error('Unexpected story generation');};
       export const generateIllustration=async()=>{globalThis.__resume.images++;return new Uint8Array([1,2,3]);};
       export const locateComicSpeech=async()=>{globalThis.__resume.analyses++;if(globalThis.__resume.failAnalysis)throw new Error('Simulated layout failure');return Array.from({length:5},()=>({x:.1,y:.1,width:.2,height:.1}));};`,
   runtime:`export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
    export const runtime=()=>globalThis.__resume.env;
    export const infrastructure=runtime;
    export const findOrder=async()=>globalThis.__resume.order();
    export const ownOrder=findOrder;
    export const sameOrigin=()=>{};
    export const settings=()=>({format:'comic',name:'Test'});
    export const story=r=>JSON.parse(r.book);
    export const view=r=>({generated:r.generated,status:r.status});
    export const apiError=e=>Response.json({error:e.message},{status:e.status||503});`
  }[args.path]}));
 }
}]});
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function setup(t,{cached=false,photo=true,locked=false}={}){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE orders (id TEXT PRIMARY KEY,status TEXT,generated INTEGER,book TEXT,photo_key TEXT,photo_type TEXT,lock_token TEXT,lock_until INTEGER,updated_at INTEGER)');
 const book={title:'Test',comicLayoutVersion:2,scenes:[{title:'Testowa scena'}]};
 db.prepare('INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?)').run('fixture','generating',0,JSON.stringify(book),photo?'photo.jpg':null,'image/jpeg',null,locked?Date.now()+300000:0,0);
 const objects=new Map();
 const imageKey='orders/fixture/comic-overlay-v2/scene-0.jpg';
 if(cached)objects.set(imageKey,new Uint8Array([1,2,3]));
 if(photo)objects.set('photo.jpg',new Uint8Array([4,5,6]));
 const state={images:0,analyses:0,failAnalysis:false,objects,imageKey,order:()=>({...db.prepare('SELECT * FROM orders').get()})};
 state.env={OPENAI_API_KEY:'offline-fixture-not-a-key',DB:{prepare(sql){return {bind(...args){return {async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}};}},BUCKET:{
  async get(key){const bytes=objects.get(key);return bytes?{async arrayBuffer(){return bytes.buffer;}}:null;},
  async put(key,bytes){objects.set(key,bytes);}
 }};
 globalThis.__resume=state;
 t.after(()=>{delete globalThis.__resume;db.close();});
 state.run=()=>POST(new Request('http://localhost/api/orders/fixture/generate',{method:'POST'}),{params:Promise.resolve({id:'fixture'})});
 return state;
}
test('cached illustration can resume lettering without the source photo',async t=>{
 const s=setup(t,{cached:true,photo:false});
 assert.equal((await s.run()).status,200);
 assert.equal(s.images,0);assert.equal(s.analyses,1);assert.equal(s.order().generated,1);
 assert.equal(JSON.parse(s.order().book).scenes[0].placementVersion,1);
 assert.equal(s.order().lock_until,0);
});
test('failed layout saves art, releases the lock and retries without regenerating',async t=>{
 const s=setup(t);s.failAnalysis=true;
 assert.equal((await s.run()).status,503);
 assert.equal(s.objects.has(s.imageKey),true);assert.equal(s.images,1);
 assert.equal(s.order().generated,0);assert.equal(s.order().lock_until,0);
 s.failAnalysis=false;
 assert.equal((await s.run()).status,200);
 assert.equal(s.images,1);assert.equal(s.analyses,2);assert.equal(s.order().generated,1);
});
test('missing source and missing illustration stop without any AI work',async t=>{
 const s=setup(t,{photo:false});
 assert.equal((await s.run()).status,410);
 assert.equal(s.images,0);assert.equal(s.analyses,0);assert.equal(s.order().lock_until,0);
});
test('an active generation lock rejects another request before AI work',async t=>{
 const s=setup(t,{locked:true});
 assert.equal((await s.run()).status,409);
 assert.equal(s.images,0);assert.equal(s.analyses,0);assert.ok(s.order().lock_until>Date.now());
});
