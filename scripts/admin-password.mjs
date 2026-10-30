import {randomBytes} from "node:crypto";
import {existsSync,readFileSync,writeFileSync,chmodSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=fileURLToPath(new URL("../",import.meta.url)),file=path.join(root,".env.local");
if(!existsSync(file))throw new Error("Brakuje .env.local. Najpierw skopiuj .env.example.");
const password=randomBytes(32).toString("hex"),current=readFileSync(file,"utf8");
const next=/^ADMIN_PASSWORD=/m.test(current)?current.replace(/^ADMIN_PASSWORD=.*$/m,`ADMIN_PASSWORD=${password}`):`${current.trimEnd()}\nADMIN_PASSWORD=${password}\n`;
writeFileSync(file,next,{encoding:"utf8",mode:0o600});chmodSync(file,0o600);
console.log("Wygenerowano nowe hasło panelu i zapisano je w .env.local. Jego wartość nie została wypisana.");
