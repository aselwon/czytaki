"use client";
import BubbleOutline from "./bubble-outline";
import BubbleCopy from "./bubble-copy";
import {useEffect,useMemo,useRef,useState,type KeyboardEvent as ReactKeyboardEvent,type PointerEvent as ReactPointerEvent} from "react";
import {ArrowLeft,CheckCircle2,Download,Loader2,Save} from "lucide-react";
import {comicLayouts,comicNarrativeTeaser} from "@/lib/comic-layouts";
import type {ComicEditorPayload,ComicEditorScene} from "@/lib/product";

type DragState={mode:"move"|"resize";index:number;pointerId:number;startX:number;startY:number;origin:ComicEditorScene["lettering"][number];width:number;height:number};
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const percent=(value:number)=>Math.round(value*100);

async function jsonRequest<T>(url:string,options?:RequestInit):Promise<T>{
 const response=await fetch(url,options),data=await response.json() as T&{error?:string};
 if(!response.ok)throw new Error(data.error||"Nie udało się zapisać zmian.");
 return data;
}

export default function ComicEditor({orderId}:{orderId:string}){
 const [data,setData]=useState<ComicEditorPayload|null>(null),[page,setPage]=useState(0),[selected,setSelected]=useState(0);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false);
 const canvas=useRef<HTMLDivElement>(null),drag=useRef<DragState|null>(null);
 useEffect(()=>{jsonRequest<ComicEditorPayload>(`/api/orders/${orderId}/layout`).then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[orderId]);
 const scene=data?.scenes[page],box=scene?.lettering[selected];
 const invalid=useMemo(()=>!!data?.scenes.some(item=>item.panels.some(panel=>panel.line.trim().length<2)),[data]);
 const estimatedCapacity=box?Math.max(8,Math.floor(box.width*box.height*1200)):0;
 const crowded=!!(scene&&box&&scene.panels[selected].line.trim().length>estimatedCapacity);

 function updateScene(change:(scene:ComicEditorScene)=>ComicEditorScene){
  setSaved(false);setData(current=>current?{...current,scenes:current.scenes.map((item,index)=>index===page?change(item):item)}:current);
 }
 function normalizeBox(next:ComicEditorScene["lettering"][number]){
  const width=clamp(next.width,.12,.7),height=clamp(next.height,.055,.3);
  return{...next,x:clamp(next.x,0,1-width),y:clamp(next.y,0,1-height),width,height};
 }
 function updateBox(index:number,patch:Partial<ComicEditorScene["lettering"][number]>){
  updateScene(current=>({...current,lettering:current.lettering.map((item,i)=>i===index?normalizeBox({...item,...patch}):item)}));
 }
 function updatePanel(patch:Partial<ComicEditorScene["panels"][number]>){
  updateScene(current=>({...current,panels:current.panels.map((item,i)=>i===selected?{...item,...patch}:item)}));
 }
 function beginDrag(event:ReactPointerEvent,index:number,mode:DragState["mode"]){
  if(!scene||!canvas.current)return;event.preventDefault();event.stopPropagation();setSelected(index);
  const rect=canvas.current.getBoundingClientRect();
  drag.current={mode,index,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,origin:{...scene.lettering[index]},width:rect.width,height:rect.height};
  canvas.current.setPointerCapture(event.pointerId);
 }
 function moveDrag(event:ReactPointerEvent){
  const active=drag.current;if(!active||event.pointerId!==active.pointerId)return;
  const dx=(event.clientX-active.startX)/active.width,dy=(event.clientY-active.startY)/active.height;
  updateBox(active.index,active.mode==="move"?{x:active.origin.x+dx,y:active.origin.y+dy}:{width:active.origin.width+dx,height:active.origin.height+dy});
 }
 function endDrag(event:ReactPointerEvent){
  if(drag.current?.pointerId===event.pointerId){try{canvas.current?.releasePointerCapture(event.pointerId);}catch{}drag.current=null;}
 }
 function nudge(event:ReactKeyboardEvent,index:number){
  if(!scene||!event.key.startsWith("Arrow"))return;event.preventDefault();const step=event.shiftKey ? .02 : .005,current=scene.lettering[index];
  updateBox(index,{x:current.x+(event.key==="ArrowRight"?step:event.key==="ArrowLeft"?-step:0),y:current.y+(event.key==="ArrowDown"?step:event.key==="ArrowUp"?-step:0)});
 }
 function applyTemplate(template:number){
  const layout=comicLayouts[template];updateScene(current=>({...current,comicTemplate:template,lettering:layout.bubbles.map((item,index)=>({x:item.x/500,y:item.y/750,width:item.width/500,height:item.height/750,...(current.lettering[index]?.speaker?{speaker:current.lettering[index].speaker}:{})}))}));
 }
 async function save(){
  if(!data||invalid||saving)return;setSaving(true);setError("");setSaved(false);
  try{const result=await jsonRequest<ComicEditorPayload>(`/api/orders/${orderId}/layout`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:data.revision,scenes:data.scenes})});setData(result);setSaved(true);}catch(e){setError(e instanceof Error?e.message:"Nie udało się zapisać zmian.");}finally{setSaving(false);}
 }

 if(loading)return <main className="comic-editor loading"><Loader2 className="spin"/><p>Otwieram plansze…</p></main>;
 if(error&&!data)return <main className="comic-editor editor-message"><h1>Nie udało się otworzyć edytora</h1><p>{error}</p><a className="button secondary" href={`/?order=${orderId}`}><ArrowLeft size={17}/> Wróć do książeczki</a></main>;
 if(!data)return null;
 if(data.needsCleanArtwork)return <main className="comic-editor editor-message"><h1>Najpierw potrzebna jest czysta ilustracja</h1><p>Ta starsza książeczka ma dymki zapisane bezpośrednio w obrazie. Wróć do podglądu i wykonaj jednorazowe odświeżenie komiksu. Późniejsze przesuwanie i edycja tekstu nie będzie już generować obrazów.</p><a className="button primary" href={`/?order=${orderId}`}><ArrowLeft size={17}/> Wróć i odśwież komiks</a></main>;

 return <main className="comic-editor">
  <header className="editor-header"><div><a href={`/?order=${orderId}`}><ArrowLeft size={17}/> Wróć do książeczki</a><h1>Edytor dymków</h1><p>{data.title}</p></div><div className="editor-actions">{saved&&<span className="save-success"><CheckCircle2 size={17}/> PDF zapisany</span>}<a className="button secondary" href={`/api/orders/${orderId}/download?view=1`} target="_blank" rel="noopener"><Download size={17}/> Otwórz PDF</a><button className="button primary" onClick={save} disabled={saving||invalid}>{saving?<Loader2 className="spin" size={17}/>:<Save size={17}/>} {saving?"Składam PDF…":"Zapisz układ i PDF"}</button></div></header>
  <nav className="editor-pages" aria-label="Wybierz planszę">{data.scenes.map((item,index)=><button key={item.title} className={page===index?"active":""} onClick={()=>{setPage(index);setSelected(0);}}><b>{index+1}</b><span>{item.title}</span></button>)}</nav>
  <section className="editor-workspace">
   <div className="editor-canvas-column">
    <div className="editor-help"><b>Przeciągnij dymek</b><span>Złap prawy dolny róg, aby zmienić rozmiar — nawet do 12 × 5,5% planszy. Strzałki przesuwają dokładnie.</span></div>
    <div ref={canvas} className="editor-canvas" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
     <img src={`/api/orders/${orderId}/art/${page}?v=${data.revision}`} alt={`Ilustracja planszy ${page+1}`}/>
     {scene!.lettering.map((item,index)=>item.placement==="strip"?null:<button type="button" key={index} aria-label={`Dymek ${index+1}`} className={`editable-bubble ${scene!.panels[index].kind} ${item.speaker?"speaker-linked":""} ${selected===index?"selected":""}`} style={{left:`${item.x*100}%`,top:`${item.y*100}%`,width:`${item.width*100}%`,height:`${item.height*100}%`}} onPointerDown={event=>beginDrag(event,index,"move")} onKeyDown={event=>nudge(event,index)} onClick={()=>setSelected(index)}>{scene!.panels[index].kind==="dialogue"&&<BubbleOutline box={item}/>}<BubbleCopy text={scene!.panels[index].line} kind={scene!.panels[index].kind} box={item}/><i onPointerDown={event=>beginDrag(event,index,"resize")} aria-hidden/></button>)}
     <div className="editable-teaser"><b>ZAJAWKA ROZDZIAŁU</b><span>{comicNarrativeTeaser(scene!.text)}</span></div>
    </div>
    {scene!.lettering.map((item,index)=>item.placement==="strip"?<p key={index}><button type="button" onClick={()=>setSelected(index)}>{index+1}. {scene!.panels[index].line}</button></p>:null)}
   </div>
   <aside className="editor-controls"><div className="control-card teaser-editor"><div className="control-title"><span>Zajawka rozdziału</span><b>bez AI</b></div><label>Tekst narratora<textarea maxLength={550} value={scene!.text} onChange={event=>updateScene(current=>({...current,text:event.target.value}))}/><small>{scene!.text.length} / 550 znaków · w PDF pokażemy zwięzły początek</small></label></div>
    <div className="control-card"><div className="control-title"><span>Dymek {selected+1}</span><b>{percent(box!.width)} × {percent(box!.height)}%</b></div><label>Tekst<textarea maxLength={90} value={scene!.panels[selected].line} onChange={event=>updatePanel({line:event.target.value})}/><small>{scene!.panels[selected].line.length} / 90 znaków</small></label>{crowded&&<p className="editor-warning">Ten tekst może być zbyt ciasny. Powiększ dymek albo skróć wypowiedź, aby czcionka pozostała czytelna.</p>}<label>Rodzaj<select value={scene!.panels[selected].kind} onChange={event=>updatePanel({kind:event.target.value as "dialogue"|"narration"})}><option value="dialogue">Dymek dialogowy</option><option value="narration">Pole narratora</option></select></label><div className="range-grid"><Range label="Położenie X" value={box!.x} max={1-box!.width} onChange={value=>updateBox(selected,{x:value})}/><Range label="Położenie Y" value={box!.y} max={1-box!.height} onChange={value=>updateBox(selected,{y:value})}/><Range label="Szerokość" value={box!.width} min={.12} max={Math.min(.7,1-box!.x)} onChange={value=>updateBox(selected,{width:value})}/><Range label="Wysokość" value={box!.height} min={.055} max={Math.min(.3,1-box!.y)} onChange={value=>updateBox(selected,{height:value})}/></div></div>
    <div className="control-card template-picker"><div className="control-title"><span>Gotowe układy HTML</span><b>bez AI</b></div><p>Zastosuj układ do bieżącej strony, a potem dopasuj każdy dymek ręcznie.</p><div>{comicLayouts.map((layout,index)=><button key={layout.name} className={scene!.comicTemplate===index?"active":""} title={layout.name} onClick={()=>applyTemplate(index)}><span className="mini-template">{layout.bubbles.map((item,i)=><i key={i} style={{left:`${item.x/5}%`,top:`${item.y/7.5}%`,width:`${item.width/5}%`,height:`${item.height/7.5}%`}}/>)}</span><b>{index+1}</b></button>)}</div></div>
    {invalid&&<p className="editor-error">Każdy dymek musi zawierać co najmniej 2 znaki.</p>}{error&&<p className="editor-error">{error}</p>}
   </aside>
  </section>
 </main>;
}

function Range({label,value,onChange,min=0,max=1}:{label:string;value:number;onChange:(value:number)=>void;min?:number;max?:number}){
 return <label><span>{label}<b>{percent(value)}%</b></span><input type="range" min={min} max={max} step="0.005" value={value} onChange={event=>onChange(Number(event.target.value))}/></label>;
}
