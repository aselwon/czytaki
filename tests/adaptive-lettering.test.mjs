import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planAdaptiveLettering} from '../lib/adaptive-lettering.ts';
import {speechBubblePath} from '../lib/bubble-shape.mjs';
const panels=Array.from({length:5},()=>({kind:'dialogue',line:'Chodź ze mną!'}));
test('real Figo vision fixture places first bubble beside the right-hand dog',async()=>{
 const raw=JSON.parse(await readFile(new URL('./fixtures/figo-analysis.json',import.meta.url),'utf8'));
 const lines=['Czuję morską bryzę!','Szukasz drogi?','Chodź za mną!','Już słychać fale!','Dziękuję, przyjacielu!'];
 const placed=planAdaptiveLettering(raw,lines.map(line=>({line,kind:'dialogue'})));
 assert.ok(placed[0].x>.5);assert.ok(placed[1].x+placed[1].width/2<.5);
 assert.equal(placed[4].speaker.x,raw.beats[4].speaker.x);
});
function analysis(right=false){return {protectedAreas:[],beats:Array.from({length:5},(_,i)=>({index:i,confidence:.96,speaker:{x:right?.8:.2,y:.07+i*.17},speakerBounds:{x:right?.76:.14,y:.01+i*.17,width:.10,height:.12},region:{x:0,y:i*.17,width:1,height:.17},candidates:[{x:right?.52:.28,y:.03+i*.17,width:.20,height:.10}]}))};}
test('same scene mirrored: bubble follows the speaker instead of a fixed template',()=>{
 for(const right of [false,true]){
  const placed=planAdaptiveLettering(analysis(right),panels);
  assert.equal(placed.length,5);
  placed.forEach(box=>{assert.equal(box.speaker.x,right?.8:.2);assert.equal(box.x+box.width/2>.5,right);});
 }
});
test('placement does not depend on a species or person category',()=>{
 for(const name of ['pies','jeleń','dziecko','zabawka'])assert.equal(planAdaptiveLettering(analysis(true),panels.map(p=>({...p,line:`Hej, ${name}!`}))).length,5);
});
test('unsafe, uncertain and duplicate speaker maps fail closed',()=>{
 for(const mutate of [
  a=>{a.beats[0].confidence=.4;},
  a=>{a.protectedAreas=[{...a.beats[0].region}];},
  a=>{a.beats[0].speaker=null;},
  a=>{a.beats[1].index=0;},
  a=>{a.beats[0].region.height=.02;},
 ]){const a=analysis();mutate(a);assert.throws(()=>planAdaptiveLettering(a,panels));}
});
test('bad model candidates are replaced by safe local search, never by a fixed template',()=>{
 const a=analysis(true);a.beats.forEach(beat=>{beat.candidates[0].x=.02;});
 planAdaptiveLettering(a,panels).forEach(box=>assert.ok(box.x+box.width/2>=.5));
});
test('tail points toward the saved speaker and stays within the placement box',()=>{
 const left=speechBubblePath(200,80,{x:-1,y:.5}),right=speechBubblePath(200,80,{x:2,y:.5});
 assert.notEqual(left,right);assert.match(left,/4\.000 40\.000/);assert.match(right,/196\.000 40\.000/);
 for(const path of [left,right,speechBubblePath(200,80,{x:.5,y:-1})]){assert.equal((path.match(/M /g)||[]).length,1);assert.ok(path.endsWith(' Z'));}
});
