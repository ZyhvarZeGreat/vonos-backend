# Control Center — Vercel vs Neon regions

**Team:** Control Tower Control Center (`control-tower-control-center`)  
**Pulled:** 20 Sep 2026, 16:12 UTC (refresh)  
**Previous pull:** 20 Sep 2026 morning  
**Scope:** all 20 Vercel projects on the team  
**Source:** Vercel REST API (`/v9/projects`, `/v13/deployments/{id}`, `/v1/projects/{id}/env/{id}`)

Passwords and full `DATABASE_URL` values are omitted. Hostnames are enough to identify the Neon project and region.

---

## What changed since the last pull

Vercel function regions are **no longer all `iad1`**. Two London-DB apps were moved to London functions. Neon hosts did not change.

| Project | Before (functions) | Now (functions) | Neon | Pairing |
|---|---|---|---|---|
| control-center-late | iad1 | **lhr1** (London) | eu-west-2 | **matched** |
| control-center-ibl | iad1 | **lhr1** (London) | eu-west-2 | **matched** |
| control-center-kola | iad1 | iad1 (unchanged) | eu-west-2 | still transatlantic |

Everything else is unchanged: same Neon hosts, same pooler/direct split, dolly/fomo still Sensitive.

---

## Headline

**18 / 20** Vercel apps still run functions in **`iad1` (Washington, D.C.)**.  
**2 / 20** (`late`, `ibl`) now run in **`lhr1` (London)** — colocated with their Neon DBs.

Neon is still split across three AWS regions:

| Neon region | Location | Projects (readable) | Function pairing now |
|---|---|---:|---|
| `us-east-1` | N. Virginia | 8 | All on `iad1` — matched |
| `us-east-2` | Ohio | 7 | All on `iad1` — nearby, not same region |
| `eu-west-2` | London | 3 | **late + ibl on `lhr1` (matched)**; **kola still `iad1` (mismatch)** |
| unknown | Sensitive env | 2 | dolly, fomo — still unread |

**Counts:** 20 Vercel projects · 18 readable Neon URLs · 2 Sensitive.

Static/CDN traffic is still global. Function region is where **Node/serverless** runs. Neon region is where **Postgres compute** lives.

---

## Region codes

| Code | Meaning | AWS equivalent |
|---|---|---|
| `iad1` | Vercel Washington, D.C., USA | `us-east-1` (N. Virginia) |
| `lhr1` | Vercel London, UK | `eu-west-2` |
| `cle1` | Vercel Cleveland, USA (not in use) | `us-east-2` (Ohio) |

---

## Pairing quality

### Matched — Virginia functions + Virginia Neon (`iad1` → `us-east-1`)

| Vercel project | Functions | Neon host | Connection |
|---|---|---|---|
| control-center-gerald | iad1 | `ep-lucky-block-ai89z119.c-4.us-east-1.aws.neon.tech` | direct |
| control-center-walker | iad1 | `ep-rapid-band-aqfpr02j-pooler.c-8.us-east-1.aws.neon.tech` | pooler |
| control-center-c-c-affa | iad1 | `ep-falling-mouse-at54i0wm-pooler.c-9.us-east-1.aws.neon.tech` | pooler |
| control-center-alex | iad1 | `ep-spring-night-ap7lvkc6-pooler.c-7.us-east-1.aws.neon.tech` | pooler |
| control-center-mido | iad1 | `ep-purple-mud-aqhdlaz3-pooler.c-8.us-east-1.aws.neon.tech` | pooler |
| control-center-dada | iad1 | `ep-orange-bar-ampt4pkg-pooler.c-5.us-east-1.aws.neon.tech` | pooler |
| test-center | iad1 | `ep-dawn-bar-aqbqal0i-pooler.c-8.us-east-1.aws.neon.tech` | pooler |
| odins-chamber | iad1 | `ep-dawn-bar-aqbqal0i-pooler.c-8.us-east-1.aws.neon.tech` | pooler (same host as test-center) |

### Matched — London functions + London Neon (`lhr1` → `eu-west-2`) — **new**

| Vercel project | Functions | Neon host | Connection |
|---|---|---|---|
| control-center-late | **lhr1** | `ep-lively-recipe-ab1iq6vf-pooler.eu-west-2.aws.neon.tech` | pooler |
| control-center-ibl | **lhr1** | `ep-morning-bonus-abn6titz-pooler.eu-west-2.aws.neon.tech` | pooler |

### Nearby mismatch — D.C. functions + Ohio Neon (`iad1` → `us-east-2`)

Closest Vercel region for these DBs would be `cle1`.

| Vercel project | Functions | Neon host | Connection |
|---|---|---|---|
| control-center-water | iad1 | `ep-old-moon-axx2ipjl-pooler.c-4.us-east-2.aws.neon.tech` | pooler |
| control-center-cash | iad1 | `ep-old-hat-ay822av3.c-5.us-east-2.aws.neon.tech` | direct |
| control-center-lance | iad1 | `ep-sweet-water-axkybsdp.c-4.us-east-2.aws.neon.tech` | direct |
| control-center-jideman | iad1 | `ep-mute-cloud-ax2iexq4.c-4.us-east-2.aws.neon.tech` | direct |
| control-center-emtee | iad1 | `ep-patient-glitter-ayojg29a-pooler.c-5.us-east-2.aws.neon.tech` | pooler |
| control-center-tobi | iad1 | `ep-orange-flower-ax7qnjl2.c-4.us-east-2.aws.neon.tech` | direct |
| control-center-sam | iad1 | `ep-lively-credit-ay8ahg56-pooler.c-5.us-east-2.aws.neon.tech` | pooler |

### Transatlantic mismatch — D.C. functions + London Neon (`iad1` → `eu-west-2`)

| Vercel project | Functions | Neon host | Connection |
|---|---|---|---|
| control-center-kola | iad1 | `ep-super-sunset-ab6fuwin-pooler.eu-west-2.aws.neon.tech` | pooler |

### Unreadable (Sensitive)

Vercel will not return plaintext for env vars marked **Sensitive**.

| Vercel project | Functions | `DATABASE_URL` type |
|---|---|---|
| control-center-dolly | iad1 | Sensitive |
| control-center-fomo | iad1 | Sensitive |

---

## Full project inventory

Latest production deployment is `READY` on all 20. `control-center-dada` latest deploy has `target: null` (still READY). Next.js except `odins-chamber` (no framework).

| Vercel project | Function region | Neon region | Pooler | Pairing |
|---|---|---|---|---|
| control-center-gerald | iad1 | us-east-1 | no | matched |
| control-center-walker | iad1 | us-east-1 | yes | matched |
| control-center-c-c-affa | iad1 | us-east-1 | yes | matched |
| control-center-alex | iad1 | us-east-1 | yes | matched |
| control-center-mido | iad1 | us-east-1 | yes | matched |
| control-center-dada | iad1 | us-east-1 | yes | matched |
| test-center | iad1 | us-east-1 | yes | matched; shares Neon host with odins-chamber |
| odins-chamber | iad1 | us-east-1 | yes | matched; shares Neon host with test-center |
| control-center-late | **lhr1** | eu-west-2 | yes | **matched (changed)** |
| control-center-ibl | **lhr1** | eu-west-2 | yes | **matched (changed)** |
| control-center-water | iad1 | us-east-2 | yes | nearby |
| control-center-cash | iad1 | us-east-2 | no | nearby |
| control-center-lance | iad1 | us-east-2 | no | nearby |
| control-center-jideman | iad1 | us-east-2 | no | nearby |
| control-center-emtee | iad1 | us-east-2 | yes | nearby |
| control-center-tobi | iad1 | us-east-2 | no | nearby |
| control-center-sam | iad1 | us-east-2 | yes | nearby |
| control-center-kola | iad1 | eu-west-2 | yes | **transatlantic** |
| control-center-dolly | iad1 | unknown | — | Sensitive env |
| control-center-fomo | iad1 | unknown | — | Sensitive env |

Every readable URL uses database name `neondb` and user `neondb_owner`.

---

## Latency implications

```
User → Vercel CDN (global) → Function (iad1 or lhr1) → Neon Postgres
```

| Function → DB | Expected extra RTT | Projects |
|---|---|---|
| iad1 → Neon `us-east-1` | ~0–5 ms in-region | gerald, walker, affa, alex, mido, dada, test-center, odins-chamber |
| lhr1 → Neon `eu-west-2` | ~0–5 ms in-region | **late, ibl** |
| iad1 → Neon `us-east-2` | ~10–25 ms | water, cash, lance, jideman, emtee, tobi, sam |
| iad1 → Neon `eu-west-2` | ~70–120 ms each hop | **kola only** |

`kola` is the remaining transatlantic hop. A page with 3–5 sequential DB queries can still add hundreds of milliseconds on that app.

---

## Other notes (unchanged)

- **No Vercel Storage Neon integration** on the team. URLs are pasted project env vars.
- **Pooler vs direct:** `-pooler.` is right for serverless. Direct hosts: gerald, cash, lance, jideman, tobi.
- **Shared DB:** `test-center` and `odins-chamber` still share `ep-dawn-bar-aqbqal0i`.
- **Env keys:** most apps have `CC_ID` + `DATABASE_URL`. `control-center-lance` still has typo key `CC_iD`.
- **`.env-bosco` is not gitignored** (`.gitignore` is `.env.*` with a dot). Do not commit it.

---

## Recommended next steps

1. **kola:** set Vercel function region to `lhr1` (same as late/ibl) *or* move that Neon project to `us-east-1`. This is the last London mismatch.
2. **Ohio apps (optional):** move functions to `cle1` or Neon to `us-east-1` if you want one US pairing.
3. **Direct (non-pooler) URLs:** gerald, cash, lance, jideman, tobi — switch to the pooled hostname.
4. **dolly / fomo:** still Sensitive; read the host in the Vercel dashboard to finish the table.
5. Gitignore `.env-bosco` and rotate the token if this session is shared.

---

## Method

1. List projects: `GET /v9/projects?teamId=…`
2. Function region: `serverlessFunctionRegion` + `resourceConfig.functionDefaultRegions` + latest deployment `GET /v13/deployments/{id}` → `regions`
3. Neon region: decrypt `DATABASE_URL` via `GET /v1/projects/{id}/env/{envId}?decrypt=true`, parse hostname  
   Pattern: `*.{region}.{aws|azure|gcp}.neon.tech`
