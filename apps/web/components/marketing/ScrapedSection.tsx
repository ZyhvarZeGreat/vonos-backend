type ScrapedSectionProps = {
  html: string;
  qa: string;
};

export default function ScrapedSection({ html, qa }: ScrapedSectionProps) {
  return (
    <div
      className="motocare-section-host"
      data-qa-section={qa}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
