import {existsSync,readFileSync} from "node:fs";
import {spawn,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=fileURLToPath(new URL("../",import.meta.url));
const envFile=path.join(root,".env.local"),wrangler=path.join(root,"node_modules/wrangler/bin/wrangler.js");
const setupOnly=process.argv.includes("--setup-only");

if(!existsSync(envFile)||!/^OPENAI_API_KEY=\s*[^\s#]+/m.test(readFileSync(envFile,"utf8"))){
 console.error("Brakuje OPENAI_API_KEY w .env.local.");process.exit(1);
}
if(!existsSync(wrangler)){console.error("Brakuje zależności. Uruchom najpierw: npm ci");process.exit(1);}
process.loadEnvFile(envFile);

const localVariables=[
 "OPENAI_API_KEY","OPENAI_TEXT_MODEL","OPENAI_LAYOUT_MODEL","OPENAI_IMAGE_MODEL","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","RESEND_API_KEY","EMAIL_FROM","DEMO_PDF_ORDER_ID","PDF_PREVIEW_ORDER_ID","ADMIN_PASSWORD"
].flatMap(key=>process.env[key]?["--var",`${key}:${process.env[key]}`]:[]);

function run(args){
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:"inherit",env:process.env});
 if(result.status!==0)process.exit(result.status??1);
}

run(["scripts/run-framework.mjs","build"]);
run(["--import","./scripts/sites-env.mjs",wrangler,"d1","execute","DB","--local","--persist-to",".wrangler/state","--config","dist/server/wrangler.json","--file","scripts/local-schema.sql"]);
if(setupOnly){console.log("Lokalna baza i aplikacja są gotowe.");process.exit(0);}

const child=spawn(process.execPath,["--import","./scripts/sites-env.mjs",wrangler,"dev","--config","dist/server/wrangler.json","--local","--persist-to",".wrangler/state","--ip","127.0.0.1","--port","8787","--inspector-port","0",...localVariables,"--var","APP_URL:http://127.0.0.1:8787","--var",`SALES_ENABLED:${process.env.SALES_ENABLED==="true"?"true":"false"}`,"--var",`PRICE_CENTS:${process.env.PRICE_CENTS||"2900"}`,"--var",`REGULAR_PRICE_CENTS:${process.env.REGULAR_PRICE_CENTS||"5900"}`,"--var","DAILY_GENERATION_LIMIT:0"],{cwd:root,stdio:"inherit",env:process.env});
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
child.on("exit",code=>process.exit(code??0));
