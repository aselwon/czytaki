import {ContentSafetyError,safetyMessage} from "@/lib/server/content-safety";
import {Buffer} from "node:buffer";
import fontUrl from "@/lib/assets/LiberationSans-Regular.ttf?inline";
import {generateBook,generateIllustration,locateComicSpeech} from "@/lib/server/ai";
import {createBookPdf} from "@/lib/server/pdf";
import {COMIC_LAYOUT_VERSION,comicLetteringBoxes,comicTemplateIndex} from "@/lib/comic-layouts";
import {sceneImageKey,sceneImageType,templatePrefix} from "@/lib/server/comic-assets";
import {apiError,findOrder,HttpError,infrastructure,ownOrder,runtime,sameOrigin,settings,story,view} from "@/lib/server/runtime";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 let id:string|undefined,lock:string|undefined;
 try{
  sameOrigin(req);
  let r=await ownOrder(req,(await params).id);id=r.id;
  if(r.status==="safety_blocked")throw new HttpError(422,safetyMessage);
  if(r.status==="ready")return Response.json(view(r));
  if(!runtime().OPENAI_API_KEY)throw new HttpError(503,"Generator AI nie został podłączony.");
  const {DB,BUCKET}=infrastructure();lock=crypto.randomUUID();const now=Date.now();
  const claim=await DB.prepare("UPDATE orders SET lock_token=?,lock_until=?,status='generating',updated_at=? WHERE id=? AND lock_until<? AND status NOT IN ('ready','safety_blocked')").bind(lock,now+300000,now,id,now).run();
  if(!claim.meta.changes)throw new HttpError(409,"Ten krok jest już przygotowywany. Spróbuj ponownie za chwilę.");
  r=await findOrder(id);const p=settings(r);const b=story(r);
  if(b?.comicLayoutVersion===1){
   b.comicLayoutVersion=COMIC_LAYOUT_VERSION;
   b.scenes.forEach((scene,i)=>{scene.comicTemplate=comicTemplateIndex(b!.title+p.name,i);delete scene.lettering;});
   r.generated=0;
   await DB.prepare("UPDATE orders SET generated=0,book=? WHERE id=? AND lock_token=?").bind(JSON.stringify(b),id,lock).run();
  }
  if(!b){
   const photo=await BUCKET.get(r.photo_key!);
   if(!photo)throw new HttpError(410,"Zdjęcie wygasło. Przygotuj nową historię.");
   const result=await generateBook(r.id,p,new Uint8Array(await photo.arrayBuffer()),r.photo_type!);
   await DB.prepare("UPDATE orders SET book=? WHERE id=? AND lock_token=?").bind(JSON.stringify(result),id,lock).run();
  }else if(r.generated<b.scenes.length){
   const imageKey=sceneImageKey(id,b,r.generated),cached=await BUCKET.get(imageKey);
   let result:Uint8Array;
   if(cached){result=new Uint8Array(await cached.arrayBuffer());}
   else{
    const photo=r.photo_key?await BUCKET.get(r.photo_key):null;
    if(!photo)throw new HttpError(410,"Zdjęcie wygasło. Przygotuj nową historię.");
    const first=r.generated>0?await BUCKET.get(sceneImageKey(id,b,0)):null;
    result=await generateIllustration(r.id,p,b,r.generated,new Uint8Array(await photo.arrayBuffer()),r.photo_type!,first?new Uint8Array(await first.arrayBuffer()):undefined);
   }
   if(!cached)await BUCKET.put(imageKey,result,{httpMetadata:{contentType:sceneImageType(b)}});
   if(b.comicLayoutVersion===COMIC_LAYOUT_VERSION){
    b.scenes[r.generated].lettering=await locateComicSpeech(r.id,b.scenes[r.generated],result);
    b.scenes[r.generated].placementVersion=1;
   }
   
   await DB.prepare("UPDATE orders SET generated=generated+1,book=? WHERE id=? AND lock_token=?").bind(JSON.stringify(b),id,lock).run();
  }else{
   const images:Uint8Array[]=[];
   for(let i=0;i<b.scenes.length;i++){const image=await BUCKET.get(sceneImageKey(id,b,i));if(!image)throw new HttpError(503,"Brakuje jednej z ilustracji.");images.push(new Uint8Array(await image.arrayBuffer()));}
   // Resume partially generated older books by analysing one saved page per request.
   const pending=p.format==="comic"?b.scenes.findIndex(scene=>scene.placementVersion!==1):-1;
   if(pending>=0){b.scenes[pending].lettering=await locateComicSpeech(r.id,b.scenes[pending],images[pending]);b.scenes[pending].placementVersion=1;
    await DB.prepare("UPDATE orders SET book=?,lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(JSON.stringify(b),Date.now(),id,lock).run();lock=undefined;
    return Response.json(view(await findOrder(id)),{headers:{"Cache-Control":"no-store"}});
   }
   const fontBytes=new Uint8Array(Buffer.from(fontUrl.split(",")[1],"base64"));
   const pdf=await createBookPdf(b,p,images,fontBytes);
   if(pdf.length>20*1024*1024)throw new HttpError(503,"Książeczka jest zbyt duża do wysyłki. Skontaktuj się z obsługą.");
   const key=b.comicLayoutVersion?`${templatePrefix(id,b.comicLayoutVersion)}/book.pdf`:`orders/${id}/book.pdf`;
   await BUCKET.put(key,pdf,{httpMetadata:{contentType:"application/pdf"}});
   if(r.photo_key)await BUCKET.delete(r.photo_key);
   await DB.prepare("UPDATE orders SET status='ready',pdf_key=?,photo_key=NULL WHERE id=? AND lock_token=?").bind(key,id,lock).run();
  }
  await DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();
  return Response.json(view(await findOrder(id)),{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(id&&lock&&e instanceof ContentSafetyError)try{await infrastructure().DB.prepare("UPDATE orders SET status='safety_blocked',updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();}catch{}
  if(id&&lock)try{await infrastructure().DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();}catch{}
  return apiError(e);
 }
}
