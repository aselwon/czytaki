import test from 'node:test';
import assert from 'node:assert/strict';
import {speechBubblePath} from '../lib/bubble-shape.mjs';
import {productSchema} from '../lib/product.ts';
test('speech balloon is a single closed curved contour inside its saved box',()=>{
 for(const [w,h] of [[100,100],[152,42],[60,40],[210,58]]){
  const path=speechBubblePath(w,h);
  assert.equal((path.match(/M /g)||[]).length,1);assert.ok(path.endsWith(' Z'));assert.ok(path.includes(' Q '));assert.ok(!path.includes(' L '));
  const numbers=path.match(/[\d.]+/g).map(Number);
  numbers.forEach((n,i)=>assert.ok(n>=0&&n<=(i%2?h:w)));
 }
 assert.throws(()=>speechBubblePath(-1,40));
});
test('photo-first orders do not require a category; legacy orders remain valid',()=>{
 const input={name:'Kapitan Miś',format:'comic',world:'forest',style:'comic',age:'6-8',dedication:'',consent:true};
 assert.equal(productSchema.parse(input).subject,'auto');
 for(const subject of ['auto','child','person','pet'])assert.equal(productSchema.parse({...input,subject}).subject,subject);
});
