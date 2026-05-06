import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "./types";
import { useChatContext } from "./useChatContext";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("useChatContext", () => {
  it("returns ContextResponse after fetch resolves", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          slug: "s",
          name: "S",
          description: "d",
          n_obs: 1,
          n_var: 1,
          obs_columns: [],
          embedding_keys: [],
          available_tools: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useChatContext("s"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.slug).toBe("s");
    expect(result.current.error).toBeUndefined();
  });

  it("returns error on non-2xx, data is undefined", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));
    const { result } = renderHook(() => useChatContext("s"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(HttpError);
    expect((result.current.error as HttpError).status).toBe(404);
  });

  it("aborts the previous request when slug changes mid-flight", async () => {
    const seenSignals: AbortSignal[] = [];
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      seenSignals.push(init.signal as AbortSignal);
      return new Promise(() => {}); // never resolves; we only care about abort
    });

    const { rerender } = renderHook(({ slug }) => useChatContext(slug), {
      initialProps: { slug: "a" },
    });
    rerender({ slug: "b" });

    await waitFor(() => expect(seenSignals[0].aborted).toBe(true));
    expect(seenSignals[1].aborted).toBe(false);
  });
});
