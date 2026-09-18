import UPNG from "@pdf-lib/upng";
import jpeg from "jpeg-js";
import {comicLayout,type LetteringBox} from "../comic-layouts.ts";
const PNG=(UPNG as unknown as {default?:typeof UPNG}).default??UPNG;

type Region={id:number;count:number;left:number;top:number;right:number;bottom:number};

// Find a genuinely empty rectangle inside a generated balloon. Unlike placing
// a new white shape over the art, this cannot cover a drawn face or hand.
export function detectBubbleInteriors(image:Uint8Array,templateIndex:number):LetteringBox[]{
 let decoded:{width:number;height:number},pixels:Uint8Array;
 if(image[0]===137){const png=PNG.decode(image.slice().buffer as ArrayBuffer);decoded=png;pixels=new Uint8Array(PNG.toRGBA8(png)[0]);}
 else{const jpg=jpeg.decode(image,{useTArray:true,formatAsRGBA:true,maxResolutionInMP:4,maxMemoryUsageInMB:48});decoded=jpg;pixels=jpg.data;}
 if(decoded.width>2048||decoded.height>3072)throw new Error("Comic image exceeds detection bounds");
 const width=512,height=Math.round(decoded.height/decoded.width*width),size=width*height;
 const white=new Uint8Array(size),labels=new Int32Array(size),queue=new Int32Array(size);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const offset=(Math.floor(y*decoded.height/height)*decoded.width+Math.floor(x*decoded.width/width))*4;
  const r=pixels[offset],g=pixels[offset+1],b=pixels[offset+2];
  white[y*width+x]=Number(Math.min(r,g,b)>=240&&Math.max(r,g,b)-Math.min(r,g,b)<=15&&pixels[offset+3]>=250);
 }
 const regions:Region[]=[];let id=0;
 for(let start=0;start<size;start++){
  if(!white[start]||labels[start])continue;
  const region:Region={id:++id,count:0,left:width,top:height,right:0,bottom:0};
  let read=0,write=1;queue[0]=start;labels[start]=id;
  while(read<write){
   const pos=queue[read++],x=pos%width,y=Math.floor(pos/width);
   region.count++;region.left=Math.min(region.left,x);region.right=Math.max(region.right,x);region.top=Math.min(region.top,y);region.bottom=Math.max(region.bottom,y);
   for(const next of [x>0?pos-1:-1,x<width-1?pos+1:-1,y>0?pos-width:-1,y<height-1?pos+width:-1]){
    if(next>=0&&white[next]&&!labels[next]){labels[next]=id;queue[write++]=next;}
   }
  }
  const w=(region.right-region.left+1)/width,h=(region.bottom-region.top+1)/height;
  if(region.left>0&&region.top>0&&region.right<width-1&&region.bottom<height-1&&w>=.22&&w<=.7&&h>=.045&&h<=.22&&region.count>=size*.008)regions.push(region);
 }
 const used=new Set<number>();
 return comicLayout(templateIndex).bubbles.map(slot=>{
  const cx=(slot.x+slot.width/2)/500,cy=(slot.y+slot.height/2)/750;
  const candidates=regions.filter(r=>!used.has(r.id)).map(region=>{
   const dx=Math.abs((region.left+region.right)/2/width-cx),dy=Math.abs((region.top+region.bottom)/2/height-cy);
   return {region,dx,dy,score:dx+dy*3+Math.abs((region.right-region.left)/width-slot.width/500)*.3};
  }).filter(v=>v.dx<.3&&v.dy<.095).sort((a,b)=>a.score-b.score);
  const selected=candidates[0]?.region;
  if(!selected)throw new Error("Expected five empty, separated speech bubbles");
  used.add(selected.id);
  // Largest rectangle of white pixels within this connected region. A dark
  // mark or illustrated detail breaks it, so lettering stays on blank paper.
  const histogram=new Int32Array(selected.right-selected.left+1);
  let best={area:0,x:0,y:0,w:0,h:0};
  for(let y=selected.top;y<=selected.bottom;y++){
   for(let x=0;x<histogram.length;x++)histogram[x]=labels[y*width+selected.left+x]===selected.id?histogram[x]+1:0;
   const stack:number[]=[];
   for(let x=0;x<=histogram.length;x++){
    const current=x===histogram.length?0:histogram[x];
    while(stack.length&&histogram[stack[stack.length-1]]>current){
     const h=histogram[stack.pop()!],left=stack.length?stack[stack.length-1]+1:0,w=x-left;
     if(w*h>best.area)best={area:w*h,x:selected.left+left,y:y-h+1,w,h};
    }
    stack.push(x);
   }
  }
  const margin=5,box={x:(best.x+margin)/width,y:(best.y+margin)/height,width:(best.w-margin*2)/width,height:(best.h-margin*2)/height};
  if(box.width<.22||box.height<.04)throw new Error("Speech bubble is too small for readable lettering");
  return box;
 });
}
