import { describe, expect, it, vi } from "vitest";
import { initialState, reduce } from "./eventReducer";
import type { ChatEvent } from "./types";

const noopApply = vi.fn();

describe("eventReducer.reduce", () => {
  it("merges consecutive text_delta events into one TextPart", () => {
    let s = initialState();
    s = reduce(s, { type: "text_delta", text: "Hello " }, noopApply);
    s = reduce(s, { type: "text_delta", text: "world" }, noopApply);
    expect(s.current).not.toBeNull();
    expect(s.current!.parts).toEqual([{ kind: "text", text: "Hello world" }]);
    expect(s.status).toBe("streaming");
  });

  it("tool_progress started -> ok updates the same ToolPart by tool name", () => {
    let s = initialState();
    s = reduce(s, { type: "tool_progress", tool: "top_genes", status: "started" }, noopApply);
    s = reduce(s, { type: "tool_progress", tool: "top_genes", status: "ok", summary: "32k scanned" }, noopApply);
    const tools = s.current!.parts.filter((p) => p.kind === "tool");
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({ tool: "top_genes", status: "ok", summary: "32k scanned" });
  });

  it("tool_progress for two different tools yields two pills", () => {
    let s = initialState();
    s = reduce(s, { type: "tool_progress", tool: "a", status: "started" }, noopApply);
    s = reduce(s, { type: "tool_progress", tool: "b", status: "started" }, noopApply);
    const tools = s.current!.parts.filter((p) => p.kind === "tool");
    expect(tools.map((t) => (t as { tool: string }).tool)).toEqual(["a", "b"]);
  });

  it("ui_action calls applyConfig once with the payload and records a trace entry", () => {
    const apply = vi.fn();
    const before = initialState();
    const payload = { colorBy: "category", category: "T cells" };
    const after = reduce(before, { type: "ui_action", payload }, apply);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(payload);
    // Trace entry recorded for the Why panel; history/parts otherwise unchanged.
    expect(after.history).toEqual(before.history);
    expect(after.current?.parts ?? []).toEqual([]);
    expect(after.current?.trace).toEqual([{ kind: "ui_action", payload }]);
  });

  it("ui_action: applyConfig callback may return a Promise (async-safe contract)", () => {
    // The reducer forwards the payload to whatever callback is passed in.
    // Callers (e.g. ChatPanel) are responsible for wiring ApplyResult error handling.
    // This test verifies the reducer doesn't throw when the callback returns a Promise.
    const asyncApply = vi.fn().mockResolvedValue({ ok: false, reason: { kind: "internal", message: "test" } });
    const before = initialState();
    // Should not throw even though the callback is async
    expect(() =>
      reduce(before, { type: "ui_action", payload: { colorBy: "gene" } }, asyncApply)
    ).not.toThrow();
    expect(asyncApply).toHaveBeenCalledTimes(1);
  });

  it("error event appends ErrorPart and sets status to error, keeps preceding text", () => {
    let s = initialState();
    s = reduce(s, { type: "text_delta", text: "partial " }, noopApply);
    s = reduce(s, { type: "error", message: "boom", retryable: false }, noopApply);
    expect(s.status).toBe("error");
    expect(s.current!.parts).toEqual([
      { kind: "text", text: "partial " },
      { kind: "error", message: "boom" },
    ]);
  });

  it("done finalizes current onto history and clears current", () => {
    let s = initialState();
    s = reduce(s, { type: "text_delta", text: "hi" }, noopApply);
    s = reduce(s, { type: "done", usage: { input_tokens: 1, output_tokens: 2 } }, noopApply);
    expect(s.current).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].parts).toEqual([{ kind: "text", text: "hi" }]);
    expect(s.status).toBe("idle");
  });

  it("done event carries message_id onto the finalized assistant message", () => {
    let s = initialState();
    s = reduce(s, { type: "text_delta", text: "hi" }, noopApply);
    s = reduce(
      s,
      {
        type: "done",
        usage: { input_tokens: 1, output_tokens: 2 },
        message_id: "msg-server-abc",
      },
      noopApply,
    );
    expect(s.history[0].id).toBe("msg-server-abc");
  });

  it("mid-stream error between text_delta events keeps partial text visible", () => {
    let s = initialState();
    s = reduce(s, { type: "text_delta", text: "before " }, noopApply);
    s = reduce(s, { type: "error", message: "x", retryable: false }, noopApply);
    expect(s.current!.parts.find((p) => p.kind === "text")).toEqual({
      kind: "text",
      text: "before ",
    });
  });

  it("unknown event type appends a synthetic error part instead of throwing", () => {
    const s = reduce(
      initialState(),
      { type: "garbage" } as unknown as ChatEvent,
      noopApply,
    );
    expect(s.status).toBe("error");
    expect(s.current!.parts.some((p) => p.kind === "error")).toBe(true);
  });
});
