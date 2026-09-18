import {runtime,salesReady,price} from "@/lib/server/runtime";
export async function GET(){const e=runtime();return Response.json({generation:!!(e.OPENAI_API_KEY&&e.DB&&e.BUCKET),checkout:salesReady(),amount:price(),currency:"pln"},{headers:{"Cache-Control":"no-store"}});}
