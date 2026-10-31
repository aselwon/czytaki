import {ContentSafetyError,safetyMessage} from "@/lib/server/content-safety";
import {Buffer} from "node:buffer";
import fontUrl from "@/lib/assets/LiberationSans-Regular.ttf?inline";
import {bookSchema} from "@/lib/product";
import {COMIC_LAYOUT_VERSION,comicLetteringBoxes,comicTemplateIndex} from "@/lib/comic-layouts";
import {generateIllustration,planLegacyComic,locateComicSpeech} from "@/lib/server/ai";
import {createBookPdf} from "@/lib/server/pdf";
import {sceneImageKey,sceneImageType,templatePrefix} from "@/lib/server/comic-assets";
import {apiError,findOrder,HttpError,infrastructure,ownOrder,ownerPreviewAllowed,sameOrigin,settings,story,view} from "@/lib/server/runtime";

// Owner-session-only remake while the product is in private preview mode.
// The previous book and PDF remain available until the replacement is complete.
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 let id:string|undefined,lock:string|undefined;
 try{
  sameOrigin(req);let r=await ownOrder(req,(await params).id);id=r.id;
  if(r.status==="safety_blocked")throw new HttpError(422,safetyMessage);
  if(!ownerPreviewAllowed()||r.payment_status!=="unpaid"||settings(r).format!=="comic")throw new HttpError(403,"Przeróbka tej książeczki nie jest dostępna.");
  if(story(r)?.comicLayoutVersion===COMIC_LAYOUT_VERSION){const b=story(r)!;return Response.json({...view(r),remakeProgress:b.scenes.length,remakeReady:true});}
  if(r.status!=="ready"||!r.pdf_key)throw new HttpError(409,"Najpierw dokończ książeczkę.");
  const {DB,BUCKET}=infrastructure(),now=Date.now();lock=crypto.randomUUID();
  const claim=await DB.prepare("UPDATE orders SET lock_token=?,lock_until=?,updated_at=? WHERE id=? AND lock_until<? AND status='ready' AND payment_status='unpaid'").bind(lock,now+300000,now,id,now).run();
  if(!claim.meta.changes)throw new HttpError(409,"Komiks jest już przygotowywany. Spróbuj ponownie za chwilę.");
  r=await findOrder(id);const p=settings(r),originalBook=story(r);
  if(!originalBook)throw new HttpError(503,"Nie znaleziono treści książeczki.");
  const prefix=templatePrefix(id,COMIC_LAYOUT_VERSION),staged=await BUCKET.get(`${prefix}/book.json`);
  let b=staged?bookSchema.parse(await staged.json()):null,progress=0,ready=false;
  if(!b){
   b=originalBook.scenes.every(scene=>scene.panels?.length===5)?structuredClone(originalBook):await planLegacyComic(p,originalBook);
   b.comicLayoutVersion=COMIC_LAYOUT_VERSION;
   b.scenes.forEach((scene,i)=>{scene.comicTemplate=comicTemplateIndex(b!.title+p.name,i);delete scene.lettering;});
   await BUCKET.put(`${prefix}/book.json`,JSON.stringify(b),{httpMetadata:{contentType:"application/json"}});
  }else{
   const sceneCount=b.scenes.length;let next=0;
   while(next<sceneCount&&b.scenes[next].lettering?.length===5&&await BUCKET.head(sceneImageKey(id,b,next)))next++;
   if(next<sceneCount){
    // Only the first replacement page needs the legacy artwork as a likeness
    // reference. Following pages use the already-clean v2 character reference,
    // so baked-in legacy bubbles cannot be copied back into the new artwork.
    const source=next?await BUCKET.get(sceneImageKey(id,b,0)):await BUCKET.get(sceneImageKey(id,originalBook,0,r.pdf_key));
    if(!source)throw new HttpError(503,"Brakuje ilustracji referencyjnej do przeróbki.");
    const cached=await BUCKET.get(sceneImageKey(id,b,next));
    const result=cached?new Uint8Array(await cached.arrayBuffer()):await generateIllustration(p,b,next,new Uint8Array(await source.arrayBuffer()),next?"image/jpeg":sceneImageType(originalBook),undefined,"illustration");
    if(!cached)await BUCKET.put(sceneImageKey(id,b,next),result,{httpMetadata:{contentType:"image/jpeg"}});
    b.scenes[next].lettering=await locateComicSpeech(b.scenes[next],result);b.scenes[next].placementVersion=1;
    await BUCKET.put(sceneImageKey(id,b,next),result,{httpMetadata:{contentType:"image/jpeg"}});
    await BUCKET.put(`${prefix}/book.json`,JSON.stringify(b),{httpMetadata:{contentType:"application/json"}});
    progress=next+1;
   }else{
    const images:Uint8Array[]=[];
    for(let i=0;i<sceneCount;i++){const art=await BUCKET.get(sceneImageKey(id,b,i));if(!art)throw new HttpError(503,"Brakuje planszy komiksu.");images.push(new Uint8Array(await art.arrayBuffer()));}
    const fontBytes=new Uint8Array(Buffer.from(fontUrl.split(",")[1],"base64"));
    const pdf=await createBookPdf(b,p,images,fontBytes);
    if(pdf.length>20*1024*1024)throw new HttpError(503,"Plik jest zbyt duży do wysyłki.");
    const key=`${prefix}/book.pdf`;
    await BUCKET.put(key,pdf,{httpMetadata:{contentType:"application/pdf"}});
    // Preserve the previous metadata alongside its retained images and PDF.
    if(!await BUCKET.head(`${prefix}/previous-book.json`))await BUCKET.put(`${prefix}/previous-book.json`,JSON.stringify({book:originalBook,pdfKey:r.pdf_key}),{httpMetadata:{contentType:"application/json"}});
    await DB.prepare("UPDATE orders SET pdf_key=?,book=? WHERE id=? AND lock_token=?").bind(key,JSON.stringify(b),id,lock).run();
    progress=sceneCount;ready=true;
   }
  }
  await DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();
  return Response.json({...view(await findOrder(id)),remakeProgress:progress,remakeReady:ready},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(id&&lock&&e instanceof ContentSafetyError)try{await infrastructure().DB.prepare("UPDATE orders SET status='safety_blocked',updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();}catch{}
  if(id&&lock)try{await infrastructure().DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0,updated_at=? WHERE id=? AND lock_token=?").bind(Date.now(),id,lock).run();}catch{}
  return apiError(e);
 }
}
