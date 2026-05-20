import type {
  ChatEvent,
  ChatMessage,
  MessagePart,
  TextPart,
  ToolPart,
  ErrorPart,
  TraceEntry,
  ChartHint,
} from "./types";

export type State = {
  history: ChatMessage[];
  current: ChatMessage | null;
  status: "idle" | "streaming" | "error";
};

export function initialState(): State {
  return { history: [], current: null, status: "idle" };
}

function ensureCurrent(state: State): ChatMessage {
  if (state.current) return state.current;
  return {
    role: "assistant",
    parts: [],
    trace: [],
    startedAt: Date.now(),
  };
}

function appendTrace(msg: ChatMessage, entry: TraceEntry): ChatMessage {
  return { ...msg, trace: [...(msg.trace ?? []), entry] };
}

function mergeTextDelta(parts: MessagePart[], text: string): MessagePart[] {
  const last = parts.at(-1);
  if (last && last.kind === "text") {
    const merged: TextPart = { kind: "text", text: last.text + text };
    return [...parts.slice(0, -1), merged];
  }
  return [...parts, { kind: "text", text }];
}

function upsertToolPart(
  parts: MessagePart[],
  ev: {
    tool: string;
    status: ToolPart["status"];
    summary?: string;
    args?: Record<string, unknown> | null;
    duration_ms?: number | null;
    chart?: ChartHint | null;
  },
): MessagePart[] {
  const idx = parts.findIndex(
    (p) => p.kind === "tool" && (p as ToolPart).tool === ev.tool,
  );
  // Preserve args from the 'started' event when 'ok' / 'error' arrives
  // without args. Preserve duration_ms from end event when later updates come.
  // Preserve chart from any earlier event that provided it.
  const prev = idx === -1 ? undefined : (parts[idx] as ToolPart);
  const updated: ToolPart = {
    kind: "tool",
    tool: ev.tool,
    status: ev.status,
    summary: ev.summary ?? prev?.summary,
    args: ev.args ?? prev?.args,
    duration_ms: ev.duration_ms ?? prev?.duration_ms,
    chart: ev.chart ?? prev?.chart,
  };
  if (idx === -1) return [...parts, updated];
  const next = parts.slice();
  next[idx] = updated;
  return next;
}

function appendErrorPart(parts: MessagePart[], message: string): MessagePart[] {
  const err: ErrorPart = { kind: "error", message };
  return [...parts, err];
}

function ensureNonEmptyText(parts: MessagePart[]): MessagePart[] {
  // Ensure the resulting wire content (text parts joined) is non-empty.
  // Anthropic-style APIs reject assistant messages with empty content, which
  // happens when a turn aborts before any text streamed (e.g. mid-tool-call).
  const hasText = parts.some((p) => p.kind === "text" && p.text.length > 0);
  if (hasText) return parts;
  const placeholder: TextPart = { kind: "text", text: "(interrupted)" };
  return [placeholder, ...parts];
}

function finalizeStartedTools(parts: MessagePart[]): MessagePart[] {
  // A turn that errors/cancels mid-tool-call leaves any in-flight ToolPart
  // stuck in `status: "started"` — the pill renders forever as a spinner.
  // Move them to a terminal "error" state so the bubble settles.
  return parts.map((p) =>
    p.kind === "tool" && p.status === "started"
      ? ({ ...p, status: "error" as const } satisfies ToolPart)
      : p,
  );
}

export function reduce(
  state: State,
  ev: ChatEvent,
  applyConfig: (cfg: Record<string, unknown>) => void,
): State {
  switch (ev.type) {
    case "text_delta": {
      const cur = ensureCurrent(state);
      return {
        ...state,
        current: { ...cur, parts: mergeTextDelta(cur.parts, ev.text) },
        status: "streaming",
      };
    }
    case "tool_progress": {
      const cur = ensureCurrent(state);
      const partsUpdated = upsertToolPart(cur.parts, {
        tool: ev.tool,
        status: ev.status,
        summary: ev.summary,
        args: ev.args,
        duration_ms: ev.duration_ms,
        chart: ev.chart,
      });
      const traceEntry: TraceEntry =
        ev.status === "started"
          ? {
              kind: "tool_start",
              tool: ev.tool,
              tool_call_id: ev.tool_call_id,
              args: ev.args,
            }
          : {
              kind: "tool_end",
              tool: ev.tool,
              tool_call_id: ev.tool_call_id,
              status: ev.status,
              summary: ev.summary,
              duration_ms: ev.duration_ms,
            };
      return {
        ...state,
        current: appendTrace({ ...cur, parts: partsUpdated }, traceEntry),
        status: "streaming",
      };
    }
    case "ui_action": {
      applyConfig(ev.payload);
      const cur = ensureCurrent(state);
      return {
        ...state,
        current: appendTrace(cur, { kind: "ui_action", payload: ev.payload }),
      };
    }
    case "error": {
      // Finalize the in-flight (or synthesize a placeholder) assistant
      // message onto history with the error attached. Keeping the assistant
      // turn in history is required so the conversation alternation
      // (user/assistant/user/...) survives — otherwise the next user submit
      // produces back-to-back user messages and the server rejects with a
      // role-alternation 422.
      const base = ensureCurrent(state);
      const partsWithFinalizedTools = finalizeStartedTools(base.parts);
      const partsWithText = ensureNonEmptyText(partsWithFinalizedTools);
      const partsWithError = appendErrorPart(partsWithText, ev.message);
      const finalized = appendTrace(
        { ...base, parts: partsWithError, endedAt: Date.now() },
        { kind: "error", message: ev.message },
      );
      return {
        history: [...state.history, finalized],
        current: null,
        status: "error",
      };
    }
    case "done": {
      const cur = state.current
        ? {
            ...state.current,
            endedAt: Date.now(),
            usage: ev.usage,
            id: ev.message_id ?? state.current.id,
          }
        : null;
      return {
        history: cur ? [...state.history, cur] : state.history,
        current: null,
        status: "idle",
      };
    }
    default: {
      // Unknown event type — defensive; surface as an error by reusing the
      // error case's finalize-to-history path so alternation is preserved.
      const message = `unknown event type: ${(ev as { type?: string }).type ?? "<missing>"}`;
      return reduce(state, { type: "error", message, retryable: false }, applyConfig);
    }
  }
}
