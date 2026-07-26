#!/usr/bin/env node
/**
 * Capture live VA pages with Puppeteer and compare to HQ6 ui-audit screenshots.
 *
 * Usage:
 *   node scripts/upos_screenshot_compare.mjs              # all pages
 *   node scripts/upos_screenshot_compare.mjs --limit 8    # first N
 *   node scripts/upos_screenshot_compare.mjs --only 00_home,08_products
 *
 * Env:
 *   BASE_URL=http://localhost:3000
 *   API_URL=http://localhost:3001
 *   VA_EMAIL=admin@va.vonos
 *   VA_PASSWORD=password
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIT_TS = path.join(ROOT, "apps/web/lib/registries/uposPageAudit.ts");
const HQ6_AUDIT = path.join(ROOT, "hq6.vonosautomarket.com/ui-audit");
const OUT_DIR = path.join(ROOT, "hq6.vonosautomarket.com/va-compare");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:3001";
const EMAIL = process.env.VA_EMAIL || "admin@va.vonos";
const PASSWORD = process.env.VA_PASSWORD || "password";
const VIEWPORT = { width: 1440, height: 900 };

function parseArgs(argv) {
  const out = { limit: null, only: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--only") out.only = new Set(argv[++i].split(",").map((s) => s.trim()));
  }
  return out;
}

function parseAuditPages(ts) {
  const pages = [];
  const re =
    /\{\s*label:\s*"([^"]+)",\s*audit:\s*"([^"]+)",\s*route:\s*"([^"]+)",\s*section:\s*"([^"]+)"\s*,?\s*\}/gs;
  let m;
  while ((m = re.exec(ts))) {
    pages.push({ label: m[1], audit: m[2], route: m[3], section: m[4] });
  }
  return pages;
}

async function loginApi() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login failed HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function pixelDiffScore(hq6Path, vaPath, diffPath) {
  const py = `
from PIL import Image, ImageChops, ImageDraw
import json
hq6 = Image.open(${JSON.stringify(hq6Path)}).convert("RGB")
va = Image.open(${JSON.stringify(vaPath)}).convert("RGB")
target_w = hq6.width
if va.width != target_w:
    va = va.resize((target_w, max(1, int(va.height * target_w / va.width))))
w = target_w
h2 = min(hq6.height, va.height)
hq6_c = hq6.crop((0, 0, w, h2))
va_c = va.crop((0, 0, w, h2))
diff = ImageChops.difference(hq6_c, va_c)
top = min(900, h2)
left = hq6_c.crop((0, 0, w, top))
right = va_c.crop((0, 0, w, top))
heat = ImageChops.difference(left, right)
heat_vis = heat.point(lambda p: min(255, p * 3))
gap = 16
canvas = Image.new("RGB", (w * 2 + gap, top + 48), (30, 30, 30))
canvas.paste(left, (0, 48))
canvas.paste(right, (w + gap, 48))
draw = ImageDraw.Draw(canvas)
draw.text((12, 12), "HQ6 scrape", fill=(255,255,255))
draw.text((w + gap + 12, 12), "VA live", fill=(255,255,255))
canvas.save(${JSON.stringify(diffPath)})
hist = diff.histogram()
total = sum(hist)
weighted = sum((i % 256) * hist[i] for i in range(len(hist)))
mad = weighted / max(total, 1)
pixels = list(diff.getdata())
changed = sum(1 for r,g,b in pixels if r > 30 or g > 30 or b > 30)
pct = 100.0 * changed / max(len(pixels), 1)
top_pixels = list(heat.getdata())
top_changed = sum(1 for r,g,b in top_pixels if r > 30 or g > 30 or b > 30)
top_pct = 100.0 * top_changed / max(len(top_pixels), 1)
print(json.dumps({"mad": round(mad, 2), "pct": round(pct, 2), "topPct": round(top_pct, 2), "hq6": list(hq6.size), "va": list(va.size)}))
`;
  const r = spawnSync("python3", ["-c", py], { encoding: "utf8" });
  if (r.status !== 0) {
    return { error: (r.stderr || r.stdout || "diff failed").slice(0, 300), mad: 999, pct: 100, topPct: 100 };
  }
  try {
    return JSON.parse(r.stdout.trim().split("\n").pop());
  } catch {
    return { error: r.stdout, mad: 999, pct: 100, topPct: 100 };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  // Prefer puppeteer-core + system Chrome (no Chromium download).
  let puppeteer;
  try {
    puppeteer = await import("puppeteer-core");
  } catch {
    puppeteer = await import("puppeteer");
  }

  const pages = parseAuditPages(fs.readFileSync(AUDIT_TS, "utf8"));
  if (!pages.length) throw new Error("No pages parsed from uposPageAudit.ts");

  let selected = pages;
  if (args.only) selected = pages.filter((p) => args.only.has(p.audit));
  if (args.limit) selected = selected.slice(0, args.limit);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Login ${EMAIL} → ${API_URL}`);
  const login = await loginApi();
  const authState = {
    state: {
      userId: login.user.id,
      email: login.user.email,
      name: login.user.name,
      tenantId: login.user.tenantId,
      role: login.user.role,
      token: login.accessToken,
      isAuthenticated: true,
    },
    version: 0,
  };

  const chromePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  const browser = await puppeteer.default.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage", `--window-size=${VIEWPORT.width},${VIEWPORT.height}`],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Seed auth before any app route
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate((payload) => {
    localStorage.setItem("vonos-auth", JSON.stringify(payload));
  }, authState);

  const results = [];

  for (const entry of selected) {
    const url = `${BASE_URL}${entry.route}`;
    const pageOut = path.join(OUT_DIR, entry.audit);
    fs.mkdirSync(pageOut, { recursive: true });
    const vaShot = path.join(pageOut, "va.png");
    const sideBySide = path.join(pageOut, "side-by-side.png");
    const hq6Shot = path.join(HQ6_AUDIT, entry.audit, "screenshot.png");

    process.stdout.write(`→ ${entry.audit} ${entry.route} … `);
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
      // Let HQ6/UPOS CSS + React settle (orders needs empty-state settle)
      const settleMs =
        entry.audit === "61_modules__orders"
          ? 2800
          : entry.audit === "01_users"
            ? 4000
            : 1200;
      await new Promise((r) => setTimeout(r, settleMs));
      if (entry.audit === "01_users") {
        try {
          await page.waitForFunction(
            () => {
              const info = document.querySelector(".dataTables_info");
              const rows = document.querySelectorAll(
                ".hq6-table-wrap tbody tr, table.dataTable tbody tr",
              ).length;
              const text = info?.textContent ?? "";
              return rows > 0 || /Showing 0 to 0/.test(text) || /No data/.test(document.body.innerText);
            },
            { timeout: 15000 },
          );
        } catch {
          /* proceed with whatever rendered */
        }
      }
      // Dismiss common overlays if any
      await page.evaluate(() => {
        document.querySelectorAll(".modal.in, .modal.show").forEach((el) => {
          el.classList.remove("in", "show");
          el.style.display = "none";
        });
      });

      // Orders ui-audit scrape is content-only (no shell) — capture .hq6-page.
      const contentOnly = entry.audit === "61_modules__orders";
      if (contentOnly) {
        const pageEl = await page.$(".hq6-page");
        if (pageEl) {
          const box = await pageEl.boundingBox();
          if (box) {
            await page.screenshot({
              path: vaShot,
              clip: {
                x: Math.max(0, box.x),
                y: Math.max(0, box.y),
                width: Math.min(box.width, VIEWPORT.width),
                height: Math.min(Math.max(box.height, 1), VIEWPORT.height),
              },
            });
          } else {
            await pageEl.screenshot({ path: vaShot });
          }
        } else {
          await page.screenshot({ path: vaShot, fullPage: false });
        }
      } else {
        // Prefer capturing the UPOS scrollport full height (shell uses overflow:hidden).
        await page.evaluate(async () => {
          const sc = document.getElementById("scrollable-container");
          if (sc) {
            sc.scrollTop = 0;
            await new Promise((r) => setTimeout(r, 100));
          }
        });
        const scHandle = await page.$("#scrollable-container");
        if (scHandle) {
          const box = await page.evaluate((el) => {
            const node = el;
            return {
              width: node.clientWidth,
              height: Math.min(node.scrollHeight, 12000),
              scrollHeight: node.scrollHeight,
            };
          }, scHandle);
          await page.evaluate((el) => {
            el.style.maxHeight = "none";
            el.style.height = `${el.scrollHeight}px`;
            el.style.overflow = "visible";
          }, scHandle);
          await page.screenshot({ path: vaShot, fullPage: true });
          await page.evaluate(
            (el, h) => {
              el.style.maxHeight = "";
              el.style.height = "";
              el.style.overflow = "";
              void h;
            },
            scHandle,
            box.height,
          );
        } else {
          await page.screenshot({ path: vaShot, fullPage: true });
        }
      }

      let score = { mad: null, pct: null, topPct: null };
      if (fs.existsSync(hq6Shot)) {
        score = pixelDiffScore(hq6Shot, vaShot, sideBySide);
      } else {
        score = { error: "missing hq6 screenshot", mad: 999, pct: 100, topPct: 100 };
      }

      const row = {
        audit: entry.audit,
        label: entry.label,
        route: entry.route,
        va: vaShot,
        hq6: hq6Shot,
        sideBySide: fs.existsSync(sideBySide) ? sideBySide : null,
        ...score,
      };
      results.push(row);
      console.log(
        `topΔ ${score.topPct ?? "?"}%  fullΔ ${score.pct ?? "?"}%  mad ${score.mad ?? "?"}${score.error ? " ERR:" + score.error : ""}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        audit: entry.audit,
        label: entry.label,
        route: entry.route,
        error: msg,
        topPct: 100,
        pct: 100,
        mad: 999,
      });
      console.log(`FAIL ${msg}`);
    }
  }

  await browser.close();

  results.sort((a, b) => (b.topPct ?? 0) - (a.topPct ?? 0));
  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    count: results.length,
    worstByTopBand: results.slice(0, 15).map((r) => ({
      audit: r.audit,
      label: r.label,
      topPct: r.topPct,
      pct: r.pct,
      error: r.error,
    })),
    results,
  };
  const reportPath = path.join(OUT_DIR, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Markdown summary
  const md = [
    `# VA ↔ HQ6 screenshot compare`,
    ``,
    `Captured: ${report.capturedAt}`,
    `Base: ${BASE_URL}`,
    `Pages: ${results.length}`,
    ``,
    `| Δ top 900px | Δ full | Page | Route |`,
    `|---:|---:|---|---|`,
    ...results.map(
      (r) =>
        `| ${r.topPct ?? "—"}% | ${r.pct ?? "—"}% | \`${r.audit}\` ${r.label}${r.error ? " ⚠️" : ""} | \`${r.route}\` |`,
    ),
    ``,
    `Artifacts under \`${path.relative(ROOT, OUT_DIR)}/<audit>/\` (\`va.png\`, \`side-by-side.png\`).`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "REPORT.md"), md);

  console.log(`\nWrote ${reportPath}`);
  console.log(`Worst top-band deltas:`);
  for (const r of report.worstByTopBand.slice(0, 10)) {
    console.log(`  ${String(r.topPct).padStart(6)}%  ${r.audit}  ${r.label}${r.error ? " — " + r.error : ""}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
