import {apiError,ownOrder,view} from "@/lib/server/runtime";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{return Response.json(view(await ownOrder(req,(await params).id)),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiError(e);}}
