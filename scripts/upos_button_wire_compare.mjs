#!/usr/bin/env node
/**
 * Side-by-side screenshots for batch 61–70 modal/route button wiring.
 *
 * Captures VA live targets after clicking Add/Edit/Docs or navigating create
 * routes, then diffs against HQ6 ui-walkthrough modal|subpage screenshots.
 *
 * Usage:
 *   node scripts/upos_button_wire_compare.mjs
 *
 * Env: BASE_URL, API_URL, VA_EMAIL, VA_PASSWORD, PUPPETEER_EXECUTABLE_PATH
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WALK = path.join(ROOT, "hq6.vonosautomarket.com/ui-walkthrough");
const OUT_DIR = path.join(ROOT, "hq6.vonosautomarket.com/va-compare");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:3001";
const EMAIL = process.env.VA_EMAIL || "admin@va.vonos";
const PASSWORD = process.env.VA_PASSWORD || "password";
const VIEWPORT = { width: 1440, height: 900 };

/** @typedef {"modal"|"subpage"|"route"} CaptureKind */

/**
 * @type {Array<{
 *   id: string;
 *   audit: string;
 *   route: string;
 *   kind: CaptureKind;
 *   hq6Rel: string;
 *   prepare?: (page: import('puppeteer-core').Page) => Promise<void>;
 *   clipSelector?: string;
 * }>}
 */
const CASES = [
  {
    id: "61_go-back",
    audit: "61_modules__orders",
    route: "/VA/orders",
    kind: "route",
    hq6Rel: "61_modules__orders/buttons/00_go-back/subpage/screenshot.png",
    prepare: async (page) => {
      await page.click("a.hq6-orders-go-back, a[title='Go Back']");
      await page.waitForFunction(
        () => /\/VA\/overview\/?$/.test(location.pathname),
        { timeout: 15000 },
      );
      await sleep(800);
    },
    clipSelector: ".hq6-page",
  },
  {
    id: "64_add-modal",
    audit: "64_business-location",
    route: "/VA/locations",
    kind: "modal",
    hq6Rel: "64_business-location/buttons/00_add/modal/screenshot.png",
    prepare: async (page) => {
      await clickAdd(page);
      await waitModal(page, /Add a new business location/i);
    },
    clipSelector: ".hq6-modal-panel, [role='dialog']",
  },
  {
    id: "64_edit-modal",
    audit: "64_business-location",
    route: "/VA/locations",
    kind: "modal",
    hq6Rel: "64_business-location/buttons/01_edit/modal/screenshot.png",
    prepare: async (page) => {
      await ensureLocationRow(page);
      await clickLabel(page, /^Edit$/i, "button.btn-primary, button.btn-xs");
      await waitModal(page, /Edit business location/i);
    },
    clipSelector: ".hq6-modal-panel, [role='dialog']",
  },
  {
    id: "68_add-rate-modal",
    audit: "68_tax-rates",
    route: "/VA/tax-rates",
    kind: "modal",
    hq6Rel: "68_tax-rates/buttons/00_add/modal/screenshot.png",
    prepare: async (page) => {
      await clickGradientAdd(page, 0);
      await waitModal(page, /Add Tax Rate/i);
    },
    clipSelector: ".hq6-modal-panel, [role='dialog']",
  },
  {
    id: "68_add-group-modal",
    audit: "68_tax-rates",
    route: "/VA/tax-rates",
    kind: "modal",
    hq6Rel: "68_tax-rates/buttons/01_add/modal/screenshot.png",
    prepare: async (page) => {
      await clickGradientAdd(page, 1);
      await waitModal(page, /Add Tax Rate/i);
    },
    clipSelector: ".hq6-modal-panel, [role='dialog']",
  },
  {
    id: "68_edit-rate-modal",
    audit: "68_tax-rates",
    route: "/VA/tax-rates",
    kind: "modal",
    hq6Rel: "68_tax-rates/buttons/04_edit/modal/screenshot.png",
    prepare: async (page) => {
      await clickLabel(page, /^Edit$/i, "button.btn-xs, button");
      await waitModal(page, /Edit Tax Rate/i);
    },
    clipSelector: ".hq6-modal-panel, [role='dialog']",
  },
  {
    id: "66_barcode-create",
    audit: "66_barcodes",
    route: "/VA/barcode-settings/create",
    kind: "subpage",
    hq6Rel: "66_barcodes/buttons/00_add-new-setting/subpage/screenshot.png",
    clipSelector: ".hq6-page",
  },
  {
    id: "67_printer-create",
    audit: "67_printers",
    route: "/VA/receipt-printers/create",
    kind: "subpage",
    hq6Rel: "67_printers/buttons/00_add-printer/subpage/screenshot.png",
    clipSelector: ".hq6-page",
  },
  {
    id: "69_my-payrolls",
    audit: "69_hrm__dashboard",
    route: "/VA/hrm/my-payrolls",
    kind: "subpage",
    hq6Rel: "69_hrm__dashboard/buttons/01_my-payrolls/subpage/screenshot.png",
    clipSelector: ".hq6-page, main, #scrollable-container",
  },
  {
    id: "70_docs-modal",
    audit: "70_essentials__todo",
    route: "/VA/essentials-todo",
    kind: "modal",
    hq6Rel: "70_essentials__todo/buttons/04_docs/modal/screenshot.png",
    prepare: async (page) => {
      await ensureTodoRow(page);
      await page.waitForSelector(".hq6-actions-toggle", { timeout: 15000 });
      await page.click(".hq6-actions-toggle");
      await sleep(300);
      const opened = await page.evaluate(() => {
        const docs = [...document.querySelectorAll("button, [role='menuitem']")].find(
          (el) => el.textContent?.trim() === "Docs",
        );
        if (docs instanceof HTMLElement) {
          docs.click();
          return true;
        }
        return false;
      });
      if (!opened) throw new Error("Docs action not found");
      await waitModal(page, /View shared documents/i);
    },
    clipSelector: ".hq6-modal-panel, [role='dialog']",
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function clickAdd(page) {
  await clickGradientAdd(page, 0);
}

async function clickGradientAdd(page, index) {
  await page.waitForFunction(
    (i) => document.querySelectorAll(".upos-gradient-action").length > i,
    { timeout: 20000 },
    index,
  );
  await page.evaluate((i) => {
    const btns = [...document.querySelectorAll(".upos-gradient-action")];
    btns[i]?.click();
  }, index);
  await sleep(200);
}

async function clickLabel(page, labelRe, selector = "button, a") {
  await page.waitForFunction(
    (reSource, sel) => {
      const re = new RegExp(reSource, "i");
      return [...document.querySelectorAll(sel)].some((el) =>
        re.test((el.textContent || "").trim()),
      );
    },
    { timeout: 20000 },
    labelRe.source,
    selector,
  );
  const clicked = await page.evaluate(
    (reSource, sel) => {
      const re = new RegExp(reSource, "i");
      const el = [...document.querySelectorAll(sel)].find((node) =>
        re.test((node.textContent || "").trim()),
      );
      if (el instanceof HTMLElement) {
        el.click();
        return true;
      }
      return false;
    },
    labelRe.source,
    selector,
  );
  if (!clicked) throw new Error(`No control matching ${labelRe}`);
  await sleep(200);
}

async function ensureLocationRow(page) {
  const hasEdit = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some(
      (b) => b.textContent?.trim() === "Edit",
    ),
  );
  if (hasEdit) return;
  await clickGradientAdd(page, 0);
  await waitModal(page, /Add a new business location/i);
  await page.evaluate(() => {
    const name = document.querySelector(
      '.hq6-modal-panel input, [role="dialog"] input',
    );
    if (name instanceof HTMLInputElement) {
      name.value = "Verify Location";
      name.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  // Prefer controlled React onChange via typing
  const nameInput = await page.$(
    ".hq6-modal-panel input.hq6-modal-input, .hq6-modal-panel input, [role='dialog'] input",
  );
  if (nameInput) {
    await nameInput.click({ clickCount: 3 });
    await nameInput.type("Verify Location");
  }
  await page.evaluate(() => {
    const save = [...document.querySelectorAll("button")].find((b) =>
      /^Save$/i.test(b.textContent?.trim() ?? ""),
    );
    save?.click();
  });
  await sleep(800);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some(
        (b) => b.textContent?.trim() === "Edit",
      ),
    { timeout: 15000 },
  );
}

async function ensureTodoRow(page) {
  await page.evaluate(() => {
    const authRaw = localStorage.getItem("vonos-auth");
    let tenantId = "va";
    try {
      const auth = JSON.parse(authRaw || "{}");
      tenantId = auth?.state?.tenantId || tenantId;
    } catch {
      /* keep default */
    }
    const key = `vonos:hq6-todos:${tenantId}`;
    const now = new Date().toISOString();
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          id: "verify-todo",
          addedOn: now,
          taskId: "2026/0001",
          task: "Verify docs modal",
          status: "Pending",
          priority: "medium",
          startDate: now,
          endDate: now,
          estimatedHours: 1,
          assignedBy: "You",
          assignedTo: "You",
          tags: [],
        },
      ]),
    );
  });
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(1200);
}
async function waitModal(page, titleRe) {
  await page.waitForFunction(
    (reSource) => {
      const re = new RegExp(reSource, "i");
      const title = document.querySelector(
        ".hq6-modal-title, [role='dialog'] h4, .modal-title",
      );
      return title && re.test(title.textContent ?? "");
    },
    { timeout: 15000 },
    titleRe.source,
  );
  await sleep(400);
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
gap = 16
canvas = Image.new("RGB", (w * 2 + gap, top + 48), (30, 30, 30))
canvas.paste(left, (0, 48))
canvas.paste(right, (w + gap, 48))
draw = ImageDraw.Draw(canvas)
draw.text((12, 12), "HQ6 walkthrough", fill=(255,255,255))
draw.text((w + gap + 12, 12), "VA live", fill=(255,255,255))
canvas.save(${JSON.stringify(diffPath)})
hist = diff.histogram()
total = sum(hist)
weighted = sum((i % 256) * hist[i] for i in range(len(hist)))
mad = weighted / max(total, 1)
pixels = list(diff.getdata())
changed = sum(1 for r,g,b in pixels if r > 30 or g > 30 or b > 30)
pct = 100.0 * changed / max(len(pixels), 1)
print(json.dumps({"mad": round(mad, 2), "pct": round(pct, 2)}))
`;
  const r = spawnSync("python3", ["-c", py], { encoding: "utf8" });
  if (r.status !== 0) {
    return {
      error: (r.stderr || r.stdout || "diff failed").slice(0, 300),
      mad: 999,
      pct: 100,
    };
  }
  try {
    return JSON.parse(r.stdout.trim().split("\n").pop());
  } catch {
    return { error: r.stdout, mad: 999, pct: 100 };
  }
}

async function shotElement(page, selector, outPath) {
  if (selector) {
    const handle = await page.$(selector.split(",")[0].trim());
    if (handle) {
      const box = await handle.boundingBox();
      if (box && box.width > 2 && box.height > 2) {
        await page.screenshot({
          path: outPath,
          clip: {
            x: Math.max(0, box.x),
            y: Math.max(0, box.y),
            width: Math.min(box.width, VIEWPORT.width),
            height: Math.min(box.height, VIEWPORT.height * 1.5),
          },
        });
        return;
      }
    }
    // try alternate selectors
    for (const sel of selector.split(",").map((s) => s.trim())) {
      const h = await page.$(sel);
      if (!h) continue;
      await h.screenshot({ path: outPath }).catch(() => null);
      if (fs.existsSync(outPath)) return;
    }
  }
  await page.screenshot({ path: outPath, fullPage: false });
}

async function main() {
  let puppeteer;
  try {
    puppeteer = await import("puppeteer-core");
  } catch {
    puppeteer = await import("puppeteer");
  }

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
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    ],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.goto(`${BASE_URL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.evaluate((payload) => {
    localStorage.setItem("vonos-auth", JSON.stringify(payload));
  }, authState);

  const results = [];

  for (const c of CASES) {
    const outFolder = path.join(OUT_DIR, c.audit, c.id);
    fs.mkdirSync(outFolder, { recursive: true });
    const vaShot = path.join(outFolder, "va.png");
    const sideBySide = path.join(outFolder, "side-by-side.png");
    const hq6Shot = path.join(WALK, c.hq6Rel);

    process.stdout.write(`→ ${c.id} ${c.route} … `);
    try {
      if (!fs.existsSync(hq6Shot)) {
        throw new Error(`Missing HQ6 shot: ${c.hq6Rel}`);
      }
      await page.goto(`${BASE_URL}${c.route}`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      await sleep(1200);
      if (c.prepare) await c.prepare(page);
      await shotElement(page, c.clipSelector, vaShot);
      const score = pixelDiffScore(hq6Shot, vaShot, sideBySide);
      fs.writeFileSync(
        path.join(outFolder, "meta.json"),
        JSON.stringify(
          {
            id: c.id,
            route: c.route,
            kind: c.kind,
            hq6: c.hq6Rel,
            ...score,
            capturedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
      console.log(
        score.error
          ? `ERR ${score.error}`
          : `ok mad=${score.mad} pct=${score.pct}%`,
      );
      results.push({ id: c.id, audit: c.audit, ...score, ok: !score.error });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAIL ${msg}`);
      results.push({ id: c.id, audit: c.audit, ok: false, error: msg });
      fs.writeFileSync(
        path.join(outFolder, "meta.json"),
        JSON.stringify(
          { id: c.id, error: msg, capturedAt: new Date().toISOString() },
          null,
          2,
        ),
      );
    }
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, "BUTTON_WIRE_REPORT.md");
  const lines = [
    "# Batch 61–70 button wire verify",
    "",
    `| Case | Status | MAD | Δ% |`,
    `|---|---|---|---|`,
    ...results.map((r) => {
      if (!r.ok) return `| ${r.id} | FAIL | — | ${r.error ?? ""} |`;
      return `| ${r.id} | ok | ${r.mad} | ${r.pct}% |`;
    }),
    "",
    "Outputs under `hq6.vonosautomarket.com/va-compare/{audit}/{case-id}/`.",
    "",
  ];
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`\nWrote ${reportPath}`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`${failed.length} case(s) failed`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
