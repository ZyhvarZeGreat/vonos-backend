import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCursorPage } from "./useCursorPage";

describe("useCursorPage sliding navigation", () => {
  it("Next builds a cursor stack; Prev/goToPage reuse it without glitching", () => {
    const { result } = renderHook(() => useCursorPage());

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.maxReachablePageIndex).toBe(0);

    act(() => {
      result.current.goNext("c1");
    });
    expect(result.current.pageIndex).toBe(1);
    expect(result.current.cursor).toBe("c1");
    expect(result.current.maxReachablePageIndex).toBe(1);

    act(() => {
      result.current.goNext("c2");
    });
    expect(result.current.pageIndex).toBe(2);
    expect(result.current.cursor).toBe("c2");

    act(() => {
      result.current.goPrev();
    });
    expect(result.current.pageIndex).toBe(1);
    expect(result.current.cursor).toBe("c1");
    // Stack is preserved — jumping forward again is instant.
    expect(result.current.maxReachablePageIndex).toBe(2);

    act(() => {
      result.current.goToPage(2);
    });
    expect(result.current.pageIndex).toBe(2);
    expect(result.current.cursor).toBe("c2");

    act(() => {
      result.current.goToPage(0);
    });
    expect(result.current.pageIndex).toBe(0);
    expect(result.current.cursor).toBeUndefined();
  });

  it("extendCursorsTo walks forward then lands on the target page", async () => {
    const { result } = renderHook(() => useCursorPage());
    const fetched: Array<string | undefined> = [];

    await act(async () => {
      const landing = await result.current.extendCursorsTo(
        3,
        async (cursor, pageIndex) => {
          fetched.push(cursor);
          if (pageIndex >= 3) return null;
          return `c${pageIndex + 1}`;
        },
      );
      expect(landing).toBe(3);
    });

    expect(fetched).toEqual([undefined, "c1", "c2"]);
    expect(result.current.pageIndex).toBe(3);
    expect(result.current.cursor).toBe("c3");
    expect(result.current.maxReachablePageIndex).toBe(3);
  });

  it("extendCursorsTo stops cleanly when the catalog ends mid-jump", async () => {
    const { result } = renderHook(() => useCursorPage());

    await act(async () => {
      const landing = await result.current.extendCursorsTo(
        10,
        async (cursor, pageIndex) => {
          if (pageIndex >= 2) return null;
          return `c${pageIndex + 1}`;
        },
      );
      expect(landing).toBe(2);
    });

    expect(result.current.pageIndex).toBe(2);
    expect(result.current.maxReachablePageIndex).toBe(2);
  });

  it("reset clears the stack back to page 1", () => {
    const { result } = renderHook(() => useCursorPage());
    act(() => {
      result.current.goNext("c1");
      result.current.goNext("c2");
      result.current.reset();
    });
    expect(result.current.pageIndex).toBe(0);
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.maxReachablePageIndex).toBe(0);
  });
});
