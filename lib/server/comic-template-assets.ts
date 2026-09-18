import t0 from "../assets/comic-templates/0.png?inline";
import t1 from "../assets/comic-templates/1.png?inline";
import t2 from "../assets/comic-templates/2.png?inline";
import t3 from "../assets/comic-templates/3.png?inline";
import t4 from "../assets/comic-templates/4.png?inline";
import t5 from "../assets/comic-templates/5.png?inline";
import t6 from "../assets/comic-templates/6.png?inline";
import t7 from "../assets/comic-templates/7.png?inline";
import {Buffer} from "node:buffer";
const templates=[t0,t1,t2,t3,t4,t5,t6,t7];
export function comicTemplateBytes(index:number){const data=templates[index];if(!data)throw new Error("Unknown comic template");return new Uint8Array(Buffer.from(data.split(",")[1],"base64"));}
