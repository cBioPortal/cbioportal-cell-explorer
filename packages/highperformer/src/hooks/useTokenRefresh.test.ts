import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTokenRefresh } from "./useTokenRefresh";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  // Force-unmount any mounted hooks so their visibilitychange listeners
  // don't leak into the next test (the project's vitest setup does not
  // auto-cleanup between tests).
  cleanup();
  vi.useRealTimers();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("useTokenRefresh", () => {
  it("does not fire when disabled", async () => {
    renderHook(() => useTokenRefresh(false));
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls /api/auth/refresh every 4 minutes while enabled", async () => {
    renderHook(() => useTokenRefresh(true));
    // No call at t=0 — interval-based, first call is at t=4m
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(240_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    await vi.advanceTimersByTimeAsync(240_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(240_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops firing after the hook unmounts", async () => {
    const { unmount } = renderHook(() => useTokenRefresh(true));
    await vi.advanceTimersByTimeAsync(240_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
    await vi.advanceTimersByTimeAsync(240_000 * 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("swallows fetch errors so the timer keeps ticking", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    renderHook(() => useTokenRefresh(true));
    await vi.advanceTimersByTimeAsync(240_000);
    // First call rejected; subsequent call should still happen.
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await vi.advanceTimersByTimeAsync(240_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fires immediately on visibilitychange to 'visible'", async () => {
    renderHook(() => useTokenRefresh(true));
    expect(fetchMock).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not fire on visibilitychange when becoming hidden", async () => {
    renderHook(() => useTokenRefresh(true));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
