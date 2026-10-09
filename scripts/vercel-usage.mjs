#!/usr/bin/env node
/**
 * Vercel usage report — shows what is burning credits, by category.
 *
 * Run with a token from the account that OWNS the project (must have team
 * access). Get one at https://vercel.com/account/tokens (scope: the team).
 *
 *   VERCEL_TOKEN=xxx VERCEL_TEAM_ID=team_xxx node vercel-usage.mjs \
 *     --from 2026-10-01 --to 2026-10-08
 *
 * Options:
 *   --team <id>   team id (or env VERCEL_TEAM_ID)
 *   --from YYYY-MM-DD   (default: 1st of current month)
 *   --to   YYYY-MM-DD   (default: today)
 */
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const TOKEN = process.env.VERCEL_TOKEN?.trim();
const TEAM = (opt('--team') ?? process.env.VERCEL_TEAM_ID ?? '').trim();
if (!TOKEN) { console.error('Set VERCEL_TOKEN env var (token from the owning account).'); process.exit(1); }

const now = new Date();
const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const from = new Date(`${opt('--from') ?? monthStart.toISOString().slice(0, 10)}T00:00:00.000Z`);
const to = new Date(`${opt('--to') ?? now.toISOString().slice(0, 10)}T23:59:59.000Z`);

const TYPES = [
  'requests', 'edge', 'edge_group_by_project', 'builds', 'monitoring',
  'cron_jobs', 'data_cache', 'artifacts', 'log_drains',
  'storage_postgres', 'storage_redis', 'storage_blob',
];

const money = (v) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : v);

async function get(path, params) {
  const url = new URL(`https://api.vercel.com${path}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; }
  catch { return { status: res.status, body: text }; }
}

async function main() {
  console.log(`Vercel usage  ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`);
  if (TEAM) console.log(`team: ${TEAM}`);
  else console.log('team: (personal scope — pass --team if the project is under a team)');

  // Confirm access.
  const proj = await get('/v9/projects', { teamId: TEAM || undefined, limit: 50 });
  const projects = proj.body?.projects ?? [];
  console.log(`\nProjects visible: ${projects.length}`);
  for (const p of projects) console.log(`  - ${p.name} (${p.id})`);
  if (!projects.length) {
    console.log('\n⚠  No projects visible — this token cannot read the project\'s team.');
    console.log('   Use a token from the account that owns the deployment (with team access).');
  }

  console.log('\nUsage by category:');
  for (const type of TYPES) {
    const { status, body } = await get('/v2/usage', {
      teamId: TEAM || undefined,
      type,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    if (status >= 400) {
      console.log(`  ${type.padEnd(24)} — ${body?.error?.code ?? status}: ${body?.error?.message ?? ''}`);
      continue;
    }
    // Response shape varies; surface total + a compact per-key breakdown.
    const total = body?.total ?? body?.usage ?? body?.value;
    if (total != null && typeof total === 'number') {
      console.log(`  ${type.padEnd(24)} — ${money(total)}`);
      continue;
    }
    // Nested object: sum numeric leaves for a headline, print top keys.
    const flat = [];
    const walk = (o, pre = '') => {
      if (o == null) return;
      if (typeof o === 'number') { flat.push([pre, o]); return; }
      if (typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, pre ? `${pre}.${k}` : k);
    };
    walk(body);
    const nums = flat.filter(([, v]) => typeof v === 'number');
    if (nums.length) {
      const sum = nums.reduce((s, [, v]) => s + v, 0);
      console.log(`  ${type.padEnd(24)} — total ${money(sum)}  (${nums.length} metrics)`);
      for (const [k, v] of nums.sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`       ${k}: ${money(v)}`);
    } else {
      console.log(`  ${type.padEnd(24)} — ${JSON.stringify(body).slice(0, 120)}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
