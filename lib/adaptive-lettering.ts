import {z} from 'zod';
import {fitBubbleCopy} from './bubble-copy.mjs';
const point=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)});
const rectBase=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().positive().max(1),height:z.number().positive().max(1)});
const rect=rectBase.refine(r=>r.x+r.width<=1.001&&r.y+r.height<=1.001);
export const visualPlacementSchema=z.object({protectedAreas:z.array(rect).max(80),beats:z.array(z.object({index:z.number().int().min(0).max(4),confidence:z.number().min(0).max(1),speaker:point.nullable(),speakerBounds:rect.nullable(),region:rect,candidates:z.array(rectBase).min(1).max(5)})).length(5)});
export type PlacementAnalysis=z.infer<typeof visualPlacementSchema>;
export type Rect=z.infer<typeof rect>;
export type AdaptiveBox=Rect&{speaker?:z.infer<typeof point>; placement:'bubble'|'caption'|'strip'; reason:string};
export const stripLettering=(reason:string):AdaptiveBox[]=>Array.from({length:5},(_,index)=>({x:0,y:0,width:1,height:.1,placement:'strip',reason:`Beat ${index}: ${reason}`}));
export function parsePlacementAnalysis(raw:unknown){
 const analysis=visualPlacementSchema.parse(raw);
 if(new Set(analysis.beats.map(b=>b.index)).size!==5)throw Error('Incomplete speaker map');
 return analysis;
}
const intersects=(a:Rect,b:Rect,gap=0)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
const inside=(a:Rect,b:Rect)=>a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width+.001&&a.y+a.height<=b.y+b.height+.001;
// Segment/rectangle intersection prevents attributing a bubble across another body.
function crossesArea(from:{x:number;y:number},to:{x:number;y:number},area:Rect){
 let start=0,end=1;
 for(const axis of ['x','y'] as const){
  const delta=to[axis]-from[axis],min=area[axis],max=min+(axis==='x'?area.width:area.height);
  if(delta===0){if(from[axis]<min||from[axis]>max)return false;}
  else{const a=(min-from[axis])/delta,b=(max-from[axis])/delta;start=Math.max(start,Math.min(a,b));end=Math.min(end,Math.max(a,b));}
 }
 return start<=end;
}
export function planAdaptiveLettering(raw:unknown,panels:readonly {kind:string;line:string}[]):AdaptiveBox[]{
 let analysis:PlacementAnalysis;
 try{analysis=parsePlacementAnalysis(raw);}catch{return stripLettering('Invalid placement analysis');}
 if(panels.length!==5)return stripLettering('Incomplete panels');
 const beats=[...analysis.beats].sort((a,b)=>a.index-b.index);
 const protectedAreas=[...analysis.protectedAreas,...beats.flatMap(b=>b.speakerBounds?[b.speakerBounds]:[])];
 const result:AdaptiveBox[]=[];
 for(const [i,beat] of beats.entries()){
  const speaker=beat.speaker;
  const certain=panels[i].kind==='dialogue'&&beat.confidence>=.85&&speaker&&beat.speakerBounds&&inside({x:speaker.x,y:speaker.y,width:0,height:0},beat.speakerBounds);
  const candidateFor=(dialogue:boolean):AdaptiveBox|undefined=>{
   // Keep the bottom teaser strip clear; captions may use any other free space.
   const region=dialogue?beat.region:{x:0,y:0,width:1,height:.90};
   // The model locates content; deterministic search also explores nearby empty
   // space instead of relying on the model to do precise typesetting arithmetic.
   const proposals=[...beat.candidates];
   for(const width of [.12,.14,.16,.20,.24,.28,.32,.38])for(const height of [.065,.08,.10,.12,.14]){
    for(let y=region.y;y+height<=Math.min(.90,region.y+region.height)+.001;y+=.01)
     for(let x=region.x;x+width<=region.x+region.width+.001;x+=.01)proposals.push({x,y,width,height});
   }
   // Copy fitting depends on dimensions, not position; reuse it across the grid.
   const fitCache=new Map<string,boolean>();
   const fits=(box:Rect)=>{
    const key=box.width+':'+box.height;
    if(!fitCache.has(key)){
     try{fitBubbleCopy(panels[i].line,box.width*490,box.height*735,panels[i].kind,dialogue,(text:string,size:number)=>text.length*size*.6);fitCache.set(key,true);}
     catch{fitCache.set(key,false);}
    }
    return fitCache.get(key)!;
   };
   const candidates=proposals.filter(box=>{
    if(box.x+box.width>1||box.width<.12||box.width>.46||box.height<.065||box.height>.15||box.y+box.height>.90||!inside(box,region))return false;
    if(protectedAreas.some(area=>intersects(box,area,.02))||result.some(prior=>prior.placement!=='strip'&&intersects(box,prior,.008)))return false;
    if(dialogue&&speaker&&beat.speakerBounds){
     const body=beat.speakerBounds;
     const dx=Math.max(box.x-body.x-body.width,body.x-box.x-box.width,0);
     const dy=Math.max(box.y-body.y-body.height,body.y-box.y-box.height,0);
     // Beside the visible body, or directly above its head, even in a close-up.
     if(!(dx<=.12&&dy===0||dy<=.12&&dx===0&&box.y+box.height<=body.y))return false;
     const anchor={x:Math.max(box.x,Math.min(speaker.x,box.x+box.width)),y:Math.max(box.y,Math.min(speaker.y,box.y+box.height))};
     if(protectedAreas.some(area=>!intersects(area,body)&&crossesArea(anchor,speaker,area)))return false;
    }
    return fits(box);
   }).map(box=>({...box,...(dialogue&&speaker?{speaker}: {}),placement:dialogue?'bubble' as const:'caption' as const,reason:`Beat ${i}: ${dialogue?'Visible speaker':certain?'No safe space beside speaker':panels[i].kind==='dialogue'?'Uncertain or missing speaker':'Narration'}`}));
   return candidates.sort((a,b)=>dialogue&&speaker?Math.hypot(a.x+a.width/2-speaker.x,(a.y+a.height/2-speaker.y)*1.5)-Math.hypot(b.x+b.width/2-speaker.x,(b.y+b.height/2-speaker.y)*1.5):Math.abs(a.y-beat.region.y)-Math.abs(b.y-beat.region.y))[0];
  };
  // Bounded per-beat search: never restart the whole page or spend another API call.
  const chosen=(certain?candidateFor(true):undefined)??candidateFor(false);
  result.push(chosen??stripLettering('No safe space on illustration')[i]);
 }
 return result;
}
