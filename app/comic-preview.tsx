import BubbleOutline from "./bubble-outline";
import BubbleCopy from "./bubble-copy";
import type {OrderView} from "@/lib/product";
import {comicNarrativeTeaser} from "@/lib/comic-layouts";

export default function ComicPreview({order,imageSrc,embeddedBubbles=false}:{order:OrderView;imageSrc?:string;embeddedBubbles?:boolean}){
 const comic=order.format==="comic"&&!!order.previewPanels;
 const templated=comic&&!!order.comicLayoutVersion;
 return <div className={`preview-page ${comic?"comic-preview":""} ${templated?"comic-template-preview":""} ${embeddedBubbles?"embedded-bubbles":""}`}>
  <div className="preview-art">
   <img src={imageSrc||`/api/orders/${order.id}/preview?v=${order.comicVersion||1}`} alt={`Wygenerowana ilustracja bohatera: ${order.name}`}/>
   {comic&&order.previewPanels?.map((panel,i)=>{
    const box=order.previewLettering?.[i];
    if(templated)return box?<span key={i} className={`comic-lettering ${panel.kind} ${box.speaker?"speaker-linked":""}`} style={{left:`${box.x*100}%`,top:`${box.y*100}%`,width:`${box.width*100}%`,height:`${box.height*100}%`}}>{panel.kind==="dialogue"&&!embeddedBubbles&&<BubbleOutline box={box}/>}<BubbleCopy text={panel.line} kind={panel.kind} box={box}/></span>:null;
    return <span key={i} className={`comic-text comic-text-${i} ${panel.kind}`}>{panel.line}</span>;
   })}
   {templated&&order.previewText&&<span className="comic-narrative-teaser"><b>ZAJAWKA ROZDZIAŁU</b>{comicNarrativeTeaser(order.previewText)}</span>}
  </div>
  <span>PODGLĄD · 1 Z {order.sceneCount} PLANSZ</span><h3>{order.title}</h3>{!comic&&<p>{order.previewText}</p>}
  {order.editorAvailable&&<a className="button secondary comic-editor-link" href={`/edytor/${order.id}`}>Edytuj dymki i zajawki</a>}
 </div>;
}
