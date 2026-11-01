import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planAdaptiveLettering} from '../lib/adaptive-lettering.ts';

test('closeup planner has bounded heap and runtime for original, uncertain and mirrored input',()=>{
  const raw=JSON.parse(readFileSync('./tests/fixtures/closeup-analysis.json','utf8'));
  const mirror=r=>({...r,x:1-r.x-r.width});
  const variants=[raw,{...raw,beats:raw.beats.map(b=>({...b,confidence:0}))},{...raw,protectedAreas:raw.protectedAreas.map(mirror),beats:raw.beats.map(b=>({...b,region:mirror(b.region),candidates:b.candidates.map(mirror),speaker:b.speaker?{...b.speaker,x:1-b.speaker.x}:null,speakerBounds:b.speakerBounds?mirror(b.speakerBounds):null}))}];
  const panels=raw.beats.map(b=>({kind:b.speaker?'dialogue':'narration',line:'Chodź ze mną!'}));
  const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  const report=[];
  for(const variant of variants){
   for(let i=0;i<10;i++)planAdaptiveLettering(variant,panels);
   const times=[],heaps=[];
   for(let i=0;i<7;i++){
    globalThis.gc?.();const before=process.memoryUsage().heapUsed,start=performance.now();
    const boxes=planAdaptiveLettering(variant,panels);
    times.push(performance.now()-start);heaps.push(Math.max(0,process.memoryUsage().heapUsed-before));
    const areas=[...variant.protectedAreas,...variant.beats.flatMap(b=>b.speakerBounds?[b.speakerBounds]:[])];
    for(const [index,box] of boxes.entries())if(box.placement!=='strip'&&(areas.some(a=>overlap(box,a))||boxes.slice(0,index).some(a=>a.placement!=='strip'&&overlap(box,a))))throw Error('Unsafe placement');
   }
   report.push({medianMs:times.sort((a,b)=>a-b)[3],heapBytes:Math.max(...heaps)});
  }
 console.log('Planner budget:',report);
 for(const result of report){assert.ok(result.medianMs<50,JSON.stringify(result));assert.ok(result.heapBytes<8*1024*1024,JSON.stringify(result));}
});
