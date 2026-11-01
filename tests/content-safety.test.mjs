import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
const root=new URL('../',import.meta.url).pathname;
const bundled=await build({stdin:{contents:`export * from './lib/server/ai';export * from './lib/server/content-safety';export {POST} from './app/api/orders/route';`,resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',tsconfig:root+'tsconfig.json',plugins:[{
 name:'offline-safety',setup(build){
  build.onResolve({filter:/^\.\/ai-costs$/},()=>({path:'ai-costs',namespace:'paid-fixture'}));
  build.onLoad({filter:/.*/,namespace:'paid-fixture'},()=>({contents:`
   export const assertPaidOrder=id=>{if(id!=='order')throw new Error('Unexpected order');};
   export const startAiCall=()=>({});
   export const finishAiCall=()=>{};
  `}));
  build.onResolve({filter:/^(\.\/runtime|@\/lib\/server\/runtime)$/},()=>({path:'runtime',namespace:'offline'}));
  build.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:`
   export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
   export const runtime=()=>({OPENAI_API_KEY:'offline-fixture'});
   export const infrastructure=()=>({BUCKET:{put(){throw new Error('Unexpected storage');}}});
   export const sameOrigin=()=>{};
   export const boundedBytes=async req=>req.arrayBuffer();
   export const apiError=e=>Response.json({error:e.message},{status:e.status||503});
   export const hash=()=>{throw new Error('Unexpected persistence');};
   export const sessionToken=()=>null;
   export const takeQuota=()=>{};
   export const findOrder=()=>{};
   export const view=x=>x;
  `}));
 }
}]});
const {POST,generateIllustration,generateBook,moderate,validateLocalContent,validatePhoto,ContentSafetyError,hardCategories}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const fixtures=JSON.parse(await readFile(new URL('./fixtures/safety/local.json',import.meta.url),'utf8'));
const settings={name:'Ania',title:'Wyprawa Anny',dedication:'Dla Ani',heroIdea:'Przyjazny smok',format:'story',pages:8,heroRole:'original',world:'forest',style:'storybook',age:'3-5',consent:true};
const book={character:'Friendly hero',scenes:[{imagePrompt:'Friendly hero in a sunny forest'}]};
const jpeg=new Uint8Array(100);jpeg.set([255,216,255]);
const clean={flagged:false,categories:{'sexual/minors':false,violence:false}};
function mockFetch(t,replies){
 const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push({url,body:options.body instanceof FormData?Object.fromEntries(options.body):JSON.parse(options.body)});
  assert.ok(replies.length,'Unexpected API call');return Response.json(replies.shift());
 });return calls;
}
for(const fixture of fixtures)test(`local safety: ${fixture.field} / ${fixture.value}`,async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',()=>{calls++;throw new Error('Network forbidden');});
 const input={...settings,[fixture.field]:fixture.value};
 if(fixture.blocked){
  assert.throws(()=>validateLocalContent(input),ContentSafetyError);
  const data=new FormData();data.set('settings',JSON.stringify(input));data.set('photo',new File([jpeg],'synthetic.jpg',{type:'image/jpeg'}));
  assert.equal((await POST(new Request('https://example.test/api/orders',{method:'POST',body:data}))).status,422);
 }else assert.doesNotThrow(()=>validateLocalContent(input));
 assert.equal(calls,0);
});
test('photo validation checks size, MIME and magic bytes offline',async()=>{
 assert.equal((await validatePhoto(new File([jpeg],'test.jpg',{type:'image/jpeg'}))).mime,'image/jpeg');
 const png=new Uint8Array(100);png.set([137,80,78,71,13,10,26,10]);
 assert.equal((await validatePhoto(new File([png],'test.png',{type:'image/png'}))).mime,'image/png');
 for(const photo of [null,'text',new File([jpeg],'fake.png',{type:'image/png'}),new File([png.slice(0,50)],'small.png',{type:'image/png'}),new File([new Uint8Array(8*1024*1024+1)],'big.jpg',{type:'image/jpeg'}),new File([new Uint8Array(100)],'fake.jpg',{type:'image/jpeg'})])await assert.rejects(validatePhoto(photo),{status:400});
});
const imageReply={data:[{b64_json:Buffer.from(jpeg).toString('base64')}]};
const illustrate=()=>generateIllustration('order',settings,book,0,jpeg,'image/jpeg');
test('rejected illustration retries once then fails without returning pixels',async t=>{
 const rejected={results:[{flagged:true,categories:{violence:true}}]};
 const calls=mockFetch(t,[imageReply,rejected,imageReply,rejected]);
 await assert.rejects(illustrate(),{status:422,hardBlock:false});
 assert.equal(calls.length,4);assert.match(calls[2].body.prompt,/Safety correction/);
 assert.equal(calls[1].body.model,'omni-moderation-latest');
 assert.match(calls[1].body.input[0].image_url.url,/^data:image\/jpeg;base64,/);
});
test('safe retry returns only the approved image',async t=>{
 const approved=new Uint8Array([255,216,255,42]);
 const calls=mockFetch(t,[imageReply,{results:[{flagged:true,categories:{violence:true}}]},{data:[{b64_json:Buffer.from(approved).toString('base64')}]},{results:[clean]}]);
 assert.deepEqual(await illustrate(),approved);assert.equal(calls.length,4);
 for(const phrase of ['ages 3-5','ages 6-8','ages 9-12','violence','frightening','brands'])assert.ok(calls[0].body.prompt.includes(phrase));
});
for(const category of hardCategories)test(`hard block ${category} never retries even with flagged=false`,async t=>{
 const calls=mockFetch(t,[imageReply,{results:[{flagged:false,categories:{[category]:true}}]}]);
 await assert.rejects(illustrate(),{status:422,hardBlock:true});assert.equal(calls.length,2);
});
for(const response of [{},{results:[]},{results:[{flagged:false}]},{results:[{flagged:false,categories:{violence:'false'}}]}])test('malformed moderation fails closed without a new image',async t=>{
 const calls=mockFetch(t,[imageReply,response]);await assert.rejects(illustrate(),{status:503});assert.equal(calls.length,2);
});
test('photo and all customer text are moderated before story generation',async t=>{
 const calls=mockFetch(t,[{results:[{flagged:true,categories:{'sexual/minors':true}}]}]);
 await assert.rejects(generateBook('order',settings,jpeg,'image/jpeg'),{status:422});assert.equal(calls.length,1);
 assert.match(calls[0].url,/moderations$/);
 for(const value of [settings.name,settings.title,settings.heroIdea,settings.dedication])assert.ok(calls[0].body.input[0].text.includes(value));
 assert.match(calls[0].body.input[1].image_url.url,/^data:image\/jpeg/);
});
test('hard category in any moderation result wins over a soft rejection',async t=>{
 mockFetch(t,[{results:[{flagged:true,categories:{violence:true}},{flagged:false,categories:{'sexual/minors':true}}]}]);
 await assert.rejects(moderate('order','synthetic fixture'),{hardBlock:true});
});
