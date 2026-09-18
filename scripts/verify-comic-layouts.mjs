import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {createBookPdf} from '../lib/server/pdf.ts';
import {detectBubbleInteriors} from '../lib/server/bubble-detection.ts';
import {comicLayouts} from '../lib/comic-layouts.ts';
import {comicExamplePanels} from '../lib/comic-example.ts';
const root=new URL('../',import.meta.url);
await mkdir(new URL('output/pdf/',root),{recursive:true});
await mkdir(new URL('tmp/pdfs/',root),{recursive:true});
const font=new Uint8Array(await readFile(new URL('lib/assets/LiberationSans-Regular.ttf',root)));
const settings={name:'Leo',subject:'child',format:'comic',world:'ocean',style:'comic',age:'6-8',dedication:'Przykład nowego układu komiksu.',consent:true};
const bookFor=(template,lettering,title)=>({title,summary:'Przykładowa plansza sprawdzająca czytelność nowych dymków.',character:'Red-haired child in a green shirt.',comicLayoutVersion:1,scenes:Array.from({length:6},()=>({title:'Podwodna przygoda',text:'Leo odkrywa niezwykły podwodny świat i pomaga przyjaciołom.',imagePrompt:'A flowing full-page underwater adventure with five empty bubbles.',panels:comicExamplePanels,comicTemplate:template,lettering}))});
const sample=new Uint8Array(await readFile(new URL('public/comic-flow-sample.png',root)));
const boxes=detectBubbleInteriors(sample,0);
await writeFile(new URL('lib/assets/comic-flow-lettering.json',root),JSON.stringify(boxes,null,2)+'\n');
const generated=await PDFDocument.load(await createBookPdf(bookFor(0,boxes,'Leo i podwodna przygoda'),settings,Array(6).fill(sample),font));
const example=await PDFDocument.create();example.setTitle('Przykład nowego układu komiksu — Czytaki');example.addPage((await example.copyPages(generated,[1]))[0]);
const exampleBytes=await example.save();
await writeFile(new URL('output/pdf/czytaki-przyklad-nowego-komiksu.pdf',root),exampleBytes);
await writeFile(new URL('public/comic-flow-sample.pdf',root),exampleBytes);
const proof=await PDFDocument.create();
for(let index=0;index<comicLayouts.length;index++){
 const image=new Uint8Array(await readFile(new URL(`lib/assets/comic-templates/${index}.png`,root)));
 const lettering=detectBubbleInteriors(image,index);
 const book=bookFor(index,lettering,comicLayouts[index].name);
 // Exercise the longest allowed bubble copy, including Polish characters.
 book.scenes.forEach(scene=>{scene.panels=scene.panels.map(panel=>({...panel,line:'Żółw, świetlik i jeż wyruszają razem po nową przygodę!'}));});
 const pdf=await PDFDocument.load(await createBookPdf(book,settings,Array(6).fill(image),font));
 proof.addPage((await proof.copyPages(pdf,[1]))[0]);
}
await writeFile(new URL('tmp/pdfs/eight-layouts-proof.pdf',root),await proof.save());
console.log('Verified eight templates and a generated illustration; wrote sample PDF and lettering metadata.');
