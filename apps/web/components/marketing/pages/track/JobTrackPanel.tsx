"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { lookupJobTrack } from "@/lib/marketing/track-api";
import TrackResultView from "@/components/marketing/pages/track/TrackResultView";

export default function JobTrackPanel({ token }: { token: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-job-track", token],
    queryFn: () => lookupJobTrack(token),
    enabled: Boolean(token),
    retry: false,
  });

  return (
    <section className="hero-section track-section" data-qa-section="job-track-hero">
      <div className="container">
        <div className="track-shell">
          <div className="breadcrumb-item" style={{ marginBottom: "1rem" }}>
            <Link href="/" className="breadcrumb-link text-black">
              Home
            </Link>
            <div className="breadcrumb-text text-black">/</div>
            <div className="breadcrumb-text text-gray-3">Track my vehicle</div>
          </div>

          {isLoading ? (
            <p className="track-form-error" style={{ color: "inherit" }}>
              Loading status…
            </p>
          ) : isError || !data ? (
            <div className="track-result">
              <p className="track-form-error">
                {error instanceof Error
                  ? error.message
                  : "This track link is invalid or the job was not found."}
              </p>
              <p className="no-margin-bottom" style={{ marginTop: "0.75rem" }}>
                <Link href="/track" className="track-reset-link">
                  Look up by name and plate
                </Link>
              </p>
            </div>
          ) : (
            <TrackResultView result={data} />
          )}
        </div>
      </div>
    </section>
  );
}
