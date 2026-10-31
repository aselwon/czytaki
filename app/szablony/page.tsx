import {comicLayouts,templateTail} from "@/lib/comic-layouts";
import {speechBubblePath} from "@/lib/bubble-shape.mjs";
import Link from "next/link";
import {comicExamplePanels} from "@/lib/comic-example";
import lettering from "@/lib/assets/comic-flow-lettering.json";
import ComicPreview from "../comic-preview";
import "../comic.css";
import "./templates.css";
export const metadata={title:"8 układów komiksu — Czytaki"};
export default function Templates(){return <main className="template-gallery">
 <Link href="/" className="template-back">← Wróć do swojej historii</Link>
 <div className="template-intro"><span>WŁASNY KOMIKS</span><h1>Miejsce na słowa.<br/>Cała reszta to przygoda.</h1><p>Osiem układów dymków nakładanych precyzyjnie na gotową ilustrację. Historia płynie przez całą stronę, bez sztywnych kratek i przypadkowych przesunięć.</p></div>
 <section className="template-example"><div><span>PRZYKŁADOWA PLANSZA</span><h2>Tak wygląda historia z nowym układem.</h2><p>Bohater i akcja mają swoje miejsce, a tekst trafia do osobnej, zawsze czytelnej warstwy.</p><a href="/comic-flow-sample.pdf" className="template-pdf">Otwórz przykład w PDF ↗</a><small>Ilustracja demonstracyjna. To przykład kompozycji, a nie przerobiona książeczka z Twojego zamówienia.</small></div><ComicPreview embeddedBubbles imageSrc="/comic-flow-sample.png" order={{id:"sample",status:"ready",generated:6,title:"Leo i podwodna przygoda",name:"Leo",format:"comic",pages:8,sceneCount:6,amount:0,regularAmount:0,currency:"PLN",paymentStatus:"unpaid",deliveryStatus:"none",comicLayoutVersion:1,previewPanels:comicExamplePanels,previewLettering:lettering}}/></section>
 <div className="template-grid">{comicLayouts.map((layout,index)=><figure key={layout.name}>
  <svg viewBox="0 0 500 750" role="img" aria-label={`Szablon ${index+1}: ${layout.name}, pięć pustych dymków`}>
   <rect width="500" height="750" fill="#cce1eb"/>
  {layout.bubbles.map((box,i)=>{const tail=templateTail(box)[2];return <path key={i} d={speechBubblePath(box.width,box.height,{x:(tail[0]-box.x)/box.width,y:(tail[1]-box.y)/box.height})} transform={`translate(${box.x} ${box.y})`} fill="white" stroke="#0e1313" strokeWidth="2"/>})}
  </svg><figcaption><span>{String(index+1).padStart(2,"0")}</span>{layout.name}</figcaption>
 </figure>)}</div>
 <p className="template-footnote">Układy dobieramy automatycznie. Puste dymki w gotowej książeczce wypełnią polskie dialogi i narracja.</p>
 </main>;}
