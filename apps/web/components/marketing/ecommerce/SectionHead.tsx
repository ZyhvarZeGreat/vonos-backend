import Link from "next/link";

type SectionHeadProps = {
  id?: string;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
};

export default function SectionHead({
  id,
  title,
  viewAllHref,
  viewAllLabel = "VIEW ALL →",
}: SectionHeadProps) {
  return (
    <div className="vg-sec__head">
      <h2 id={id} className="vg-sec__title">
        {title}
      </h2>
      {viewAllHref ? (
        <Link href={viewAllHref} className="vg-sec__all">
          {viewAllLabel}
        </Link>
      ) : null}
    </div>
  );
}
