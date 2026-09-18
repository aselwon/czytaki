import {Buffer} from "node:buffer";
import fontUrl from "@/lib/assets/LiberationSans-Regular.ttf?inline";
import {generateIllustration,planLegacyComic} from "@/lib/server/ai";
import {createBookPdf} from "@/lib/server/pdf";
import {apiError,findOrder,HttpError,infrastructure,ownOrder,runtime,salesReady,sameOrigin,settings,story,view} from "@/lib/server/runtime";

// A one-order, owner-session-only remake while checkout is unavailable.
// The original artwork and PDF are retained until the new PDF is complete.
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 let id:string|undefined,lock:string|undefined;
 try{
  sameOrigin(req);
  let r=await ownOrder(req,(await params).id);
  id=r.id;
  if(id!==runtime().DEMO_PDF_ORDER_ID||salesReady()||r.payment_status!=="unpaid"||settings(r).format!=="comic")throw new HttpError(403,"Przeróbka tej książeczki nie jest dostępna.");
  if(r.pdf_key?.includes("/comic-remake/"))return Response.json({...view(r),remakeProgress:6,remakeReady:true});
  if(r.status!=="ready"||!r.pdf_key)throw new HttpError(409,"Najpierw dokończ książeczkę.");
  const {DB,BUCKET}=infrastructure(),now=Date.now();
  lock=crypto.randomUUID();
  const claim=await DB.prepare("UPDATE orders SET lock_token=?,lock_until=?,updated_at=? WHERE id=? AND lock_until<? AND status='ready' AND payment_status='unpaid'").bind(lock,now+300000,now,id,now).run();
  if(!claim.meta.changes)throw new HttpError(409,"Komiks jest już przygotowywany. Spróbuj ponownie za chwilę.");
  r=await findOrder(id);
  const p=settings(r);
  let b=story(r);
  if(!b)throw new HttpError(503,"Nie znaleziono treści książeczki.");
  let progress=0,ready=false;
  if(!b.scenes.every(scene=>scene.panels?.length===5)){
   b=await planLegacyComic(p,b);
   await DB.prepare("UPDATE orders SET book=? WHERE id=? AND lock_token=?").bind(JSON.stringify(b),id,lock).run();
  }else{
   let next=0;
   while(next<6&&await BUCKET.head("orders/"+id+"/comic-remake/scene-"+next+".jpg"))next++;
   if(next<6){
    const original=await BUCKET.get("orders/"+id+"/scene-"+next+".jpg");
    const first=next?await BUCKET.get("orders/"+id+"/scene-0.jpg"):null;
    if(!original)throw new HttpError(503,"Brakuje pierwotnej ilustracji do przeróbki.");
    const result=await generateIllustration(p,b,next,new Uint8Array(await original.arrayBuffer()),"image/jpeg",first?new Uint8Array(await first.arrayBuffer()):undefined,"illustration");
    await BUCKET.put("orders/"+id+"/comic-remake/scene-"+next+".jpg",result,{httpMetadata:{contentType:"image/jpeg"}});
    progress=next+1;
   }else{
    const images:Uint8Array[]=[];
    for(let i=0;i<6;i++){const art=await BUCKET.get("orders/"+id+"/comic-remake/scene-"+i+".jpg");if(!art)throw new HttpError(503,"Brakuje kadru komiksu.");images.push(new Uint8Array(await art.arrayBuffer()));}
    const fontBytes=new Uint8Array(Buffer.from(fontUrl.split(",")[1],"base64"));
    const pdf=await createBookPdf(b,p,images,fontBytes);
    if(pdf.length>20*1024*1024)throw new HttpError(503,"Plik jest zbyt duży do wysyłki.");
    const key="orders/"+id+"/comic-remake/book.pdf";
    await BUCKET.put(key,pdf,{httpMetadata:{contentType:"application/pdf"}});
    await DB.prepare("UPDATE orders SET pdf_key=? WHERE id=? AND lock_token=?").bind(key,id,lock).run();
    progress=6;ready=true;
   }
  }
  await DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();
  return Response.json({...view(await findOrder(id)),remakeProgress:progress,remakeReady:ready},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(id&&lock)try{await infrastructure().DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();}catch{}
  return apiError(e);
 }
}
