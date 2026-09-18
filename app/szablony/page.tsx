import {comicLayouts,templateTail} from "@/lib/comic-layouts";
import {comicExamplePanels} from "@/lib/comic-example";
import lettering from "@/lib/assets/comic-flow-lettering.json";
import ComicPreview from "../comic-preview";
import "../comic.css";
import "./templates.css";
export const metadata={title:"8 układów komiksu — Czytaki"};
export default function Templates(){return <main className="template-gallery">
 <a href="/" className="template-back">← Wróć do swojej historii</a>
 <div className="template-intro"><span>WŁASNY KOMIKS</span><h1>Miejsce na słowa.<br/>Cała reszta to przygoda.</h1><p>Osiem układów z pustymi dymkami. Ilustracja powstaje wokół nich, a historia płynie przez całą stronę. Jasnoniebieskie tło zostanie zastąpione Twoją opowieścią.</p></div>
 <section className="template-example"><div><span>PRZYKŁADOWA PLANSZA</span><h2>Tak wygląda historia z nowym układem.</h2><p>Bohater i akcja mają swoje miejsce. Tekst trafia do pustych dymków widocznych już na ilustracji.</p><a href="/comic-flow-sample.pdf" className="template-pdf">Otwórz przykład w PDF ↗</a><small>Ilustracja demonstracyjna. To przykład kompozycji, a nie przerobiona książeczka z Twojego zamówienia.</small></div><ComicPreview imageSrc="/comic-flow-sample.png" order={{id:"sample",status:"ready",generated:6,title:"Leo i podwodna przygoda",name:"Leo",format:"comic",amount:0,currency:"PLN",paymentStatus:"unpaid",deliveryStatus:"none",comicLayoutVersion:1,previewPanels:comicExamplePanels,previewLettering:lettering}}/></section>
 <div className="template-grid">{comicLayouts.map((layout,index)=><figure key={layout.name}>
  <svg viewBox="0 0 500 750" role="img" aria-label={`Szablon ${index+1}: ${layout.name}, pięć pustych dymków`}>
   <rect width="500" height="750" fill="#cce1eb"/>
   {layout.bubbles.map((box,i)=><g key={i} fill="white" stroke="#18222a" strokeWidth="2"><polygon points={templateTail(box).map(p=>p.join(",")).join(" ")}/><ellipse cx={box.x+box.width/2} cy={box.y+box.height/2} rx={box.width/2} ry={box.height/2}/></g>)}
  </svg><figcaption><span>{String(index+1).padStart(2,"0")}</span>{layout.name}</figcaption>
 </figure>)}</div>
 <p className="template-footnote">Układy dobieramy automatycznie. Puste dymki w gotowej książeczce wypełnią polskie dialogi i narracja.</p>
 </main>;}
