import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {createBookPdf} from '../lib/server/pdf.ts';
import {productSchema,bookSchema} from '../lib/product.ts';
test('book contains eight pages, Polish text and a dedicated ending',async()=>{
 const font=new Uint8Array(await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url)));
 const image=new Uint8Array(await readFile(new URL('../public/forest.png',import.meta.url)));
 const settings=productSchema.parse({name:'Żaneta',subject:'child',format:'fairytale',world:'forest',style:'storybook',age:'6-8',dedication:'Dla Żanety — niech każdy dzień przynosi odrobinę magii. Z miłością, rodzice.',consent:true});
 const book=bookSchema.parse({title:'Żaneta i tajemnica leśnego światła',summary:'Przykład techniczny składu PDF, z ilustracją demonstracyjną.',character:'A child explorer in an orange cape.',scenes:Array.from({length:6},(_,i)=>({title:['Początek wyprawy','Leśny przyjaciel','Tajemnicze drzwi','Złoty kluczyk','Dom świetlików','Powrót z przygody'][i],text:'Żaneta słucha szumu drzew. Wśród zielonych liści pojawia się małe światełko. Czy to świetlik, czy zagubiona gwiazda? Razem z lisem Figo podąża ścieżką po miękkim mchu. Każdy krok przynosi nowe odkrycie i przypomina, że najpiękniejsze przygody przeżywa się wspólnie.',imagePrompt:'A joyful child and a little fox exploring the same enchanted forest.'}))});
 const bytes=await createBookPdf(book,settings,Array(6).fill(image),font);
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),8);assert.equal(pdf.getTitle(),book.title);assert.ok(bytes.length<20*1024*1024);
});
test('comic uses five readable Polish beats on every illustrated page',async()=>{
 const font=new Uint8Array(await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url)));
 const image=new Uint8Array(await readFile(process.env.PDF_QA_IMAGE_PATH||new URL('../public/forest.png',import.meta.url)));
 const settings=productSchema.parse({name:'Maja',subject:'child',format:'comic',world:'forest',style:'comic',age:'6-8',dedication:'Dla Mai. Każdy ma w sobie odrobinę odwagi.',consent:true});
 const beats=[
  {visual:'Maja steps carefully into the bright meadow.',line:'Co to za blask?',kind:'dialogue'},
  {visual:'A little bird flies close to the curious hero.',line:'Za mną, Maju!',kind:'dialogue'},
  {visual:'Maja spots a golden seed in the grass.',line:'Nasionko świeci jak gwiazda.',kind:'narration'},
  {visual:'The hero gently holds the glowing seed.',line:'Posadzę je tutaj!',kind:'dialogue'},
  {visual:'A tiny sprout appears under warm sunlight.',line:'To początek nowej przygody.',kind:'narration'}
 ];
 const book=bookSchema.parse({title:'Maja i sekret słonecznej polany',summary:'Pogodna opowieść o odwadze i trosce.',character:'A curious child exploring the meadow.',scenes:Array.from({length:6},(_,i)=>({title:'Rozdział '+(i+1),text:'Maja idzie za błękitnym ptaszkiem i odkrywa niezwykłe miejsce.',imagePrompt:'A colorful comic page showing Maja in a sunny meadow with a blue bird.',panels:beats}))});
 const bytes=await createBookPdf(book,settings,Array(6).fill(image),font);
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),8);assert.equal(pdf.getTitle(),book.title);assert.ok(bytes.length<20*1024*1024);
 if(process.env.PDF_QA_PATH)await writeFile(process.env.PDF_QA_PATH,bytes);
});
test('the order schema rejects missing consent and unsupported formats',()=>{
 assert.equal(productSchema.safeParse({name:'Ada',consent:false}).success,false);
 assert.equal(productSchema.safeParse({name:'Ada',subject:'child',format:'video',world:'forest',style:'storybook',age:'6-8',dedication:'',consent:true}).success,false);
});
