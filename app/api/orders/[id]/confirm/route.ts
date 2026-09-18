import {apiError,ownOrder,sameOrigin,view,findOrder} from "@/lib/server/runtime";
import {confirmAndDeliver} from "@/lib/server/payments";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){let id:string|undefined;try{sameOrigin(req);const r=await ownOrder(req,(await params).id);id=r.id;return Response.json(view(await confirmAndDeliver(r)),{headers:{"Cache-Control":"no-store"}});}catch(e){if(id){const r=await findOrder(id);if(r.payment_status==="paid")return Response.json({...view(r),error:"PDF jest gotowy. Wysyłka oczekuje na ponowienie."},{headers:{"Cache-Control":"no-store"}});}return apiError(e);}}

