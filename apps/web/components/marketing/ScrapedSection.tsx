import { CDN_BASE } from "@/lib/cdn";

type ScrapedSectionProps = {
  html: string;
  qa: string;
};

/**
 * Rewrite root-relative asset URLs to the R2 CDN base so generated marketing
 * HTML never serves static assets from the Vercel deployment. Covers
 * `src="…"`, `srcset` entries (`, /…` / ` /…`), `href="…"`, and CSS `url(…)`.
 * Pass-through when NEXT_PUBLIC_CDN_URL is unset (local dev / previews).
 */
function rewriteAssetUrls(html: string): string {
  if (!CDN_BASE) return html;
  return html.replace(
    /(["'(\s,])\/(images|fonts|brand|upos)\//g,
    (_match, prefix: string, dir: string) => `${prefix}${CDN_BASE}/${dir}/`,
  );
}

export default function ScrapedSection({ html, qa }: ScrapedSectionProps) {
  return (
    <div
      className="motocare-section-host"
      data-qa-section={qa}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: rewriteAssetUrls(html) }}
    />
  );
}
