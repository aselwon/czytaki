import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {comicSlots,createBookPdf} from '../lib/server/pdf.ts';
import {comicLayout,comicLayoutCount,comicLayoutPrompt,comicNarrativeTeaser} from '../lib/comic-layouts.ts';
import {productSchema,bookSchema,comicEditorSceneSchema,normalizeGeneratedBook} from '../lib/product.ts';
test('book contains eight pages, Polish text and a dedicated ending',async()=>{
 const font=new Uint8Array(await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url)));
 const image=new Uint8Array(await readFile(new URL('../public/forest.png',import.meta.url)));
 const settings=productSchema.parse({name:'Żaneta',subject:'child',format:'fairytale',world:'forest',style:'storybook',age:'6-8',dedication:'Dla Żanety — niech każdy dzień przynosi odrobinę magii. Z miłością, rodzice.',consent:true});
 const book=bookSchema.parse({title:'Żaneta i tajemnica leśnego światła',summary:'Przykład techniczny składu PDF, z ilustracją demonstracyjną.',character:'A child explorer in an orange cape.',scenes:Array.from({length:6},(_,i)=>({title:['Początek wyprawy','Leśny przyjaciel','Tajemnicze drzwi','Złoty kluczyk','Dom świetlików','Powrót z przygody'][i],text:'Żaneta słucha szumu drzew. Wśród zielonych liści pojawia się małe światełko. Czy to świetlik, czy zagubiona gwiazda? Razem z lisem Figo podąża ścieżką po miękkim mchu. Każdy krok przynosi nowe odkrycie i przypomina, że najpiękniejsze przygody przeżywa się wspólnie.',imagePrompt:'A joyful child and a little fox exploring the same enchanted forest.'}))});
 const bytes=await createBookPdf(book,settings,Array(6).fill(image),font);
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),8);assert.equal(pdf.getTitle(),book.title);assert.ok(bytes.length<20*1024*1024);
});
for(const pages of [15,30])test(`fairytale package creates ${pages} real PDF pages`,async()=>{
 const font=new Uint8Array(await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url)));
 const image=new Uint8Array(await readFile(new URL('../public/forest.png',import.meta.url)));
 const settings=productSchema.parse({name:'Olek',subject:'child',format:'fairytale',pages,world:'forest',style:'storybook',age:'6-8',dedication:'Dla Olka.',consent:true});
 const book=bookSchema.parse({title:'Olek i długa przygoda',summary:'Dłuższa książeczka przygotowana do kontroli prawdziwej liczby stron.',character:'A curious child explorer in a green jacket.',scenes:Array.from({length:pages-2},(_,i)=>({title:'Rozdział '+(i+1),text:'Olek odkrywa kolejną część magicznej krainy i pomaga spotkanym przyjaciołom.',imagePrompt:'A curious child explores another part of the same magical forest.'}))});
 const pdf=await PDFDocument.load(await createBookPdf(book,settings,Array(pages-2).fill(image),font));
 assert.equal(pdf.getPageCount(),pages);
});
for(const pages of [8,15,30])test(`comic renders ${pages} pages with five Polish beats per illustrated page`,async()=>{
 const font=new Uint8Array(await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url)));
 const image=new Uint8Array(await readFile(process.env.PDF_QA_IMAGE_PATH||new URL('../public/forest.png',import.meta.url)));
 const settings=productSchema.parse({name:'Maja',subject:'child',format:'comic',pages,world:'forest',style:'comic',age:'6-8',dedication:'Dla Mai. Każdy ma w sobie odrobinę odwagi.',consent:true});
 const beats=[
  {visual:'Maja steps carefully into the bright meadow.',line:'Co to za blask?',kind:'dialogue'},
  {visual:'A little bird flies close to the curious hero.',line:'Za mną, Maju!',kind:'dialogue'},
  {visual:'Maja spots a golden seed in the grass.',line:'Nasionko świeci jak gwiazda.',kind:'narration'},
  {visual:'The hero gently holds the glowing seed.',line:'Posadzę je tutaj!',kind:'dialogue'},
  {visual:'A tiny sprout appears under warm sunlight.',line:'To początek nowej przygody.',kind:'narration'}
 ];
 const lettering=[{x:.05,y:.04,width:.2,height:.08},{x:.57,y:.2,width:.36,height:.12},{x:.05,y:.36,width:.36,height:.12},{x:.57,y:.54,width:.36,height:.12},{x:.05,y:.76,width:.42,height:.12}];
 const book=bookSchema.parse({title:'Maja i sekret słonecznej polany',summary:'Pogodna opowieść o odwadze i trosce.',character:'A curious child exploring the meadow.',comicLayoutVersion:2,scenes:Array.from({length:pages-2},(_,i)=>({title:'Rozdział '+(i+1),text:'Maja idzie za błękitnym ptaszkiem i odkrywa niezwykłe miejsce.',imagePrompt:'A colorful comic page showing Maja in a sunny meadow with a blue bird.',panels:beats,comicTemplate:i%8,lettering}))});
 const bytes=await createBookPdf(book,settings,Array(pages-2).fill(image),font);
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),pages);assert.equal(pdf.getTitle(),book.title);assert.ok(bytes.length<20*1024*1024);
 for(const page of pdf.getPages()){assert.ok(page.getWidth()>0);assert.ok(page.getHeight()>page.getWidth());}
 if(process.env.PDF_QA_PATH&&pages===8)await writeFile(process.env.PDF_QA_PATH,bytes);
});
test('comic has eight distinct full-page layouts with five non-overlapping bubble spaces',()=>{
 assert.equal(comicLayoutCount,8);
 const patterns=new Set();
 for(let page=0;page<comicLayoutCount;page++){
  const layout=comicLayout(page);
  assert.equal(layout.bubbles.length,5);
  assert.match(comicLayoutPrompt(page),/bottom 9%/);assert.match(comicLayoutPrompt(page),/No white gutters/);
  patterns.add(JSON.stringify(layout.bubbles));
  for(const [i,box] of layout.bubbles.entries()){
   assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=500&&box.y+box.height<=735);
   if(i)assert.ok(box.y>=layout.bubbles[i-1].y+layout.bubbles[i-1].height);
  }
 }
 assert.equal(patterns.size,8);
});
test('saved HTML editor coordinates override the preset in the PDF renderer',()=>{
 const lettering=[{x:.08,y:.06,width:.36,height:.12},{x:.55,y:.2,width:.36,height:.12},{x:.08,y:.36,width:.36,height:.12},{x:.55,y:.54,width:.36,height:.12},{x:.08,y:.76,width:.36,height:.12}];
 const panels=Array.from({length:5},()=>({visual:'A clear comic moment with the main character.',line:'Krótki tekst.',kind:'dialogue'}));
 const scene={title:'Plansza',text:'Opis sceny do testu.',imagePrompt:'A continuous illustrated comic page with five story moments.',comicTemplate:7,panels,lettering};
 assert.deepEqual(comicSlots(scene,0,2)[0],{x:40,y:45,width:180,height:90});
});
test('the order schema rejects missing consent and unsupported formats',()=>{
 assert.equal(productSchema.safeParse({name:'Ada',consent:false}).success,false);
 assert.equal(productSchema.safeParse({name:'Ada',subject:'child',format:'video',world:'forest',style:'storybook',age:'6-8',dedication:'',consent:true}).success,false);
});
test('the order schema supports original hero archetypes and safe custom notes',()=>{
 const parsed=productSchema.parse({name:'Maja',subject:'child',format:'comic',heroRole:'web',heroIdea:'',world:'city',style:'comic',age:'6-8',dedication:'',consent:true});
 assert.equal(parsed.heroRole,'web');
 assert.equal(parsed.world,'city');
 assert.equal(productSchema.safeParse({...parsed,heroRole:'famous-franchise-character'}).success,false);
 assert.equal(productSchema.safeParse({...parsed,heroIdea:'x'.repeat(121)}).success,false);
});
test('overlong AI comic copy is shortened without dropping the five panels',()=>{
 const raw={title:'Tajemnicza przygoda',summary:'Krótki opis pięknej przygody.',character:'A cheerful child in a green jacket.',scenes:Array.from({length:6},()=>({title:'Początek',text:'Dziecko wyrusza na pełną odkryć przygodę.',imagePrompt:'A child begins a colorful adventure in the garden.',panels:Array.from({length:5},()=>({visual:'A child explores a sunny garden full of surprises. '.repeat(7),line:'Nie mogę uwierzyć, ile niespodzianek czeka tutaj na nas! '.repeat(2),kind:'dialogue'}))}))};
 const book=normalizeGeneratedBook(raw);
 assert.equal(book.scenes.length,6);
 assert.ok(book.scenes.every(scene=>scene.panels.length===5&&scene.panels.every(panel=>panel.line.length<=55&&panel.visual.length<=220)));
 assert.equal(bookSchema.safeParse(book).success,true);
 assert.throws(()=>normalizeGeneratedBook({...raw,scenes:[]}));
});
test('comic prose becomes a concise narrative teaser beside the five bubbles',()=>{
 const source='Makumba słyszy tajemniczy szmer wśród wysokich drzew. Ostrożnie rusza jego śladem i spotyka zaniepokojonego ptaszka. Nowy przyjaciel prosi go o pomoc w odnalezieniu drogi do domu. Razem zaczynają niezwykłą leśną wyprawę. Każdy kolejny krok prowadzi ich w głąb magicznej krainy.';
 const teaser=comicNarrativeTeaser(source);assert.ok(teaser.length<=260);assert.match(teaser,/Makumba słyszy/);assert.match(teaser,/ptaszka\./);assert.doesNotMatch(teaser,/Każdy kolejny krok/);
});
test('manual comic editing accepts longer copy while generated copy stays concise',()=>{
 const longLine='To trochę dłuższa wypowiedź wpisana ręcznie, która nadal może zmieścić się w dużym dymku.';
 const scene={title:'Plansza',text:'Krótka zajawka narracyjna, która wprowadza czytelnika do rozdziału.',comicTemplate:0,panels:Array.from({length:5},()=>({visual:'A clear visual moment for this part of the comic.',line:longLine,kind:'dialogue'})),lettering:Array.from({length:5},(_,index)=>({x:.05,y:.04+index*.18,width:.6,height:.12}))};
 assert.equal(comicEditorSceneSchema.safeParse(scene).success,true);
 assert.equal(longLine.length>55,true);
});
for(const targeted of [false,true])test(`smallest editable bubble rejects overflowing text (${targeted?'speaker-linked':'legacy'})`,async()=>{
 const font=new Uint8Array(await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url)));
 const image=new Uint8Array(await readFile(new URL('../public/forest.png',import.meta.url)));
 const settings=productSchema.parse({name:'Maja',format:'comic',world:'forest',style:'comic',age:'6-8',dedication:'',consent:true});
 const scene={title:'Test ciasnego dymka',text:'Przykładowa plansza do kontroli składu.',imagePrompt:'A colorful test page with five distinct story moments.',comicTemplate:0,
  panels:Array.from({length:5},()=>({visual:'The hero waves at a friend in the forest.',line:'Hej!',kind:'dialogue'})),
  lettering:Array.from({length:5},(_,i)=>({x:.1,y:.05+i*.16,width:.12,height:.055,...(targeted?{speaker:{x:.3,y:.1+i*.16}}:{})}))};
 const book=bookSchema.parse({title:'Maja i próba dymków',summary:'Techniczny test małych dymków i zbyt długiego tekstu.',character:'A curious child exploring the forest.',comicLayoutVersion:2,scenes:Array.from({length:6},()=>structuredClone(scene))});
 const valid=await createBookPdf(book,settings,Array(6).fill(image),font);
 assert.equal((await PDFDocument.load(valid)).getPageCount(),8);
 book.scenes[0].panels[0].line='To bardzo długa wypowiedź, która nie powinna wyjść poza mały dymek na tej planszy.';
 await assert.rejects(createBookPdf(book,settings,Array(6).fill(image),font),/Comic bubble text exceeds bounds/);
});

test('five 55-character captions fit outside the illustration and produce a PDF',async()=>{
 const {comicPageLayout}=await import('../lib/server/pdf.ts');
 const {planAdaptiveLettering}=await import('../lib/adaptive-lettering.ts');
 const {default:fontkit}=await import('@pdf-lib/fontkit');
 const fontBytes=await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url));
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(fontBytes);
 const raw=JSON.parse(await readFile(new URL('./fixtures/closeup-analysis.json',import.meta.url),'utf8'));
 raw.protectedAreas=[{x:0,y:0,width:1,height:1}];
 const panels=Array.from({length:5},()=>({visual:'A synthetic close-up of a shiny star-shaped brooch.',line:'W'.repeat(55),kind:'dialogue'}));
 const scene={title:'Próba podpisów',text:'Zajawka rozdziału o niezwykłej przygodzie.',imagePrompt:'A synthetic comic illustration with five visual story beats.',panels,lettering:planAdaptiveLettering(raw,panels)};
 const layout=comicPageLayout(scene,font);
 assert.equal(layout.captions.length,5);
 for(const [i,c] of layout.captions.entries()){
  assert.ok(c.y<=layout.art.y);assert.ok(c.y-c.lines.length*c.lineHeight>=59);
  assert.ok(c.lines.every(line=>font.widthOfTextAtSize(line,c.size)<=c.width));
  // Wrapping represents whitespace at a line break rather than in a text run.
  assert.equal(c.lines.join('').replaceAll(' ',''),`${i+1}.${panels[i].line}`);
  assert.ok(c.lines.length*c.lineHeight<=c.height);
 }
 const book=bookSchema.parse({title:'Próba bezpiecznych podpisów',summary:'Pięć podpisów znajduje się poza ilustracją.',character:'A synthetic character with a star brooch.',comicLayoutVersion:2,scenes:Array.from({length:6},()=>scene)});
 const settings=productSchema.parse({name:'Maja',format:'comic',world:'forest',style:'comic',age:'6-8',dedication:'',consent:true});
 const image=new Uint8Array(await readFile(new URL('../public/forest.png',import.meta.url)));
 const bytes=await createBookPdf(book,settings,Array(6).fill(image),new Uint8Array(fontBytes));
 assert.equal((await PDFDocument.load(bytes)).getPageCount(),8);
});
