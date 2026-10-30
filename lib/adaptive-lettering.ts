import {z} from 'zod';
const point=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)});
const rectBase=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().positive().max(1),height:z.number().positive().max(1)});
const rect=rectBase.refine(r=>r.x+r.width<=1.001&&r.y+r.height<=1.001);
export const visualPlacementSchema=z.object({protectedAreas:z.array(rect).max(80),beats:z.array(z.object({index:z.number().int().min(0).max(4),confidence:z.number().min(0).max(1),speaker:point.nullable(),speakerBounds:rect.nullable(),region:rect,candidates:z.array(rectBase).min(1).max(5)})).length(5)});
export type PlacementAnalysis=z.infer<typeof visualPlacementSchema>;
export type Rect=z.infer<typeof rect>;
export type AdaptiveBox=Rect&{speaker?:z.infer<typeof point>};
const intersects=(a:Rect,b:Rect,gap=0)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
const inside=(a:Rect,b:Rect)=>a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width+.001&&a.y+a.height<=b.y+b.height+.001;
export function planAdaptiveLettering(raw:unknown,panels:readonly {kind:string;line:string}[]):AdaptiveBox[]{
 const analysis=visualPlacementSchema.parse(raw);
 if(panels.length!==5||new Set(analysis.beats.map(b=>b.index)).size!==5)throw Error('Incomplete speaker map');
 const beats=[...analysis.beats].sort((a,b)=>a.index-b.index);
 const options=beats.map((beat,i)=>{
  if(beat.confidence<.85)throw Error('Uncertain speaker');
  const dialogue=panels[i].kind==='dialogue',speaker=beat.speaker;
  if(dialogue&&(!speaker||!beat.speakerBounds||!inside({x:speaker.x,y:speaker.y,width:0,height:0},beat.speakerBounds)))throw Error('Speaker point must lie inside its visible body rectangle in beat '+i);
  const protectedAreas=[...analysis.protectedAreas,...beats.flatMap(b=>b.speakerBounds?[b.speakerBounds]:[])];
  // The model locates content; deterministic search also explores nearby empty
  // space instead of relying on the model to do precise typesetting arithmetic.
  const proposals=[...beat.candidates];
  for(const width of [.12,.14,.16,.20,.24,.28,.32,.38])for(const height of [.065,.08,.10,.12,.14]){
   for(let y=beat.region.y;y+height<=Math.min(.90,beat.region.y+beat.region.height)+.001;y+=.01)
    for(let x=beat.region.x;x+width<=beat.region.x+beat.region.width+.001;x+=.01)proposals.push({x,y,width,height});
  }
  const candidates=proposals.filter(box=>{
   if(box.x+box.width>1||box.width<.12||box.width>.46||box.height<.065||box.height>.15||box.y+box.height>.90||!inside(box,beat.region))return false;
   if(protectedAreas.some(area=>intersects(box,area,.02)))return false;
   // Match the speaker's horizontal neighbourhood, not the template's side.
   if(dialogue&&speaker){
    const cx=box.x+box.width/2,cy=box.y+box.height/2;
    if(speaker.x<.45&&cx>.5||speaker.x>.55&&cx<.5)return false;
    const dx=Math.max(box.x-speaker.x,0,speaker.x-box.x-box.width),dy=Math.max(box.y-speaker.y,0,speaker.y-box.y-box.height);
    if(Math.hypot(dx,dy*1.5)>.22||Math.abs(cx-speaker.x)>.26||Math.abs(cy-speaker.y)>.23)return false;
   }
   // Conservative minimum capacity at a readable size; PDF validates actual font metrics.
   const charsPerLine=Math.floor(box.width*490*.68/(10*.6)),lines=Math.floor(box.height*735*.58/12.5);
   return charsPerLine*lines>=panels[i].line.length;
  }).map(box=>({...box,...(dialogue&&speaker?{speaker}: {})}));
  if(!candidates.length)throw Error('No safe space beside speaker in beat '+i);
  return candidates.sort((a,b)=>speaker?Math.hypot(a.x+a.width/2-speaker.x,(a.y+a.height/2-speaker.y)*1.5)-Math.hypot(b.x+b.width/2-speaker.x,(b.y+b.height/2-speaker.y)*1.5):0).slice(0,30);
 });
 let visited=0;
 const search=(i:number,result:AdaptiveBox[]):AdaptiveBox[]|null=>{
  if(++visited>10000)return null;
  if(i===5)return result;
  for(const box of options[i])if(!result.some(prior=>intersects(box,prior,.008))){const found=search(i+1,[...result,box]);if(found)return found;}
  return null;
 };
 const result=search(0,[]);if(!result)throw Error('Speech bubbles overlap');return result;
}
