import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PDFDocument,rgb,pushGraphicsState,popGraphicsState,rectangle,clip,endPath} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {speechBubblePath} from '../lib/bubble-shape.mjs';
const root=new URL('../',import.meta.url);
const out=new URL('public/examples/',root);await mkdir(out,{recursive:true});
const generated='/Users/adam/.codex/generated_images/';
const examples=[
 {slug:'maja',name:'Maja',kind:'Dziecko',title:'Maja i szept lasu',split:512,file:'01a0b42a-bd88-7a21-b167-397183519989/exec-61545125-ac38-4449-a38c-5abde6c6dd36.png',story:'Maja usłyszała ciche ćwierkanie za zakrętem. Mały ptaszek zgubił drogę do domu. Razem odkryli, że świetliste rośliny wskazują ścieżkę do ukrytej doliny.',bubbles:[[.22,.05,'Kto mnie woła?'],[.76,.32,'Pomogę ci wrócić!'],[.20,.70,'Spójrz, tam jest ślad!'],[.76,.88,'To nasza dolina!'],[.25,.94,'Razem daliśmy radę!']]},
 {slug:'figo',name:'Figo',kind:'Pies',title:'Figo i morska wyprawa',split:500,file:'01a0d388-eca0-7731-9102-b4f3b0c29fb9/exec-8744fd10-c2dc-4e39-844f-f8e7b71cba37.png',story:'Przy brzegu Figo spotkał żółwika, który nie mógł odnaleźć morza. Ruszyli wzdłuż strumienia. Nos Figa i cierpliwość nowego przyjaciela okazały się najlepszym kompasem.',bubbles:[[.24,.10,'Czuję morską bryzę!'],[.26,.28,'Szukasz drogi?'],[.75,.55,'Chodź za mną!'],[.28,.81,'Już słychać fale!'],[.76,.94,'Dziękuję, przyjacielu!']]},
 {slug:'olek',name:'Olek',kind:'Dziecko',title:'Olek i zagubiona gwiazda',split:456,file:'01a0d388-eca0-7731-9102-b4f3b0c29fb9/exec-6530d6db-abee-4142-a95b-b3f24321fedc.png',story:'Gwiazda w dłoniach Olka mrugała coraz słabiej. Mały robot znał drogę do obserwatorium, lecz przed nimi wisiał uszkodzony most. Olek postanowił znaleźć bezpieczne przejście.',bubbles:[[.75,.10,'Odnajdziemy twój dom.'],[.27,.61,'Znam drogę!'],[.77,.60,'Przejdźmy ostrożnie.'],[.25,.95,'Drzwi się otwierają!'],[.77,.73,'Niebo już na nas czeka!']]},
 {slug:'julia',name:'Julia',kind:'Dorosła bohaterka',title:'Julia i ogród sekretów',split:432,file:'01a0d388-eca0-7731-9102-b4f3b0c29fb9/exec-b7d1c8b5-a0c1-406a-b93b-6c9b846d1798.png',story:'Za starym murem Julia odnalazła ogród, w którym kwiaty świeciły po zmroku. Złoty klucz pasował do małej bramy. Po drugiej stronie czekała niespodzianka dla każdego, kto potrafił słuchać.',bubbles:[[.25,.05,'Dokąd prowadzi klucz?'],[.76,.36,'Ta brama coś ukrywa!'],[.25,.72,'Słyszę szum wody.'],[.69,.66,'Ogród znów rozkwita!'],[.30,.92,'Podzielę się tym cudem.']]},
 {slug:'luna',name:'Luna',kind:'Kot',title:'Luna i nocne latarnie',split:412,file:'01a0d388-eca0-7731-9102-b4f3b0c29fb9/exec-aa648ce5-a8b4-4a5d-b3f3-91cb76ac0300.png',story:'Na dachach miasteczka gasły kolejne latarnie. Luna podążyła za świetlikiem i poprosiła sowę o wskazówkę. Wspólnie odkryli most prowadzący do źródła nocnego światła.',bubbles:[[.24,.05,'Kto zgasił latarnie?'],[.56,.43,'Pokażę ci drogę!'],[.83,.13,'Szukaj za mostem.'],[.25,.80,'Już prawie jesteśmy!'],[.76,.94,'Miasto znów rozbłysło!']]}
];
const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7);
for(const e of examples.filter(e=>!only||e.slug===only)){
 if(e.slug==='luna')e.bubbles[2]=[.60,.07,'Szukaj za mostem.'];
 // Existing source assets are sufficient for rebuilding without an AI call.
 try{await readFile(new URL(e.slug+'-source.png',out));}catch{await copyFile(generated+e.file,new URL(e.slug+'-source.png',out));}
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(await readFile(new URL('lib/assets/LiberationSans-Regular.ttf',root)),{subset:true});
 const p=doc.addPage([595.28,841.89]);const ink=rgb(.12,.16,.22);
 p.drawText('CZYTAKI / ROZDZIAŁ 3',{x:30,y:806,size:10,font,color:rgb(.36,.36,.48)});
 p.drawText(e.title,{x:30,y:778,size:23,font,color:ink});
 const im=await doc.embedPng(await readFile(new URL(e.slug+'-source.png',out)));
 const width=535,scale=width/(1536-e.split),height=1024*scale,bottom=754-height;
 p.pushOperators(pushGraphicsState(),rectangle(30,bottom,width,height),clip(),endPath());
 p.drawImage(im,{x:30-e.split*scale,y:bottom,width:1536*scale,height});p.pushOperators(popGraphicsState());
 function lines(text,size,max){const result=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>max&&line){result.push(line);line=word;}else line=next;}if(line)result.push(line);return result;}
 if(e.slug==='figo'){
  const placement=JSON.parse(await readFile(new URL('figo-placement.json',out),'utf8'));
  for(const [i,box] of placement.lettering.entries()){
   const bw=box.width*width,bh=box.height*height,x=30+box.x*width,y=754-box.y*height;
   const target={x:(box.speaker.x-box.x)/box.width,y:(box.speaker.y-box.y)/box.height};
   p.drawSvgPath(speechBubblePath(bw,bh,target),{x,y,color:rgb(1,1,1),borderColor:ink,borderWidth:1});
   let size=11,wrapped=lines(placement.panels[i].line,size,bw*.62);
   while(wrapped.length*size*1.2>bh*.56&&size>8){size-=.5;wrapped=lines(placement.panels[i].line,size,bw*.62);}
   if(wrapped.length*size*1.2>bh*.56)throw Error('Example lettering does not fit');
   wrapped.forEach((line,j)=>p.drawText(line,{x:x+(bw-font.widthOfTextAtSize(line,size))/2,y:y-bh/2+(wrapped.length-1)*size*.6-j*size*1.2-size*.33,size,font,color:ink}));
  }
 }else for(const [nx,ny,text] of e.bubbles){const x=30+nx*width,y=754-ny*height,rx=76,ry=21;const wrapped=lines(text,11,122);p.drawSvgPath(speechBubblePath(rx*2,ry*2),{x:x-rx,y:y+ry,color:rgb(1,1,1),borderColor:ink,borderWidth:1});wrapped.forEach((line,i)=>p.drawText(line,{x:x-font.widthOfTextAtSize(line,11)/2,y:y+ry*.14+(wrapped.length-1)*6-i*12-4,size:11,font,color:ink}));}
 p.drawRectangle({x:30,y:bottom-109,width:535,height:94,color:rgb(.97,.95,.89)});
 p.drawText('A tymczasem w naszej historii…',{x:44,y:bottom-36,size:12,font,color:ink});
 lines(e.story,11,501).forEach((line,i)=>p.drawText(line,{x:44,y:bottom-57-i*15,size:11,font,color:ink}));
 p.drawText('Przykładowy fragment historii • Opowieść i ilustracje przygotowano z pomocą AI.',{x:30,y:35,size:8,font,color:rgb(.4,.4,.45)});
 await writeFile(new URL(e.slug+'.pdf',out),await doc.save());
 execFileSync('pdftoppm',['-singlefile','-scale-to','1400','-png',new URL(e.slug+'.pdf',out).pathname,new URL(e.slug+'-page',out).pathname]);
}
await writeFile(new URL('examples.json',out),JSON.stringify(examples.map(({file,bubbles,...e})=>e),null,2));
console.log(only?`Updated PDF excerpt and preview: ${only}`:'Created five PDF excerpts and previews.');
