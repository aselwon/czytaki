import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const wrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const backupState = path.resolve(process.env.CZYTAKI_STATE ?? ".wrangler/state");
const restoreState = path.resolve(process.env.CZYTAKI_STATE ?? ".wrangler/state-staging");
const config = path.resolve(process.env.CZYTAKI_CONFIG ?? "dist/server/wrangler.json");
const [command, directory, ...keys] = process.argv.slice(2);

function run(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function assertLocalConfig() {
  const settings = JSON.parse(readFileSync(config, "utf8"));
  if (!settings.d1_databases?.some((db) => db.binding === "DB") || !settings.r2_buckets?.some((bucket) => bucket.binding === "BUCKET")) {
    throw new Error(`Konfiguracja ${config} musi zawierać bindingi DB i BUCKET.`);
  }
}

function validateKey(key) {
  if (typeof key !== "string" || !key || key.startsWith("/") || key.split("/").includes("..")) {
    throw new Error(`Nieprawidłowy klucz R2: ${key}`);
  }
}

function backup() {
  if (!directory) throw new Error("Użycie: node scripts/backup.mjs backup KATALOG [klucz-R2 ...]");
  assertLocalConfig();
  const target = path.resolve(directory);
  mkdirSync(path.join(target, "objects"), { recursive: true });
  run(["d1", "export", "DB", "--local", "--config", config, "--output", path.join(target, "d1.sql"), "--skip-confirmation"]);
  const manifest = [];
  for (const key of keys) {
    validateKey(key);
    const output = path.join(target, "objects", ...key.split("/"));
    mkdirSync(path.dirname(output), { recursive: true });
    run(["r2", "object", "get", `BUCKET/${key}`, "--local", "--persist-to", backupState, "--config", config, "--file", output]);
    manifest.push(key);
  }
  writeFileSync(path.join(target, "r2-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Kopia lokalna zapisana w ${target}. R2: ${manifest.length} obiektów.`);
}

function restore() {
  if (!directory) throw new Error("Użycie: node scripts/backup.mjs restore KATALOG");
  assertLocalConfig();
  const source = path.resolve(directory);
  const manifest = JSON.parse(readFileSync(path.join(source, "r2-manifest.json"), "utf8"));
  if (!Array.isArray(manifest)) throw new Error("Manifest R2 musi być listą kluczy.");
  for (const key of manifest) validateKey(key);
  run(["d1", "execute", "DB", "--local", "--persist-to", restoreState, "--config", config, "--file", path.join(source, "d1.sql")]);
  for (const key of manifest) {
    const file = path.join(source, "objects", ...key.split("/"));
    run(["r2", "object", "put", `BUCKET/${key}`, "--local", "--persist-to", restoreState, "--config", config, "--file", file]);
  }
  console.log(`Odtworzono lokalnie D1 i ${manifest.length} obiektów R2.`);
}

if (command === "backup") backup();
else if (command === "restore") restore();
else {
  console.error("Użycie: node scripts/backup.mjs backup KATALOG [klucz-R2 ...] | restore KATALOG");
  process.exitCode = 2;
}
