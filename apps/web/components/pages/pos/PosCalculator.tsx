"use client";

import { useEffect, useRef, useState } from "react";

/** Simple till calculator popover (audit: `btnCalculator`). */
export function PosCalculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function press(label: string) {
    if (label === "C") return setDisplay("0");
    if (label === "⌫") return setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
    if (label === "=") {
      try {
        // Digits/operators only — no eval.
        const safe = display.replace(/[^0-9+\-*/.() ]/g, "");
        const result = Function(`"use strict";return (${safe})`)();
        return setDisplay(String(Number.isFinite(result) ? result : 0));
      } catch {
        return setDisplay("0");
      }
    }
    setDisplay((d) => (d === "0" && /[0-9.]/.test(label) ? label : d + label));
  }

  const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+", "C", "⌫"];

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border border-border bg-card p-3 shadow-lg" ref={boxRef}>
      <div className="mb-2 truncate rounded-md bg-[var(--color-surface-muted)] px-3 py-2 text-right text-lg font-semibold tabular-nums text-foreground">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className={k === "=" ? "cafe-pos-btn cafe-pos-btn--primary" : "cafe-pos-icon-btn h-9"}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
