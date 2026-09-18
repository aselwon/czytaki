import {PDFDocument,rgb,type PDFFont,type PDFPage,type PDFImage} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type {Book,ProductInput,ComicPanel} from "../product";

const green=rgb(.09,.28,.22),muted=rgb(.39,.46,.36),cream=rgb(.99,.98,.94),ink=rgb(.055,.075,.075),white=rgb(1,1,1),caption=rgb(1,.97,.78);
export function wrapText(text:string,font:PDFFont,size:number,width:number){const words=text.replace(/[\r\n]+/g," ").trim().split(/\s+/),lines:string[]=[];let line="";for(const word of words){if(font.widthOfTextAtSize(word,size)>width){if(line){lines.push(line);line="";}let part="";for(const char of word){if(font.widthOfTextAtSize(part+char,size)>width){lines.push(part);part=char;}else part+=char;}line=part;continue;}const next=line?line+" "+word:word;if(font.widthOfTextAtSize(next,size)>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
function block(page:PDFPage,text:string,font:PDFFont,x:number,y:number,width:number,size:number,maxHeight:number,color=green){let lines=wrapText(text,font,size,width);while(lines.length*size*1.5>maxHeight&&size>13){size-=.5;lines=wrapText(text,font,size,width);}if(lines.length*size*1.5>maxHeight)throw new Error("PDF text exceeds layout bounds");for(const line of lines){page.drawText(line,{x,y,size,font,color});y-=size*1.5;}return y;}

type Rect={x:number;y:number;width:number;height:number};
const panels:Rect[]=[
 {x:47,y:549,width:500,height:245},
 {x:47,y:304,width:244,height:233},
 {x:303,y:304,width:244,height:233},
 {x:47,y:59,width:244,height:233},
 {x:303,y:59,width:244,height:233},
];
function drawBubble(page:PDFPage,panel:ComicPanel,font:PDFFont,rect:Rect,index:number){
 const width=index===0?242:198,height=index===0?74:70,x=rect.x+13,y=rect.y+rect.height-height-10;
 const isDialogue=panel.kind==="dialogue";
 if(isDialogue)page.drawEllipse({x:x+width/2,y:y+height/2,xScale:width/2,yScale:height/2,color:white,borderColor:ink,borderWidth:2.2});
 else page.drawRectangle({x,y,width,height,color:caption,borderColor:ink,borderWidth:2});
 let size=14,lines=wrapText(panel.line,font,size,width-35);
 while(lines.length*size*1.25>height-22&&size>12){size-=.5;lines=wrapText(panel.line,font,size,width-35);}
 if(lines.length*size*1.25>height-22)throw new Error("Comic bubble text exceeds bounds");
 const lineHeight=size*1.25,top=y+(height+lines.length*lineHeight)/2-lineHeight*.76;
 lines.forEach((line,i)=>page.drawText(line,{x:x+(width-font.widthOfTextAtSize(line,size))/2,y:top-i*lineHeight,font,size,color:ink}));
}
function drawComicPage(page:PDFPage,art:PDFImage,scene:Book["scenes"][number],font:PDFFont,index:number){
 page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:white});
 page.drawText(scene.title.toLocaleUpperCase("pl-PL"),{x:47,y:811,font,size:15,color:ink});
 page.drawText(String(index+1)+" / 6",{x:516,y:812,font,size:10,color:muted});
 page.drawImage(art,{x:47,y:59,width:500,height:735});
 // Opaque gutters enforce a stable five-panel grid regardless of small AI layout drift.
 for(const y of [292,537])page.drawRectangle({x:45,y,width:504,height:12,color:white});
 for(const y of [59,304])page.drawRectangle({x:291,y,width:12,height:233,color:white});
 panels.forEach((rect,i)=>{page.drawRectangle({...rect,borderColor:ink,borderWidth:3});drawBubble(page,scene.panels![i],font,rect,i);});
 page.drawText("czytaki.",{x:47,y:27,font,size:12,color:ink});
}
function drawStoryPage(page:PDFPage,art:PDFImage,scene:Book["scenes"][number],font:PDFFont,p:ProductInput,index:number){
 page.drawText("ROZDZIAŁ "+(index+1),{x:42,y:790,size:10,font,color:muted});
 block(page,scene.title,font,42,758,511,24,78);
 page.drawImage(art,{x:97.5,y:276,width:400,height:400});
 block(page,scene.text,font,42,239,511,p.age==="3-5"?21:18,180);
}
export async function createBookPdf(book:Book,p:ProductInput,images:Uint8Array[],fontBytes:Uint8Array){
 if(images.length!==6)throw new Error("Six illustrations required");
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fontBytes,{subset:true});
 pdf.setTitle(book.title);pdf.setAuthor("Czytaki");pdf.setSubject("Spersonalizowana książeczka");pdf.setLanguage("pl-PL");
 const art:PDFImage[]=[],imageCache=new Map<Uint8Array,PDFImage>();
 for(const bytes of images){let embedded=imageCache.get(bytes);if(!embedded){embedded=bytes[0]===137?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);imageCache.set(bytes,embedded);}art.push(embedded);}
 const comic=p.format==="comic"&&book.scenes.every(scene=>scene.panels?.length===5);
 const add=(n:number)=>{const page=pdf.addPage([595.28,841.89]);page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:cream});if(!comic||n===1||n===8){page.drawText("czytaki.",{x:42,y:28,size:12,font,color:muted});page.drawText(String(n)+" / 8",{x:516,y:28,size:10,font,color:muted});}return page;};
 const cover=add(1);
 if(comic){
  cover.drawImage(art[0],{x:126,y:71,width:343,height:514});
  cover.drawRectangle({x:126,y:71,width:343,height:514,borderWidth:3,borderColor:ink});
  cover.drawRectangle({x:35,y:612,width:525,height:178,color:white,borderWidth:3,borderColor:ink});
  cover.drawText("WŁASNY KOMIKS",{x:52,y:766,size:13,font,color:ink});
  block(cover,book.title,font,52,725,490,29,95,ink);
  cover.drawText("W roli głównej: "+p.name,{x:52,y:637,size:15,font,color:ink});
 }else{
  cover.drawText("TWOJA WŁASNA OPOWIEŚĆ",{x:42,y:790,size:11,font,color:muted});
  block(cover,book.title,font,42,748,511,32,150);
  cover.drawText("W roli głównej: "+p.name,{x:42,y:586,size:16,font,color:green});
  cover.drawImage(art[0],{x:77,y:137,width:441,height:441});
  block(cover,"Mały bohater. Wielka przygoda.",font,42,88,511,15,30,muted);
 }
 for(let i=0;i<6;i++){const page=add(i+2);if(comic)drawComicPage(page,art[i],book.scenes[i],font,i);else drawStoryPage(page,art[i],book.scenes[i],font,p,i);}
 const end=add(8);
 block(end,"Ta historia jest dla Ciebie",font,55,720,485,34,140);
 block(end,p.dedication||("Dla "+p.name+". Niech ciekawość prowadzi Cię do kolejnych niezwykłych przygód."),font,55,565,485,23,290);
 end.drawText("KONIEC TEJ PRZYGODY. POCZĄTEK NASTĘPNEJ.",{x:55,y:155,size:10,font,color:muted});
 block(end,"Opowieść i ilustracje przygotowane z pomocą AI, specjalnie na podstawie Twoich wyborów.",font,55,120,485,12,60,muted);
 return pdf.save();
}
