// Coordinates are measured from the top-left of the 500 × 735 pt illustration.
// The image prompt and PDF renderer use the same layout so lettering stays in
// quiet space instead of being painted over a face or an important action.
export type BubbleSlot={x:number;y:number;width:number;height:number};
export type ComicLayout={name:string;composition:string;bubbles:readonly BubbleSlot[]};

const layouts:readonly ComicLayout[]=[
 {name:"Wędrująca ścieżka",composition:"Five connected moments follow a gentle S-shaped path from top to bottom, with scenery flowing between them instead of hard panel borders.",bubbles:[{x:20,y:22,width:206,height:72},{x:274,y:151,width:204,height:72},{x:24,y:291,width:206,height:72},{x:272,y:434,width:206,height:72},{x:26,y:579,width:210,height:72}]},
 {name:"Fala przygody",composition:"Five story moments travel down the page like one broad wave, alternating foreground and background; use soft, organic transitions.",bubbles:[{x:274,y:22,width:204,height:72},{x:20,y:150,width:208,height:72},{x:266,y:289,width:210,height:72},{x:24,y:433,width:206,height:72},{x:267,y:579,width:210,height:72}]},
 {name:"Po skosie",composition:"Five distinct actions cascade diagonally through one continuous scene, varying close-ups and wider views without any rectangular divisions.",bubbles:[{x:23,y:25,width:210,height:72},{x:269,y:153,width:207,height:72},{x:263,y:289,width:209,height:72},{x:24,y:435,width:208,height:72},{x:268,y:579,width:208,height:72}]},
 {name:"Zakręt historii",composition:"A curved visual route links five moments, starting with a wide establishing scene and ending in a warm close-up; no boxed panels.",bubbles:[{x:270,y:22,width:207,height:72},{x:25,y:152,width:205,height:72},{x:27,y:290,width:206,height:72},{x:267,y:435,width:208,height:72},{x:25,y:580,width:210,height:72}]},
 {name:"Małe odkrycia",composition:"Five cinematic moments overlap gently like memories along a winding trail, separated by changes in perspective rather than gutters.",bubbles:[{x:22,y:22,width:206,height:72},{x:272,y:151,width:206,height:72},{x:24,y:289,width:208,height:72},{x:268,y:433,width:208,height:72},{x:266,y:579,width:210,height:72}]},
 {name:"Wielki finał",composition:"Five moments build in scale from small detail to expressive final action, arranged as one sweeping full-page illustration without a rigid grid.",bubbles:[{x:272,y:22,width:205,height:72},{x:24,y:151,width:207,height:72},{x:270,y:290,width:207,height:72},{x:267,y:434,width:210,height:72},{x:24,y:579,width:211,height:72}]},
];

export function comicLayout(index:number):ComicLayout{return layouts[index%layouts.length];}
export const comicLayoutCount=layouts.length;

export function comicLayoutPrompt(index:number){
 const layout=comicLayout(index);
 const spaces=layout.bubbles.map((box,i)=>{
  const side=box.x<250?"left":"right";
  const top=Math.round(box.y/735*100);
  return `beat ${i+1}: reserve a quiet, low-detail bubble area at the ${side} side around ${top}% from the top (about ${Math.round(box.width/500*100)}% page width); keep the hero's face, hands and key action OUT of that area`;
 }).join("; ");
 return `${layout.name}: ${layout.composition} Reading order is strictly top to bottom. ${spaces}. These reserved areas are only negative space: draw NO bubble shapes, borders or text there; the PDF will add the empty bubble shapes and Polish lettering afterwards. No white gutters, black panel grids, rectangular frames or uniform square tiles.`;
}
