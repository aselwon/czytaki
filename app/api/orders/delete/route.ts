import {deleteOrderData} from "@/lib/server/retention";
import {infrastructure,HttpError,apiError} from "@/lib/server/runtime";
import {verifyDeletionToken} from "@/lib/server/retention-token";

export async function POST(req:Request){try{
 const body=await req.json() as {token?:unknown};
 if(typeof body.token!=="string")throw new HttpError(403,"Link usuwania jest nieprawidłowy lub wygasł.");
 const id=await verifyDeletionToken(body.token);
 await deleteOrderData(infrastructure(),id);
 return Response.json({deleted:true},{headers:{"Cache-Control":"no-store"}});
}catch(error){return apiError(error);}}
