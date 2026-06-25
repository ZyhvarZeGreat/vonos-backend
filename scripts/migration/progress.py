"""Terminal progress reporting for long-running migration steps."""

from __future__ import annotations

import sys
import time


class ProgressReporter:
    """Lightweight stderr progress (no extra dependencies)."""

    def __init__(self, *, enabled: bool = True) -> None:
        self.enabled = enabled
        self._label = ""
        self._current = 0
        self._total = 0
        self._last_print = 0.0

    def message(self, text: str) -> None:
        if self.enabled:
            print(text, file=sys.stderr, flush=True)

    def start(self, label: str, total: int) -> None:
        self._label = label
        self._total = max(0, total)
        self._current = 0
        self._render(force=True)

    def advance(self, n: int = 1) -> None:
        self._current += n
        self._render()

    def set_fraction(self, current: int, total: int, *, label: str | None = None) -> None:
        if label:
            self._label = label
        self._total = max(0, total)
        self._current = current
        self._render()

    def entity_header(self, index: int, total: int, code: str, name: str) -> None:
        if not self.enabled:
            return
        print(file=sys.stderr, flush=True)
        print(f"{'═' * 60}", file=sys.stderr, flush=True)
        print(f"  Entity {index}/{total}: {code} — {name}", file=sys.stderr, flush=True)
        print(f"{'═' * 60}", file=sys.stderr, flush=True)

    def phase(self, step: int, total: int, label: str) -> None:
        if self.enabled:
            print(f"\n  [{step}/{total}] {label}", file=sys.stderr, flush=True)

    def overall(self, completed: int, total: int) -> None:
        if not self.enabled or total <= 0:
            return
        pct = min(100, int(100 * completed / total))
        bar_w = 30
        filled = int(bar_w * completed / total)
        bar = "#" * filled + "-" * (bar_w - filled)
        print(
            f"\n  Overall [{bar}] {completed}/{total} entities ({pct}%)",
            file=sys.stderr,
            flush=True,
        )

    def entity_complete(self, code: str, elapsed_sec: float, *, counts: dict[str, int] | None = None) -> None:
        if not self.enabled:
            return
        mins, secs = divmod(int(elapsed_sec), 60)
        duration = f"{mins}m {secs}s" if mins else f"{secs}s"
        summary = ""
        if counts:
            parts = [f"{k}={v:,}" for k, v in counts.items() if v]
            if parts:
                summary = f" — {', '.join(parts[:6])}"
                if len(parts) > 6:
                    summary += ", …"
        print(f"\n  ✓ {code} complete ({duration}){summary}", file=sys.stderr, flush=True)

    def done(self, detail: str = "") -> None:
        if not self.enabled:
            return
        suffix = f" — {detail}" if detail else ""
        if self._total > 0:
            print(
                f"\n  ✓ {self._label}: {self._current:,}/{self._total:,}{suffix}",
                file=sys.stderr,
                flush=True,
            )
        else:
            print(f"\n  ✓ {self._label}{suffix}", file=sys.stderr, flush=True)

    def _render(self, *, force: bool = False) -> None:
        if not self.enabled:
            return
        now = time.monotonic()
        if not force and now - self._last_print < 0.2 and self._current < self._total:
            return
        self._last_print = now
        if self._total > 0:
            pct = min(100, int(100 * self._current / self._total))
            bar_w = 24
            filled = int(bar_w * self._current / self._total) if self._total else 0
            bar = "#" * filled + "-" * (bar_w - filled)
            print(
                f"\r  {self._label} [{bar}] {self._current:,}/{self._total:,} ({pct}%)",
                file=sys.stderr,
                end="",
                flush=True,
            )
        else:
            print(f"\r  {self._label}: {self._current:,} rows", file=sys.stderr, end="", flush=True)
