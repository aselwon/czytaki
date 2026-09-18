import {mkdir,writeFile} from 'node:fs/promises';
import UPNG from '@pdf-lib/upng';
const PNG=UPNG.default??UPNG;
import {comicLayouts,templateTail} from '../lib/comic-layouts.ts';
const width=1024,height=1536,scale=width/500;
const out=new URL('../lib/assets/comic-templates/',import.meta.url);
await mkdir(out,{recursive:true});
const insideTriangle=(x,y,points)=>{
 const signs=points.map((a,i)=>{const b=points[(i+1)%3];return (x-b[0])*(a[1]-b[1])-(a[0]-b[0])*(y-b[1]);});
 return !(signs.some(v=>v<0)&&signs.some(v=>v>0));
};
for(const [index,layout] of comicLayouts.entries()){
 const rgba=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=x/scale,py=y/scale;let fill=[204,225,235];
  for(const box of layout.bubbles){
   const cx=box.x+box.width/2,cy=box.y+box.height/2,rx=box.width/2,ry=box.height/2;
   const tail=templateTail(box),innerTail=tail.map(([tx,ty],i)=>[tx+(i===0?3:i===1?-3:0),ty+(i<2?-2:-5)]);
   if(insideTriangle(px,py,tail))fill=[24,34,42];
   if(insideTriangle(px,py,innerTail))fill=[255,255,255];
   if(((px-cx)/rx)**2+((py-cy)/ry)**2<=1)fill=[24,34,42];
   if(((px-cx)/(rx-2))**2+((py-cy)/(ry-2))**2<=1)fill=[255,255,255];
  }
  const p=(y*width+x)*4;rgba.set([...fill,255],p);
 }
 await writeFile(new URL(`${index}.png`,out),new Uint8Array(PNG.encode([rgba.buffer],width,height,0)));
}
console.log(`Prepared ${comicLayouts.length} empty-bubble templates.`);
