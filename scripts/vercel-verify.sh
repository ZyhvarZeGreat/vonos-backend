#!/usr/bin/env bash
# Verify the ops-app scraper gate (middleware.ts) after a Vercel deploy.
#   bash scripts/vercel-verify.sh [base-url]
# Default base: https://www.vonosgroup.com
#
# PASS = bots/scanners 404 on app routes, browsers 200, marketing open,
#        RSC/prefetch 200. Exits non-zero if any check fails.
set -uo pipefail

BASE="${1:-https://www.vonosgroup.com}"
APP_URL="$BASE/VA/overview"
BROWSER_UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
fails=0

code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
line() { printf "  %-34s %s\n" "$1" "$2"; }

check() {
  local label="$1" expected="$2" got="$3"
  if [[ "$got" == "$expected" ]]; then
    line "$label" "PASS ($got)"
  else
    line "$label" "FAIL (got $got, want $expected)"
    fails=$((fails + 1))
  fi
}

echo "Verifying $BASE"
echo
echo "Bot / scanner gate on app routes (expect 404):"
check "GPTBot -> /VA/overview"       404 "$(code -A "GPTBot/1.0" "$APP_URL")"
check "curl (no custom UA)"          404 "$(code "$APP_URL")"
check "empty User-Agent"             404 "$(code -A "" "$APP_URL")"
check "SemrushBot -> /VISP/customers" 404 "$(code -A "Mozilla/5.0 (compatible; SemrushBot/7~bl)" "$BASE/VISP/customers")"
check "ClaudeBot -> /VW/inventory"   404 "$(code -A "ClaudeBot/1.0" "$BASE/VW/inventory/x")"

echo
echo "Legitimate traffic (expect 200):"
check "browser -> /VA/overview"       200 "$(code -A "$BROWSER_UA" -H "Accept: text/html,application/xhtml+xml" "$APP_URL")"
check "RSC/prefetch -> /VA/overview"  200 "$(code -A "$BROWSER_UA" -H "RSC: 1" -H "Accept: text/x-component" "$APP_URL")"
check "marketing /"                   200 "$(code -A "GPTBot/1.0" "$BASE/")"
check "marketing /services"           200 "$(code -A "GPTBot/1.0" "$BASE/services")"

echo
echo "Headers / robots:"
hdr="$(curl -s -I -A "$BROWSER_UA" "$APP_URL" | tr -d '\r' | grep -i '^x-robots-tag:' | head -1)"
if echo "$hdr" | grep -qi 'noindex'; then line "x-robots-tag noindex on app" "PASS"; else line "x-robots-tag noindex on app" "FAIL (${hdr:-missing})"; fails=$((fails + 1)); fi
if curl -s "$BASE/robots.txt" | grep -qiE 'Disallow: /(VA|VW|VISP)'; then line "robots disallows app prefixes" "PASS"; else line "robots disallows app prefixes" "FAIL"; fails=$((fails + 1)); fi

echo
if [[ "$fails" -eq 0 ]]; then
  echo "ALL CHECKS PASSED"
else
  echo "$fails CHECK(S) FAILED"
  exit 1
fi
