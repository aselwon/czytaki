import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import jpeg from 'jpeg-js';
import UPNG from '@pdf-lib/upng';
import {detectBubbleInteriors} from '../lib/server/bubble-detection.ts';
import {fitComicLettering} from '../lib/server/pdf.ts';
import {comicLayoutCount,comicTemplateIndex,comicLetteringBoxes} from '../lib/comic-layouts.ts';
import {sceneImageKey} from '../lib/server/comic-assets.ts';
import {editableLetteringBoxSchema,letteringBoxSchema} from '../lib/product.ts';

test('eight templates yield five actual blank interiors with room for long Polish copy',async()=>{
 assert.equal(comicLayoutCount,8);
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(await readFile(new URL('../lib/assets/LiberationSans-Regular.ttf',import.meta.url)));
 for(let index=0;index<8;index++){
  const image=new Uint8Array(await readFile(new URL(`../lib/assets/comic-templates/${index}.png`,import.meta.url)));
  const boxes=detectBubbleInteriors(image,index);assert.equal(boxes.length,5);
  for(const [i,box] of boxes.entries()){
   assert.equal(letteringBoxSchema.safeParse(box).success,true);
   if(i)assert.ok(box.y>boxes[i-1].y+boxes[i-1].height);
   assert.doesNotThrow(()=>fitComicLettering('Żółw, świetlik i jeż wyruszają razem po nową przygodę!',font,box.width*490,box.height*735));
  }
 }
});
test('the generated QA page has five usable bubbles; unlettered scenery is rejected',async()=>{
 const sample=new Uint8Array(await readFile(new URL('../public/comic-flow-sample.png',import.meta.url)));
 const boxes=detectBubbleInteriors(sample,0);
 assert.equal(boxes.length,5);
 const expected=JSON.parse(await readFile(new URL('../lib/assets/comic-flow-lettering.json',import.meta.url),'utf8'));
 assert.deepEqual(boxes,expected);
 const PNG=UPNG.default??UPNG,decoded=PNG.decode(sample.buffer.slice(sample.byteOffset,sample.byteOffset+sample.byteLength));
 const encoded=jpeg.encode({width:decoded.width,height:decoded.height,data:new Uint8Array(PNG.toRGBA8(decoded)[0])},85);
 assert.equal(detectBubbleInteriors(encoded.data,0).length,5);
 const scenery=new Uint8Array(await readFile(new URL('../public/forest.png',import.meta.url)));
 assert.throws(()=>detectBubbleInteriors(scenery,0),/bubble|bounds/);
});
test('templates rotate across books and asset paths preserve older artwork',()=>{
 const indices=new Set(Array.from({length:8},(_,i)=>comicTemplateIndex('Maja',i)));
 assert.equal(indices.size,8);
 assert.equal(sceneImageKey('order',null,0,'orders/order/comic-remake/book.pdf'),'orders/order/comic-remake/scene-0.jpg');
 assert.equal(sceneImageKey('order',{comicLayoutVersion:1},0),'orders/order/comic-templates-v1/scene-0.jpg');
 assert.equal(sceneImageKey('order',{comicLayoutVersion:2},0),'orders/order/comic-overlay-v2/scene-0.jpg');
 assert.equal(sceneImageKey('order',null,0),'orders/order/scene-0.jpg');
 assert.equal(letteringBoxSchema.safeParse({x:.9,y:.1,width:.3,height:.1}).success,false);
});
test('runtime lettering boxes are deterministic and always fit the page',()=>{
 for(let index=0;index<comicLayoutCount;index++){
  const boxes=comicLetteringBoxes(index);
  assert.equal(boxes.length,5);
  for(const [i,box] of boxes.entries()){
   assert.equal(letteringBoxSchema.safeParse(box).success,true);
   if(i)assert.ok(box.y>boxes[i-1].y+boxes[i-1].height);
  }
 }
});
test('the editor accepts compact bubbles but still rejects unusably small ones',()=>{
 assert.equal(editableLetteringBoxSchema.safeParse({x:.1,y:.1,width:.12,height:.055}).success,true);
 assert.equal(editableLetteringBoxSchema.safeParse({x:.1,y:.1,width:.115,height:.055}).success,false);
 assert.equal(editableLetteringBoxSchema.safeParse({x:.1,y:.1,width:.12,height:.05}).success,false);
});
