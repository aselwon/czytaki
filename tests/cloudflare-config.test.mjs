import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

const config = JSON.parse(readFileSync(new URL('../cloudflare.production.json', import.meta.url), 'utf8'));

test('production configuration targets the owner with private storage and sales disabled', () => {
 assert.equal(config.account_id, '2791466c5820cfd886aad95e0d3ef948');
 assert.equal(config.workers_dev, true);
 assert.equal(config.preview_urls, false);
 assert.equal(config.vars.SALES_ENABLED, 'false');
 assert.equal(config.vars.OPENAI_DAILY_COST_CAP_GROSZE, '500');
 assert.equal(config.vars.OPENAI_USD_PLN_RATE, '4.00');
 assert.deepEqual(config.routes, [{pattern: 'czytaki.kredkuj.pl', custom_domain: true}]);
 assert.equal(config.vars.APP_URL, 'https://czytaki.kredkuj.pl');
 assert.equal(config.vars.EMAIL_FROM, 'Czytaki <zamowienia@czytaki.kredkuj.pl>');
 assert.equal(config.vars.PREVIEW_WORKERS_AI, 'false');
 assert.equal(config.vars.PREVIEW_DAILY_NEURON_CAP, '5000');
 assert.deepEqual(config.ai, {binding: 'AI'});
 assert.deepEqual(config.d1_databases, [{binding: 'DB', database_name: 'czytaki-production-orders', database_id: '6b7b4278-352d-4c93-9bdc-b13d14693572', migrations_dir: 'drizzle'}]);
 assert.deepEqual(config.r2_buckets, [{binding: 'BUCKET', bucket_name: 'czytaki-private'}]);
 assert.deepEqual(config.triggers.crons, ['17 2 * * *']);
});

test('all production migrations initialize an empty database', t => {
 const db = new DatabaseSync(':memory:');
 t.after(() => db.close());
 const directory = new URL('../drizzle/', import.meta.url);
 for (const file of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
  db.exec(readFileSync(new URL(file, directory), 'utf8'));
 }
 const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
 for (const table of ['orders', 'generation_quotas', 'preview_neuron_quotas', 'admin_login_attempts', 'ai_calls']) assert.ok(tables.includes(table));
 const columns = db.prepare('PRAGMA table_info(orders)').all().map(row => row.name);
 assert.ok(columns.includes('payment_verified_at'));
 assert.ok(columns.includes('ai_cost_cents'));
 assert.equal(db.prepare('SELECT count(*) AS count FROM orders').get().count, 0);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});

// The substitute CLI only reports non-secret settings; it cannot access Cloudflare.
test('Wrangler wrapper overrides inherited account and isolates the owner login', t => {
 const root = mkdtempSync(join(tmpdir(), 'czytaki-cloudflare-'));
 t.after(() => rmSync(root, {recursive: true, force: true}));
 mkdirSync(join(root, 'scripts'));
 mkdirSync(join(root, 'node_modules/wrangler/bin'), {recursive: true});
 copyFileSync(new URL('../scripts/cloudflare.mjs', import.meta.url), join(root, 'scripts/cloudflare.mjs'));
 writeFileSync(join(root, 'cloudflare.production.json'), JSON.stringify(config));
 writeFileSync(join(root, 'node_modules/wrangler/bin/wrangler.js'), `require("node:fs").writeFileSync("observed.json", JSON.stringify({account:process.env.CLOUDFLARE_ACCOUNT_ID,profile:process.env.XDG_CONFIG_HOME,args:process.argv.slice(2)}));process.exitCode=7;`);
 const result = spawnSync(process.execPath, [join(root, 'scripts/cloudflare.mjs'), 'whoami'], {
  encoding: 'utf8', env: {...process.env, CLOUDFLARE_ACCOUNT_ID: 'different-account'},
 });
 assert.equal(result.status, 7, result.stderr);
 assert.deepEqual(JSON.parse(readFileSync(join(root, 'observed.json'), 'utf8')), {account: config.account_id, profile: join(root, '.wrangler/account-owner'), args: ['whoami']});
});
