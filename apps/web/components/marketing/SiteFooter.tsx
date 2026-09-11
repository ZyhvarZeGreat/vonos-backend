import MarketingFooter from "@/components/marketing/MarketingFooter";

type SiteFooterProps = {
  showCta?: boolean;
};

export default function SiteFooter({ showCta }: SiteFooterProps = {}) {
  return <MarketingFooter id="contact" showCta={showCta} />;
}
