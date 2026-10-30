import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// A separate login prevents deployments using another project's account.
const root = fileURLToPath(new URL("../", import.meta.url));
const env = {
  ...process.env,
  XDG_CONFIG_HOME: `${root}.wrangler/account-adam`,
  CLOUDFLARE_ACCOUNT_ID: "130aa5101f2a9a9e790f166b0f54abae",
  WRANGLER_SEND_METRICS: "false",
  WRANGLER_WRITE_LOGS: "false",
};
const result = spawnSync(process.execPath, [
  `${root}node_modules/wrangler/bin/wrangler.js`, ...process.argv.slice(2),
], { cwd: root, env, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
