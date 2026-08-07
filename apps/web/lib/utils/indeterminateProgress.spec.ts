import { describe, expect, it } from "vitest";
import {
  INDETERMINATE_PROGRESS_CEILING,
  nextIndeterminatePercent,
} from "./indeterminateProgress";

describe("nextIndeterminatePercent", () => {
  it("races toward the ceiling within a few ticks", () => {
    let p = 0;
    for (let i = 0; i < 8; i += 1) p = nextIndeterminatePercent(p);
    expect(p).toBeGreaterThan(50);
    for (let i = 0; i < 40; i += 1) p = nextIndeterminatePercent(p);
    expect(p).toBeGreaterThanOrEqual(INDETERMINATE_PROGRESS_CEILING - 0.5);
    expect(p).toBeLessThanOrEqual(INDETERMINATE_PROGRESS_CEILING);
  });

  it("never exceeds the ceiling", () => {
    let p = 0;
    for (let i = 0; i < 100; i += 1) p = nextIndeterminatePercent(p);
    expect(p).toBe(INDETERMINATE_PROGRESS_CEILING);
  });
});
