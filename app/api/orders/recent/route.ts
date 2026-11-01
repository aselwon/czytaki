import {hash,infrastructure,sessionToken,view,type OrderRow} from "@/lib/server/runtime";

export async function GET(req:Request){
 const token=sessionToken(req);
 if(!token)return Response.json({order:null},{headers:{"Cache-Control":"no-store"}});
 try{
  const owner=await hash(token);
  const order=await infrastructure().DB.prepare("SELECT * FROM orders WHERE owner_hash=? AND status NOT IN ('ready','delivered') ORDER BY created_at DESC LIMIT 1").bind(owner).first<OrderRow>();
  return Response.json({order:order?view(order):null},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return Response.json({error:"Nie udało się sprawdzić rozpoczętej książeczki."},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
