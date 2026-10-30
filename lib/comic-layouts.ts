// Template coordinates use a 500 × 750 canvas, matching the 2:3 artwork.
export type BubbleSlot={x:number;y:number;width:number;height:number};
export type ComicLayout={name:string;composition:string;bubbles:readonly BubbleSlot[]};
export const COMIC_LAYOUT_VERSION=2;
// Compact bubbles preserve the old template centres while using roughly half
// of their former area. Their final height is 7.5–8% of the 750 px page.
const slot=(x:number,y:number,width=218,height=88):BubbleSlot=>{
 const compactWidth=Math.round(width*.78),compactHeight=Math.round(height*.64);
 return{x:x+(width-compactWidth)/2,y:y+(height-compactHeight)/2,width:compactWidth,height:compactHeight};
};
export const comicLayouts:readonly ComicLayout[]=[
 {name:"Wędrująca ścieżka",composition:"Five connected moments follow an S-shaped path through continuous scenery.",bubbles:[slot(20,20),slot(262,163),slot(20,307),slot(262,451),slot(20,595)]},
 {name:"Fala przygody",composition:"Five moments flow as a wave, with alternating foreground and background.",bubbles:[slot(262,20),slot(20,163),slot(262,307),slot(20,451),slot(262,595)]},
 {name:"Wielkie odkrycie",composition:"A central dramatic discovery connects five moments arranged around it.",bubbles:[slot(141,18),slot(20,158),slot(262,302),slot(20,449),slot(262,596)]},
 {name:"Blisko bohatera",composition:"Five intimate moments alternate expressive close-ups with wider scenery.",bubbles:[slot(20,20),slot(262,166),slot(262,312),slot(20,458),slot(141,609)]},
 {name:"Zakręt historii",composition:"Five actions trace a curved route from a wide opening to a warm final close-up.",bubbles:[slot(262,20),slot(20,168),slot(20,316),slot(262,464),slot(141,612)]},
 {name:"Małe odkrycia",composition:"Five moments overlap gently like memories along a winding trail.",bubbles:[slot(20,20),slot(262,163),slot(141,307),slot(20,451),slot(262,595)]},
 {name:"Po skosie",composition:"Five distinct actions cascade diagonally through one continuous illustrated world.",bubbles:[slot(262,20),slot(141,162),slot(20,306),slot(262,451),slot(20,596)]},
 {name:"Wielki finał",composition:"Five moments build from a small detail to a sweeping final action.",bubbles:[slot(20,20),slot(262,164),slot(20,308),slot(262,452),slot(122,599,256,94)]},
];
export const comicLayoutCount=comicLayouts.length;
export function comicLayout(index:number):ComicLayout{return comicLayouts[((index%comicLayoutCount)+comicLayoutCount)%comicLayoutCount];}
export function comicTemplateIndex(seed:string,page:number){let hash=0;for(const char of seed)hash=(Math.imul(hash,31)+char.charCodeAt(0))|0;return ((hash>>>0)+page)%comicLayoutCount;}
export function comicLayoutPrompt(index:number){
 const layout=comicLayout(index);
 const spaces=layout.bubbles.map((box,i)=>`zone ${i+1}: left ${Math.round(box.x/5)}%, top ${Math.round(box.y/7.5)}%, width ${Math.round(box.width/5)}%, height ${Math.round(box.height/7.5)}%`).join("; ");
 return `${layout.name}: ${layout.composition} The application will overlay five opaque speech bubbles and a narrative strip after generation. Reserve low-detail background in these zones: ${spaces}, plus the bottom 9% of the page for the narrative strip. Keep every face, head, hand, paw, character, important object and crucial action outside those zones. Draw NO speech bubbles, white blobs, borders, captions or text yourself. Reading order is top to bottom. No white gutters, rectangular frames, panel grids or tiled pictures.`;
}
// Normalized overlay rectangles shared by the live preview and PDF renderer.
// The artwork never owns these bubbles, so placement cannot drift between pages.
export type LetteringBox=BubbleSlot;
export function comicLetteringBoxes(index:number):LetteringBox[]{return comicLayout(index).bubbles.map(box=>({x:box.x/500,y:box.y/750,width:box.width/500,height:box.height/750}));}
export function templateTail(box:BubbleSlot){const direction=box.x+box.width/2<250?1:-1;const x=box.x+box.width*(direction===1?.68:.32),y=box.y+box.height*.87;return [[x-9,y],[x+9,y],[x+direction*23,y+28]];}
export function comicNarrativeTeaser(text:string,max=260){
 const clean=text.replace(/\s+/g," ").trim();if(clean.length<=max)return clean;
 const sentences=clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[clean];let result="";
 for(const sentence of sentences){const next=(result+" "+sentence.trim()).trim();if(next.length>max)break;result=next;if(sentences.indexOf(sentence)>=1)break;}
 if(result.length>=Math.min(80,max*.35))return result;
 const prefix=clean.slice(0,max-1),boundary=prefix.lastIndexOf(" ");return (boundary>max*.65?prefix.slice(0,boundary):prefix).trimEnd()+"…";
}
