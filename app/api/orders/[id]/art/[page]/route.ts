import {sceneImageKey,sceneImageType} from "@/lib/server/comic-assets";
import {apiError,HttpError,infrastructure,ownOrder,ownerPreviewAllowed,settings,story} from "@/lib/server/runtime";

export async function GET(req:Request,{params}:{params:Promise<{id:string;page:string}>}){
 try{
  const values=await params,index=Number(values.page);if(!Number.isInteger(index)||index<0)throw new HttpError(404,"Nie znaleziono strony.");
  const r=await ownOrder(req,values.id),b=story(r),p=settings(r);
  if(!ownerPreviewAllowed()||r.payment_status!=="unpaid"||r.status!=="ready"||p.format!=="comic"||b?.comicLayoutVersion!==2)throw new HttpError(403,"Podgląd edytora nie jest dostępny.");
  if(index>=b.scenes.length)throw new HttpError(404,"Nie znaleziono strony.");
  const object=await infrastructure().BUCKET.get(sceneImageKey(r.id,b,index,r.pdf_key));
  if(!object)throw new HttpError(404,"Nie znaleziono ilustracji.");
  return new Response(object.body,{headers:{"Content-Type":sceneImageType(b),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch(e){return apiError(e);}
}
