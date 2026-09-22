import {Buffer} from "node:buffer";
import fontUrl from "@/lib/assets/LiberationSans-Regular.ttf?inline";
import {generateBook,generateIllustration} from "@/lib/server/ai";
import {createBookPdf} from "@/lib/server/pdf";
import {comicLetteringBoxes} from "@/lib/comic-layouts";
import {sceneImageKey,sceneImageType,templatePrefix} from "@/lib/server/comic-assets";
import {apiError,findOrder,HttpError,infrastructure,ownOrder,runtime,sameOrigin,settings,story,view} from "@/lib/server/runtime";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 let id:string|undefined,lock:string|undefined;
 try{
  sameOrigin(req);
  let r=await ownOrder(req,(await params).id);id=r.id;
  if(r.status==="ready")return Response.json(view(r));
  if(!runtime().OPENAI_API_KEY)throw new HttpError(503,"Generator AI nie został podłączony.");
  const {DB,BUCKET}=infrastructure();lock=crypto.randomUUID();const now=Date.now();
  const claim=await DB.prepare("UPDATE orders SET lock_token=?,lock_until=?,status='generating',updated_at=? WHERE id=? AND lock_until<? AND status!='ready'").bind(lock,now+300000,now,id,now).run();
  if(!claim.meta.changes)throw new HttpError(409,"Ten krok jest już przygotowywany. Spróbuj ponownie za chwilę.");
  r=await findOrder(id);const p=settings(r),b=story(r);
  if(!b){
   const photo=await BUCKET.get(r.photo_key!);
   if(!photo)throw new HttpError(410,"Zdjęcie wygasło. Przygotuj nową historię.");
   const result=await generateBook(p,new Uint8Array(await photo.arrayBuffer()),r.photo_type!);
   await DB.prepare("UPDATE orders SET book=? WHERE id=? AND lock_token=?").bind(JSON.stringify(result),id,lock).run();
  }else if(r.generated<6){
   const photo=await BUCKET.get(r.photo_key!);
   if(!photo)throw new HttpError(410,"Zdjęcie wygasło. Przygotuj nową historię.");
   const first=r.generated>0?await BUCKET.get(sceneImageKey(id,b,0)):null;
   const result=await generateIllustration(p,b,r.generated,new Uint8Array(await photo.arrayBuffer()),r.photo_type!,first?new Uint8Array(await first.arrayBuffer()):undefined);
   if(b.comicLayoutVersion===1){
    b.scenes[r.generated].lettering=comicLetteringBoxes(b.scenes[r.generated].comicTemplate!);
   }
   await BUCKET.put(sceneImageKey(id,b,r.generated),result,{httpMetadata:{contentType:sceneImageType(b)}});
   await DB.prepare("UPDATE orders SET generated=generated+1,book=? WHERE id=? AND lock_token=?").bind(JSON.stringify(b),id,lock).run();
  }else{
   const images:Uint8Array[]=[];
   for(let i=0;i<6;i++){const image=await BUCKET.get(sceneImageKey(id,b,i));if(!image)throw new HttpError(503,"Brakuje jednej z ilustracji.");images.push(new Uint8Array(await image.arrayBuffer()));}
   const fontBytes=new Uint8Array(Buffer.from(fontUrl.split(",")[1],"base64"));
   const pdf=await createBookPdf(b,p,images,fontBytes);
   if(pdf.length>20*1024*1024)throw new HttpError(503,"Książeczka jest zbyt duża do wysyłki. Skontaktuj się z obsługą.");
   const key=b.comicLayoutVersion===1?`${templatePrefix(id)}/book.pdf`:`orders/${id}/book.pdf`;
   await BUCKET.put(key,pdf,{httpMetadata:{contentType:"application/pdf"}});
   if(r.photo_key)await BUCKET.delete(r.photo_key);
   await DB.prepare("UPDATE orders SET status='ready',pdf_key=?,photo_key=NULL WHERE id=? AND lock_token=?").bind(key,id,lock).run();
  }
  await DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();
  return Response.json(view(await findOrder(id)),{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(id&&lock)try{await infrastructure().DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();}catch{}
  return apiError(e);
 }
}
