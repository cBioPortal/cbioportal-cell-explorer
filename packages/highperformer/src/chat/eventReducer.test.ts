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

  it("error event finalizes current onto history with the error part attached", () => {
    let s = initialState();
    s = reduce(s, { type: "text_delta", text: "partial " }, noopApply);
    s = reduce(s, { type: "error", message: "boom", retryable: false }, noopApply);
    expect(s.status).toBe("error");
    expect(s.current).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].parts).toEqual([
      { kind: "text", text: "partial " },
      { kind: "error", message: "boom" },
    ]);
  });

  it("error before any text streamed prepends synthetic (interrupted) text so wire content is non-empty", () => {
    // Repros the abort-during-tool-call case: tool fires, user aborts before
    // any text streams. Without a synthetic placeholder the resulting wire
    // assistant message has empty content, which Anthropic-style APIs reject.
    let s = initialState();
    s = reduce(s, { type: "tool_progress", tool: "top_genes", status: "started" }, noopApply);
    s = reduce(s, { type: "error", message: "aborted", retryable: false }, noopApply);
    expect(s.current).toBeNull();
    expect(s.history).toHaveLength(1);
    const parts = s.history[0].parts;
    expect(parts[0]).toEqual({ kind: "text", text: "(interrupted)" });
    expect(parts.some((p) => p.kind === "tool")).toBe(true);
    expect(parts.some((p) => p.kind === "error")).toBe(true);
  });

  it("error with no in-flight turn creates a synthetic assistant entry for alternation", () => {
    // Edge case: server errors during handshake, before any text_delta or
    // tool_progress. The reducer still needs to leave a placeholder so the
    // next user message lands in a well-formed alternation.
    let s = initialState();
    s = reduce(s, { type: "error", message: "no thread", retryable: false }, noopApply);
    expect(s.current).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].role).toBe("assistant");
    expect(s.history[0].parts[0]).toEqual({ kind: "text", text: "(interrupted)" });
    expect(s.history[0].parts.some((p) => p.kind === "error")).toBe(true);
  });

  it("USER_SUBMIT-style append after error produces well-formed user/assistant/user history", () => {
    // The bug we're fixing: turn 1 aborts mid-tool, user types turn 2,
    // wire messages must alternate. After the error, history must end with
    // an assistant entry so the next user message is the only consecutive
    // role.
    let s = initialState();
    // Synthetic turn 1: user → assistant streams a tool → aborts
    s = {
      ...s,
      history: [{ role: "user", parts: [{ kind: "text", text: "what are the top 20?" }] }],
    };
    s = reduce(s, { type: "tool_progress", tool: "top_genes", status: "started" }, noopApply);
    s = reduce(s, { type: "error", message: "aborted", retryable: false }, noopApply);
    // Now simulate the next user submission appending to history.
    expect(s.history.map((m) => m.role)).toEqual(["user", "assistant"]);
    const withNextUser = [
      ...s.history,
      { role: "user" as const, parts: [{ kind: "text" as const, text: "nevermind" }] },
    ];
    expect(withNextUser.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
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

  it("mid-stream error between text_delta events keeps partial text visible in history", () => {
    let s = initialState();
    s = reduce(s, { type: "text_delta", text: "before " }, noopApply);
    s = reduce(s, { type: "error", message: "x", retryable: false }, noopApply);
    expect(s.current).toBeNull();
    expect(s.history[0].parts.find((p) => p.kind === "text")).toEqual({
      kind: "text",
      text: "before ",
    });
  });

  it("unknown event type finalizes a synthetic error entry to history", () => {
    const s = reduce(
      initialState(),
      { type: "garbage" } as unknown as ChatEvent,
      noopApply,
    );
    expect(s.status).toBe("error");
    expect(s.current).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].parts.some((p) => p.kind === "error")).toBe(true);
  });
});
