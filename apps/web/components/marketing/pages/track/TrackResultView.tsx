"use client";

import type { ReactNode } from "react";
import type { PublicTrackResult } from "@/lib/marketing/track-api";

const CHIP: Record<"complete" | "current" | "upcoming", string> = {
  complete: "Done",
  current: "Now",
  upcoming: "Up next",
};

type Props = {
  result: PublicTrackResult;
  headerAction?: ReactNode;
  notice?: ReactNode;
};

export default function TrackResultView({
  result,
  headerAction,
  notice,
}: Props) {
  const completed = result.phase === "completed";
  const currentIndex = result.steps.findIndex((s) => s.status === "current");
  const stepNumber = completed
    ? result.steps.length
    : currentIndex >= 0
      ? currentIndex + 1
      : Math.max(
          1,
          result.steps.filter((s) => s.status === "complete").length + 1,
        );
  const totalSteps = result.steps.length;
  const progressPct =
    totalSteps <= 1
      ? completed
        ? 100
        : 0
      : Math.round(
          ((stepNumber - (completed ? 0 : 1)) / (totalSteps - 1)) * 100,
        );
  const clampedProgress = Math.min(
    100,
    Math.max(0, completed ? 100 : progressPct),
  );
  const currentStep =
    result.steps.find((s) => s.status === "current") ??
    (completed ? result.steps[result.steps.length - 1] : null);

  return (
    <article className="track-result">
      <header className="track-result-header">
        <div className="track-result-identity">
          <div className="track-phase-row">
            <span
              className={`track-phase-badge${completed ? " track-phase-badge--done" : ""}`}
            >
              {completed ? "Ready for collection" : "In progress"}
            </span>
          </div>
          <h2 className="track-plate">{result.registration}</h2>
          <p className="track-result-meta no-margin-bottom">
            {[result.name, result.vehicle !== "Vehicle" ? result.vehicle : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {headerAction ? (
          <div className="track-result-header-action">{headerAction}</div>
        ) : null}
      </header>

      {notice ? <div className="track-result-notice">{notice}</div> : null}

      <div className="track-status-strip">
        <div className="track-status-strip-item">
          <span className="track-summary-label">Status</span>
          <span className="track-status-strip-value">{result.statusLabel}</span>
        </div>
        {result.eta ? (
          <div className="track-status-strip-item">
            <span className="track-summary-label">Expected</span>
            <span className="track-status-strip-value">{result.eta}</span>
          </div>
        ) : null}
        {result.reference ? (
          <div className="track-status-strip-item">
            <span className="track-summary-label">Reference</span>
            <span className="track-status-strip-value">{result.reference}</span>
          </div>
        ) : null}
      </div>

      {completed ? (
        <p className="track-completed-note" role="status">
          Your vehicle is marked complete. Bring ID when you collect. This page
          does not show payment details — the team will confirm any balance
          separately.
        </p>
      ) : null}

      <div className="track-progress-block">
        <div className="track-progress-meta">
          <span className="track-progress-label">Repair timeline</span>
          <span className="track-progress-count">
            {stepNumber} / {totalSteps}
          </span>
        </div>
        <div
          className="track-progress-bar"
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Repair progress step ${stepNumber} of ${totalSteps}`}
        >
          <div
            className="track-progress-bar-fill"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        {currentStep ? (
          <div
            className={`track-current-callout${completed ? " track-current-callout--done" : ""}`}
          >
            <div className="track-current-callout-label">
              {completed ? "Latest update" : "Happening now"}
            </div>
            <div className="track-current-callout-title">{currentStep.label}</div>
            <p className="track-current-callout-detail no-margin-bottom">
              {currentStep.detail}
            </p>
            {currentStep.timestamp ? (
              <div className="track-current-callout-time">
                Updated {currentStep.timestamp}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ol className="track-timeline">
        {result.steps.map((step, index) => {
          const isLast = index === result.steps.length - 1;
          const detail =
            step.status === "upcoming"
              ? "Waiting — this stage unlocks when the team moves your repair forward."
              : step.detail;
          return (
            <li
              key={step.id}
              className={[
                "track-timeline-item",
                `track-timeline-item--${step.status}`,
                isLast ? "track-timeline-item--last" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-status={step.status}
            >
              <div className="track-timeline-marker" aria-hidden />
              <div className="track-timeline-body">
                <div className="track-timeline-top">
                  <div className="track-timeline-heading">
                    <span
                      className={`track-timeline-chip track-timeline-chip--${step.status}`}
                    >
                      {CHIP[step.status]}
                    </span>
                    <h3 className="track-timeline-title">{step.label}</h3>
                  </div>
                  {step.timestamp ? (
                    <time className="track-timeline-time">{step.timestamp}</time>
                  ) : step.status === "upcoming" ? (
                    <span className="track-timeline-time">Pending</span>
                  ) : null}
                </div>
                <p className="track-timeline-detail no-margin-bottom">{detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="track-result-footer">
        <p className="track-footer-note no-margin-bottom">
          Status only — no parts list, costs, or workshop branch shown here.
        </p>
      </footer>
    </article>
  );
}
