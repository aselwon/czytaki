import {runGenerationStep} from "@/lib/server/generation";
import {apiError,findOrder,ownOrder,sameOrigin,view} from "@/lib/server/runtime";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  sameOrigin(req);
  const {id}=await ownOrder(req,(await params).id);
  const step=await runGenerationStep(id);
  if(step.busy)return Response.json({error:`Ten krok jest już przygotowywany. Ponowimy za ${step.retryAfter} s.`,retryAfter:step.retryAfter},{status:409,headers:{"Retry-After":String(step.retryAfter),"Cache-Control":"no-store"}});
  return Response.json(view(await findOrder(id)),{headers:{"Cache-Control":"no-store"}});
 }catch(e){return apiError(e);}
}
