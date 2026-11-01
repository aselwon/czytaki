import {view,apiError,HttpError,infrastructure,ownOrder,story,runtime,settings} from "@/lib/server/runtime";
import {worlds} from "@/lib/product";
import {sceneImageKey,sceneImageType} from "@/lib/server/comic-assets";
const MODEL="@cf/black-forest-labs/flux-1-schnell";
const RESERVED_NEURONS=40;
const imageHeaders={"Content-Type":"image/png","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Czytaki-Preview":"low-quality-sketch"};
async function generateSample(name:string,world:string){
 const e=runtime(),cap=Math.floor(Number(e.PREVIEW_DAILY_NEURON_CAP));
 if(e.PREVIEW_WORKERS_AI!=="true"||!e.AI||!Number.isSafeInteger(cap)||cap<RESERVED_NEURONS)return null;
 try{
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const reserved=await e.DB.prepare("INSERT INTO preview_neuron_quotas (day,neurons) VALUES (?,?) ON CONFLICT(day) DO UPDATE SET neurons=neurons+excluded.neurons WHERE neurons+excluded.neurons<=? RETURNING neurons").bind(day,RESERVED_NEURONS,cap).first();
  if(!reserved)return null;
  const result=await e.AI.run(MODEL,{prompt:`A simple, child-friendly, low-quality storybook illustration of ${name} exploring a magical ${world}. No text, no letters.`,steps:4});
  if(result.image)return new Response(Uint8Array.from(atob(result.image),char=>char.charCodeAt(0)),{headers:imageHeaders});
 }catch(error){console.error("Workers AI preview failed",error instanceof Error?error.name:"UnknownError");}
 return null;
}
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{const r=await ownOrder(req,(await params).id);const v=view(r);if(v.samplePreview){const generated=v.previewWorkersAi?await generateSample(v.name,worlds[settings(r).world]):null;if(generated)return generated;return new Response(null,{status:302,headers:{Location:v.sampleImage!,"Cache-Control":"private, no-store"}});}if(r.generated<1)throw new HttpError(404,"Podgląd jeszcze nie jest gotowy.");const book=story(r);const object=await infrastructure().BUCKET.get(sceneImageKey(r.id,book,0,r.pdf_key));if(!object)throw new HttpError(404,"Podgląd jeszcze nie jest gotowy.");return new Response(object.body,{headers:{"Content-Type":sceneImageType(book),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}catch(e){return apiError(e);}}
