"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export interface PosFilterGroup {
  name: string;
  children: string[];
}

export function PosFilterDrawer({
  open,
  title,
  groups,
  selected,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  groups: PosFilterGroup[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pick = (name: string | null) => {
    onSelect(name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label={title}>
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <aside className="absolute top-0 right-0 flex h-full w-full max-w-md flex-col bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="cafe-pos-icon-btn p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-5">
          <button
            type="button"
            onClick={() => pick(null)}
            className={`cafe-pos-tile text-sm font-medium ${
              selected === null ? "cafe-pos-tile--active text-foreground" : "text-foreground"
            }`}
          >
            All
          </button>
          {groups.map((group) => (
            <div
              key={group.name}
              className="rounded-lg border border-border bg-card p-4 text-center"
            >
              <p className="text-sm font-semibold text-foreground">{group.name}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => pick(group.name)}
                  className={`cafe-pos-chip ${selected === group.name ? "cafe-pos-chip--active" : ""}`}
                >
                  All
                </button>
                {group.children.map((child) => (
                  <button
                    key={child}
                    type="button"
                    onClick={() => pick(child)}
                    className={`cafe-pos-chip ${selected === child ? "cafe-pos-chip--active" : ""}`}
                  >
                    {child}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
