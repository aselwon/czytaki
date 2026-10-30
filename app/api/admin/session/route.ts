import {z} from "zod";
import {adminApiError,adminCookie,adminHeaders,assertAdminLoginAllowed,clearAdminCookie,localAdmin,recordAdminLogin,requireAdmin,validAdminPassword} from "@/lib/server/admin";
import {HttpError,sameOrigin} from "@/lib/server/runtime";

export async function GET(req:Request){try{await requireAdmin(req);return Response.json({authorized:true,local:localAdmin(req)},{headers:adminHeaders()});}catch(e){return adminApiError(e);}}
export async function POST(req:Request){try{sameOrigin(req);await assertAdminLoginAllowed(req);const parsed=z.object({password:z.string().min(1).max(300)}).safeParse(await req.json());const valid=parsed.success&&await validAdminPassword(parsed.data.password);await recordAdminLogin(req,valid);if(!valid)throw new HttpError(401,"Nieprawidłowe hasło administratora.");return Response.json({authorized:true,local:localAdmin(req)},{headers:adminHeaders({"Set-Cookie":await adminCookie(req)})});}catch(e){return adminApiError(e);}}
export async function DELETE(req:Request){try{sameOrigin(req);return Response.json({authorized:false},{headers:adminHeaders({"Set-Cookie":clearAdminCookie(req)})});}catch(e){return adminApiError(e);}}
