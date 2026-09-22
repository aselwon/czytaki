import type {OrderView} from "@/lib/product";

export default function ComicPreview({order,imageSrc,embeddedBubbles=false}:{order:OrderView;imageSrc?:string;embeddedBubbles?:boolean}){
 const comic=order.format==="comic"&&!!order.previewPanels;
 const templated=comic&&!!order.comicLayoutVersion;
 return <div className={`preview-page ${comic?"comic-preview":""} ${templated?"comic-template-preview":""} ${embeddedBubbles?"embedded-bubbles":""}`}>
  <div className="preview-art">
   <img src={imageSrc||`/api/orders/${order.id}/preview?v=${order.comicVersion||1}`} alt={`Wygenerowana ilustracja bohatera: ${order.name}`}/>
   {comic&&order.previewPanels?.map((panel,i)=>{
    const box=order.previewLettering?.[i];
    if(templated)return box?<span key={i} className={`comic-lettering ${panel.kind}`} style={{left:`${box.x*100}%`,top:`${box.y*100}%`,width:`${box.width*100}%`,height:`${box.height*100}%`}}>{panel.line}</span>:null;
    return <span key={i} className={`comic-text comic-text-${i} ${panel.kind}`}>{panel.line}</span>;
   })}
  </div>
  <span>PODGLĄD · 1 Z 6 PLANSZ</span><h3>{order.title}</h3>{!comic&&<p>{order.previewText}</p>}
 </div>;
}
