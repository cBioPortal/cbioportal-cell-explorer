import { describe, expect, it } from "vitest";
import { parseNdjson } from "./ndjsonParser";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of iter) out.push(v);
  return out;
}

describe("parseNdjson", () => {
  it("splits on newlines and parses each line as JSON", async () => {
    const stream = streamFromChunks([
      '{"a":1}\n{"b":2}\n{"c":3}\n',
    ]);
    const events = await collect<unknown>(parseNdjson(stream));
    expect(events).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("emits events incrementally across chunk boundaries", async () => {
    const stream = streamFromChunks([
      '{"a":1}\n{"b":',
      '2}\n',
    ]);
    const events = await collect<unknown>(parseNdjson(stream));
    expect(events).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("handles empty trailing newline", async () => {
    const stream = streamFromChunks(['{"a":1}\n']);
    const events = await collect<unknown>(parseNdjson(stream));
    expect(events).toEqual([{ a: 1 }]);
  });

  it("handles a non-empty final line without trailing newline", async () => {
    const stream = streamFromChunks(['{"a":1}\n{"b":2}']);
    const events = await collect<unknown>(parseNdjson(stream));
    expect(events).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("propagates AbortError from the underlying stream", async () => {
    const stream = new ReadableStream({
      pull(controller) {
        controller.error(new DOMException("aborted", "AbortError"));
      },
    });
    await expect(collect(parseNdjson(stream))).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
