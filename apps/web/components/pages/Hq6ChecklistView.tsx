"use client";

import Link from "next/link";
import {
  HQ6_CHECKLIST,
  HQ6_CHECKLIST_CORE_AUDITS,
} from "@/lib/registries/hq6Checklist";

/** Dev/QA checklist — links all 71 VA routes to ui-audit folders. */
export function Hq6ChecklistView() {
  return (
    <div className="hq6-page">
      <section className="hq6-content-header">
        <h1>
          HQ6 Checklist <small>71 pages · ui-audit screenshot verification</small>
        </h1>
      </section>
      <div className="hq6-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--hq6-border)] bg-[#ecf0f5]">
              <th className="px-3 py-2 text-left">Phase</th>
              <th className="px-3 py-2 text-left">ui-audit folder</th>
              <th className="px-3 py-2 text-left">Route</th>
              <th className="px-3 py-2 text-left">Component</th>
              <th className="px-3 py-2 text-left">Shell</th>
              <th className="px-3 py-2 text-left">Verified</th>
            </tr>
          </thead>
          <tbody>
            {HQ6_CHECKLIST.map((row) => (
              <tr key={row.audit} className="border-b border-[var(--hq6-border)]">
                <td className="px-3 py-2">{row.phase}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.audit}</td>
                <td className="px-3 py-2">
                  <Link href={row.route} className="text-[var(--hq6-blue)] hover:underline">
                    {row.route}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-[#666]">{row.component}</td>
                <td className="px-3 py-2 text-[var(--hq6-success)]">✓</td>
                <td className="px-3 py-2 text-[#999]">
                  {(HQ6_CHECKLIST_CORE_AUDITS as readonly string[]).includes(
                    row.audit,
                  )
                    ? "✓"
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hq6-footer">
        Reference: hq6.vonosautomarket.com/ui-audit/*/screenshot.png · Mark Verified after
        side-by-side pass
      </p>
    </div>
  );
}
