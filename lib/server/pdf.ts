import {PDFDocument,rgb,type PDFFont,type PDFPage,type PDFImage} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {speechBubblePath} from "../bubble-shape.mjs";
import {fitBubbleCopy} from "../bubble-copy.mjs";
import type {Book,ProductInput,ComicPanel} from "../product";
import {comicLayout as legacyComicLayout,type BubbleSlot} from "./comic-layouts.ts";
import {COMIC_LAYOUT_VERSION,comicLayout as overlayComicLayout,comicNarrativeTeaser} from "../comic-layouts.ts";

const pageWidth=595.28,pageHeight=841.89;
const green=rgb(.09,.28,.22),deep=rgb(.035,.13,.11),muted=rgb(.39,.46,.36),cream=rgb(.99,.98,.94),ink=rgb(.055,.075,.075),white=rgb(1,1,1),caption=rgb(1,.97,.78),gold=rgb(1,.69,.22),mist=rgb(.86,.95,.91);
export function wrapText(text:string,font:PDFFont,size:number,width:number){const words=text.replace(/[\r\n]+/g," ").trim().split(/\s+/),lines:string[]=[];let line="";for(const word of words){if(font.widthOfTextAtSize(word,size)>width){if(line){lines.push(line);line="";}let part="";for(const char of word){if(font.widthOfTextAtSize(part+char,size)>width){lines.push(part);part=char;}else part+=char;}line=part;continue;}const next=line?line+" "+word:word;if(font.widthOfTextAtSize(next,size)>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
function block(page:PDFPage,text:string,font:PDFFont,x:number,y:number,width:number,size:number,maxHeight:number,color=green){let lines=wrapText(text,font,size,width);while(lines.length*size*1.5>maxHeight&&size>13){size-=.5;lines=wrapText(text,font,size,width);}if(lines.length*size*1.5>maxHeight)throw new Error("PDF text exceeds layout bounds");for(const line of lines){page.drawText(line,{x,y,size,font,color});y-=size*1.5;}return y;}
function centered(page:PDFPage,text:string,font:PDFFont,size:number,y:number,color=ink,x=0,width=pageWidth){let fitted=size;while(font.widthOfTextAtSize(text,fitted)>width&&fitted>10)fitted-=.5;page.drawText(text,{x:x+(width-font.widthOfTextAtSize(text,fitted))/2,y,size:fitted,font,color});}
function fullBleed(page:PDFPage,art:PDFImage){page.drawImage(art,{x:0,y:-25.5,width:pageWidth,height:893});}

function drawBubble(page:PDFPage,panel:ComicPanel,font:PDFFont,slot:BubbleSlot,canvas={x:47,y:59,width:500,height:735}){
 const width=slot.width/500*canvas.width,height=slot.height/750*canvas.height,x=canvas.x+slot.x/500*canvas.width,y=canvas.y+canvas.height-(slot.y+slot.height)/750*canvas.height;
 const isDialogue=panel.kind==="dialogue";
 if(isDialogue)page.drawSvgPath(speechBubblePath(width,height,slot.speaker?{x:(slot.speaker.x*500-slot.x)/slot.width,y:(slot.speaker.y*750-slot.y)/slot.height}:null),{x,y:y+height,color:white,borderColor:ink,borderWidth:1.4});
 else page.drawRectangle({x,y,width,height,color:caption,borderColor:ink,borderWidth:1.8});
 const {area,size,lines,lineHeight}=fitBubbleCopy(panel.line,width,height,panel.kind,!!slot.speaker,(text:string,size:number)=>font.widthOfTextAtSize(text,size));
 const top=y+height*(1-area.cy)+lines.length*lineHeight/2-lineHeight*.76;
 lines.forEach((line,i)=>page.drawText(line,{x:x+(width-font.widthOfTextAtSize(line,size))/2,y:top-i*lineHeight,font,size,color:ink}));
}
export function comicSlots(scene:Book["scenes"][number],index:number,layoutVersion:Book["comicLayoutVersion"]):BubbleSlot[]{
 if(scene.lettering?.length===5)return scene.lettering.map(box=>({x:box.x*500,y:box.y*750,width:box.width*500,height:box.height*750,...(box.speaker?{speaker:box.speaker}:{})}));
 return (layoutVersion===COMIC_LAYOUT_VERSION?overlayComicLayout(scene.comicTemplate??index):legacyComicLayout(scene.comicTemplate??index)).bubbles.map(box=>({...box}));
}
export function fitComicLettering(text:string,font:PDFFont,width:number,height:number){
 let size=14,lines=wrapText(text,font,size,width);
 while(lines.length*size*1.2>height&&size>12){size-=.5;lines=wrapText(text,font,size,width);}
 if(lines.length*size*1.2>height)throw new Error("Comic lettering does not fit safely inside its empty bubble");
 return {size,lines,lineHeight:size*1.2};
}
function drawComicPage(page:PDFPage,art:PDFImage,scene:Book["scenes"][number],font:PDFFont,index:number,sceneCount:number,layoutVersion:Book["comicLayoutVersion"]){
 page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:white});
 const sceneTitle=scene.title.toLocaleUpperCase("pl-PL"),title=/^ROZDZIAŁ\s+\d+/u.test(sceneTitle)?sceneTitle:`ROZDZIAŁ ${index+1} · ${sceneTitle}`;let titleSize=15;while(font.widthOfTextAtSize(title,titleSize)>455&&titleSize>10)titleSize-=.5;
 page.drawText(title,{x:47,y:811,font,size:titleSize,color:ink});
 page.drawText(String(index+1)+" / "+sceneCount,{x:505,y:812,font,size:10,color:muted});
 if(layoutVersion){
  page.drawImage(art,{x:52.5,y:59,width:490,height:735});
  comicSlots(scene,index,layoutVersion).forEach((slot,i)=>drawBubble(page,scene.panels![i],font,slot,{x:52.5,y:59,width:490,height:735}));
 }else{
 page.drawImage(art,{x:47,y:59,width:500,height:735});
 page.drawRectangle({x:47,y:59,width:500,height:735,borderColor:ink,borderWidth:1.5});
 legacyComicLayout(index).bubbles.forEach((slot,i)=>drawBubble(page,scene.panels![i],font,slot));
 }
 const teaser=comicNarrativeTeaser(scene.text),boxX=52.5,boxY=59,boxWidth=490,boxHeight=67;
 page.drawRectangle({x:boxX,y:boxY,width:boxWidth,height:boxHeight,color:deep,opacity:.93,borderColor:white,borderWidth:1});
 page.drawText("ZAJAWKA ROZDZIAŁU",{x:boxX+13,y:boxY+boxHeight-15,font,size:6.8,color:gold});
 let teaserSize=8.2,lines=wrapText(teaser,font,teaserSize,boxWidth-26);
 while(lines.length>4&&teaserSize>6.8){teaserSize-=.2;lines=wrapText(teaser,font,teaserSize,boxWidth-26);}
 if(lines.length>4){const words=teaser.split(" ");while(words.length&&wrapText(words.join(" ")+"…",font,teaserSize,boxWidth-26).length>4)words.pop();lines=wrapText(words.join(" ")+"…",font,teaserSize,boxWidth-26);}
 const lineHeight=teaserSize*1.18;lines.forEach((line,i)=>page.drawText(line,{x:boxX+13,y:boxY+boxHeight-31-i*lineHeight,font,size:teaserSize,color:white}));
 page.drawText("czytaki.",{x:47,y:27,font,size:12,color:ink});
}
function drawStoryPage(page:PDFPage,art:PDFImage,scene:Book["scenes"][number],font:PDFFont,p:ProductInput,index:number){
 page.drawText("ROZDZIAŁ "+(index+1),{x:42,y:790,size:10,font,color:muted});
 block(page,scene.title,font,42,758,511,24,78);
 page.drawImage(art,{x:97.5,y:276,width:400,height:400});
 block(page,scene.text,font,42,239,511,p.age==="3-5"?21:18,180);
}
function drawCover(page:PDFPage,art:PDFImage,book:Book,p:ProductInput,font:PDFFont,comic:boolean){
 fullBleed(page,art);
 page.drawRectangle({x:0,y:568,width:pageWidth,height:274,color:deep,opacity:.93});
 page.drawRectangle({x:0,y:560,width:pageWidth,height:8,color:gold});
 page.drawText(comic?"SPERSONALIZOWANY KOMIKS":"SPERSONALIZOWANA OPOWIEŚĆ",{x:44,y:803,size:10,font,color:gold});
 block(page,book.title,font,44,758,507,34,135,white);
 page.drawText("W ROLI GŁÓWNEJ",{x:44,y:603,size:9,font,color:mist});
 let nameSize=22;while(font.widthOfTextAtSize(p.name,nameSize)>360&&nameSize>13)nameSize-=.5;
 page.drawText(p.name,{x:44,y:577,size:nameSize,font,color:white});
 page.drawRectangle({x:34,y:28,width:527,height:122,color:white,opacity:.94,borderColor:ink,borderWidth:2});
 page.drawText("TWOJA HISTORIA · TWÓJ BOHATER · TWOJA PRZYGODA",{x:52,y:126,size:9,font,color:green});
 block(page,book.summary,font,52,103,491,13,65,muted);
 page.drawText("czytaki.",{x:52,y:45,size:12,font,color:green});
 page.drawRectangle({x:14,y:14,width:pageWidth-28,height:pageHeight-28,borderColor:white,borderWidth:3,borderOpacity:.85});
}
function drawEnding(page:PDFPage,art:PDFImage,book:Book,p:ProductInput,font:PDFFont,totalPages:number){
 fullBleed(page,art);
 page.drawRectangle({x:0,y:0,width:pageWidth,height:pageHeight,color:deep,opacity:.26});
 page.drawRectangle({x:0,y:736,width:pageWidth,height:106,color:deep,opacity:.94});
 page.drawRectangle({x:0,y:728,width:pageWidth,height:8,color:gold});
 centered(page,"KONIEC TEJ PRZYGODY",font,10,806,gold,42,511);
 centered(page,book.title,font,20,766,white,42,511);
 page.drawRectangle({x:44,y:220,width:507,height:430,color:cream,opacity:.96,borderColor:gold,borderWidth:3});
 centered(page,"TA HISTORIA NALEŻY DO",font,10,610,green,74,447);
 centered(page,p.name,font,31,564,green,74,447);
 page.drawRectangle({x:74,y:543,width:447,height:3,color:gold});
 page.drawText("SPECJALNA DEDYKACJA",{x:74,y:510,size:9,font,color:muted});
 block(page,p.dedication||("Dla "+p.name+". Niech ciekawość prowadzi Cię do kolejnych niezwykłych przygód."),font,74,477,447,21,190,green);
 centered(page,"Zachowaj tę opowieść i wracaj do niej, kiedy tylko zechcesz.",font,11,255,muted,74,447);
 page.drawRectangle({x:0,y:0,width:pageWidth,height:112,color:deep,opacity:.96});
 centered(page,"KONIEC. A MOŻE DOPIERO POCZĄTEK?",font,14,72,white,42,511);
 centered(page,"Opowieść i ilustracje przygotowano z pomocą AI.",font,8.5,45,mist,42,511);
 page.drawText("czytaki.",{x:42,y:18,size:11,font,color:white});
 page.drawText(String(totalPages)+" / "+totalPages,{x:505,y:18,size:9,font,color:mist});
}
export async function createBookPdf(book:Book,p:ProductInput,images:Uint8Array[],fontBytes:Uint8Array){
 const sceneCount=book.scenes.length,totalPages=sceneCount+2;
 if(images.length!==sceneCount)throw new Error("One illustration per scene required");
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fontBytes,{subset:true});
 pdf.setTitle(book.title);pdf.setAuthor("Czytaki");pdf.setSubject("Spersonalizowana książeczka");pdf.setLanguage("pl-PL");
 const art:PDFImage[]=[],imageCache=new Map<Uint8Array,PDFImage>();
 for(const bytes of images){let embedded=imageCache.get(bytes);if(!embedded){embedded=bytes[0]===137?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);imageCache.set(bytes,embedded);}art.push(embedded);}
 const comic=p.format==="comic"&&book.scenes.every(scene=>scene.panels?.length===5);
 const add=(n:number)=>{const page=pdf.addPage([pageWidth,pageHeight]);page.drawRectangle({x:0,y:0,width:pageWidth,height:pageHeight,color:cream});if(n>1&&n<totalPages&&!comic){page.drawText("czytaki.",{x:42,y:28,size:12,font,color:muted});page.drawText(String(n)+" / "+totalPages,{x:505,y:28,size:10,font,color:muted});}return page;};
 const cover=add(1);
 drawCover(cover,art[0],book,p,font,comic);
 for(let i=0;i<sceneCount;i++){const page=add(i+2);if(comic)drawComicPage(page,art[i],book.scenes[i],font,i,sceneCount,book.comicLayoutVersion);else drawStoryPage(page,art[i],book.scenes[i],font,p,i);}
 const end=add(totalPages);
 drawEnding(end,art[sceneCount-1],book,p,font,totalPages);
 return pdf.save();
}
