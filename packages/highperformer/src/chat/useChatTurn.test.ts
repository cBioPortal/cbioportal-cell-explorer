import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError, type ChatEvent } from "./types";
import { useChatTurn } from "./useChatTurn";

function streamFromLines(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const l of lines) c.enqueue(enc.encode(l + "\n"));
      c.close();
    },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("useChatTurn", () => {
  it("yields events in order and toggles streaming", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        streamFromLines([
          JSON.stringify({ type: "text_delta", text: "hi" }),
          JSON.stringify({ type: "done", usage: { input_tokens: 1, output_tokens: 1 } }),
        ]),
        { status: 200, headers: { "content-type": "application/x-ndjson" } },
      ),
    );

    const { result } = renderHook(() => useChatTurn());
    expect(result.current.streaming).toBe(false);

    const events: ChatEvent[] = [];
    await act(async () => {
      await result.current.start("spectrum", [{ role: "user", content: "hi" }], null, (e) =>
        events.push(e),
      );
    });

    expect(events.map((e) => e.type)).toEqual(["text_delta", "done"]);
    expect(result.current.streaming).toBe(false);
  });

  it("throws HttpError on non-2xx and resets streaming", async () => {
    fetchMock.mockResolvedValue(
      new Response("not found", { status: 404 }),
    );

    const { result } = renderHook(() => useChatTurn());
    let caught: unknown;
    await act(async () => {
      try {
        await result.current.start("nope", [{ role: "user", content: "hi" }], null, () => {});
      } catch (e) {
        caught = e;
      }
    });
    expect(caught).toBeInstanceOf(HttpError);
    expect((caught as HttpError).status).toBe(404);
    expect(result.current.streaming).toBe(false);
  });

  it("stop() emits a friendly 'Cancelled' error event and does not throw", async () => {
    let abortSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      abortSignal = init.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        abortSignal!.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    });

    const { result } = renderHook(() => useChatTurn());
    const events: ChatEvent[] = [];
    let caught: unknown;
    const startPromise = act(async () => {
      try {
        await result.current.start("s", [{ role: "user", content: "hi" }], null, (e) =>
          events.push(e),
        );
      } catch (e) {
        caught = e;
      }
    });
    // Stop immediately.
    act(() => result.current.stop());
    await startPromise;
    expect(caught).toBeUndefined();
    expect(events).toEqual([{ type: "error", message: "Cancelled", retryable: false }]);
    expect(result.current.streaming).toBe(false);
  });

  it("resets streaming on network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    const { result } = renderHook(() => useChatTurn());
    let caught: unknown;
    await act(async () => {
      try {
        await result.current.start("s", [{ role: "user", content: "hi" }], null, () => {});
      } catch (e) {
        caught = e;
      }
    });
    expect((caught as Error).message).toMatch(/network down/);
    expect(result.current.streaming).toBe(false);
  });
});
