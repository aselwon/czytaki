import { fileURLToPath } from "node:url";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");

const cli = fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url));
process.argv = [process.execPath, cli, command,
  ...(command === "dev" ? ["--port", "5173"] : []), ...args];
await import(cli);
