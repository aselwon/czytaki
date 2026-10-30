import test from 'node:test';
import assert from 'node:assert/strict';
import {bubbleCopyArea,fitBubbleCopy} from '../lib/bubble-copy.mjs';
test('all corners of targeted copy rectangle stay inside the oval body',()=>{
 const a=bubbleCopyArea('dialogue',true);
 assert.ok((a.width/2/.37)**2+(a.height/2/.32)**2<1);
 assert.equal(a.cx,.5);assert.equal(a.cy,.5);
});
test('narration does not lose its text area when a speaker position is retained',()=>{
 assert.deepEqual(bubbleCopyArea('narration',true),bubbleCopyArea('narration',false));
});
test('shared copy fitting respects both bounds and rejects an impossible glyph',()=>{
 const measure=(text,size)=>text.length*size*.6;
 const fit=fitBubbleCopy('Razem odkryjemy tajemnicę lasu!',147,110,'dialogue',true,measure);
 assert.ok(fit.lines.length>1);
 assert.ok(fit.lines.every(line=>measure(line,fit.size)<=147*fit.area.width));
 assert.ok(fit.lines.length*fit.lineHeight<=110*fit.area.height-4);
 assert.throws(()=>fitBubbleCopy('W',1,100,'dialogue',true,measure),/exceeds bounds/);
});
