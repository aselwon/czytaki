// Explicit manual integration check: uses the existing API key, never prints it.
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {PDFDocument} from 'pdf-lib';
const root=new URL('../',import.meta.url);process.chdir(root.pathname);process.loadEnvFile('.env.local');
const dir=await mkdtemp(join(tmpdir(),'czytaki-placement-'));
const source=await readFile('public/examples/figo-source.png'),split=500,w=1536-split,h=1024;
const pdf=await PDFDocument.create(),page=pdf.addPage([w,h]),image=await pdf.embedPng(source);
page.drawImage(image,{x:-split,y:0,width:1536,height:1024});
await writeFile(join(dir,'art.pdf'),await pdf.save());
execFileSync('pdftoppm',['-singlefile','-scale-to','1200','-png',join(dir,'art.pdf'),join(dir,'art')]);
await build({entryPoints:['lib/server/ai.ts'],bundle:true,platform:'node',format:'esm',outfile:join(dir,'ai.mjs'),plugins:[{name:'local-runtime',setup(b){b.onResolve({filter:/^\.\/runtime$/},()=>({path:'runtime',namespace:'local-runtime'}));b.onLoad({filter:/.*/,namespace:'local-runtime'},()=>({contents:'export const runtime=()=>process.env; export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}',loader:'js'}));}}]});
const {locateComicSpeech,planAdaptiveLettering}=await import(join(dir,'ai.mjs'));
const panels=[
 {kind:'dialogue',line:'Czuję morską bryzę!',visual:'The beagle stands above the stream beside the turtle in the first upper scene.',speaker:'Figo the beagle in the upper right'},
 {kind:'dialogue',line:'Szukasz drogi?',visual:'The beagle sniffs the turtle on the left in the second scene.',speaker:'Figo the beagle on the left'},
 {kind:'dialogue',line:'Chodź za mną!',visual:'The beagle walks through the stream on the right.',speaker:'Figo the beagle wading on the right'},
 {kind:'dialogue',line:'Już słychać fale!',visual:'The beagle follows the turtle downstream on the lower left.',speaker:'Figo the beagle on the lower left'},
 {kind:'dialogue',line:'Dziękuję, przyjacielu!',visual:'The turtle reaches the sandy beach beside the sitting beagle.',speaker:'the small turtle on the beach near the bottom centre, NOT the beagle'},
];
const lettering=process.argv.includes("--cached-analysis")?planAdaptiveLettering(JSON.parse(await readFile("/tmp/czytaki-figo-analysis.json","utf8")),panels):await locateComicSpeech({title:'Figo i morska wyprawa',text:'Figo pomaga żółwiowi odnaleźć drogę do morza.',imagePrompt:'A beagle and turtle follow a stream to the sea.',panels},new Uint8Array(await readFile(join(dir,'art.png'))),async raw=>{await writeFile('/tmp/czytaki-figo-analysis.json',JSON.stringify(raw,null,2));});
await writeFile('public/examples/figo-placement.json',JSON.stringify({placementVersion:1,lettering,panels},null,2));
console.log('Actual-image placement verified and saved for Figo.');
