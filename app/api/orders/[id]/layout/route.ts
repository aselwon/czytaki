import {Buffer} from "node:buffer";
import fontUrl from "@/lib/assets/LiberationSans-Regular.ttf?inline";
import {comicLetteringBoxes} from "@/lib/comic-layouts";
import {comicEditorUpdateSchema,type Book,type ComicEditorPayload} from "@/lib/product";
import {sceneImageKey,templatePrefix} from "@/lib/server/comic-assets";
import {createBookPdf} from "@/lib/server/pdf";
import {apiError,findOrder,HttpError,infrastructure,ownOrder,salesReady,sameOrigin,settings,story,type OrderRow} from "@/lib/server/runtime";

function editorPayload(r:OrderRow,b:Book):ComicEditorPayload{
 return{
  orderId:r.id,title:b.title,revision:r.updated_at,needsCleanArtwork:b.comicLayoutVersion!==2,
  scenes:b.scenes.map((scene,index)=>({
   title:scene.title,
   comicTemplate:scene.comicTemplate??index%8,
   panels:scene.panels!,
   lettering:scene.lettering??comicLetteringBoxes(scene.comicTemplate??index),
  })),
 };
}

function editableOrder(r:OrderRow,b:Book|null){
 const p=settings(r);
 if(salesReady()||r.payment_status!=="unpaid"||r.status!=="ready"||p.format!=="comic"||!b?.scenes.every(scene=>scene.panels?.length===5))throw new HttpError(403,"Edytor nie jest dostępny dla tej książeczki.");
 return p;
}

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const r=await ownOrder(req,(await params).id),b=story(r);editableOrder(r,b);
  return Response.json(editorPayload(r,b!),{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return apiError(e);}
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 let id:string|undefined,lock:string|undefined;
 try{
  sameOrigin(req);const length=Number(req.headers.get("content-length")||0);if(length>100_000)throw new HttpError(413,"Zmiany są zbyt duże.");
  let r=await ownOrder(req,(await params).id);id=r.id;const current=story(r),p=editableOrder(r,current);
  if(current!.comicLayoutVersion!==2)throw new HttpError(409,"Najpierw odśwież ilustracje do wersji bez wbudowanych dymków.");
  const parsed=comicEditorUpdateSchema.safeParse(await req.json());if(!parsed.success)throw new HttpError(400,"Sprawdź tekst i rozmiary dymków.");const update=parsed.data;
  const {DB,BUCKET}=infrastructure(),now=Date.now();lock=crypto.randomUUID();
  const claim=await DB.prepare("UPDATE orders SET lock_token=?,lock_until=? WHERE id=? AND updated_at=? AND lock_until<? AND status='ready'").bind(lock,now+120000,id,update.revision,now).run();
  if(!claim.meta.changes)throw new HttpError(409,"Książeczka zmieniła się w innej karcie. Odśwież edytor.");
  r=await findOrder(id);const b=story(r)!;
  update.scenes.forEach((scene,index)=>{
   b.scenes[index].comicTemplate=scene.comicTemplate;
   b.scenes[index].lettering=scene.lettering;
   b.scenes[index].panels=b.scenes[index].panels!.map((panel,panelIndex)=>({...panel,line:scene.panels[panelIndex].line,kind:scene.panels[panelIndex].kind}));
  });
  const images:Uint8Array[]=[];
  for(let index=0;index<6;index++){
   const art=await BUCKET.get(sceneImageKey(id,b,index,r.pdf_key));
   if(!art)throw new HttpError(503,"Brakuje ilustracji strony "+(index+1)+".");
   images.push(new Uint8Array(await art.arrayBuffer()));
  }
  const fontBytes=new Uint8Array(Buffer.from(fontUrl.split(",")[1],"base64"));
  let pdf:Uint8Array;
  try{pdf=await createBookPdf(b,p,images,fontBytes);}catch(e){
   if(e instanceof Error&&e.message==="Comic bubble text exceeds bounds")throw new HttpError(400,"Tekst nie mieści się w jednym z dymków. Powiększ dymek albo skróć wypowiedź.");
   throw e;
  }
  if(pdf.length>20*1024*1024)throw new HttpError(503,"Plik PDF jest zbyt duży.");
  const key=`${templatePrefix(id,2)}/edited-${crypto.randomUUID()}.pdf`;
  await BUCKET.put(key,pdf,{httpMetadata:{contentType:"application/pdf"}});
  const updatedAt=Math.max(Date.now(),update.revision+1);
  const saved=await DB.prepare("UPDATE orders SET book=?,pdf_key=?,updated_at=?,lock_token=NULL,lock_until=0 WHERE id=? AND lock_token=? AND updated_at=?").bind(JSON.stringify(b),key,updatedAt,id,lock,update.revision).run();
  if(!saved.meta.changes)throw new HttpError(409,"Nie udało się zapisać zmian. Odśwież edytor.");
  lock=undefined;
  return Response.json(editorPayload(await findOrder(id),b),{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){
  if(id&&lock)try{await infrastructure().DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0 WHERE id=? AND lock_token=?").bind(id,lock).run();}catch{}
  return apiError(e);
 }
}
