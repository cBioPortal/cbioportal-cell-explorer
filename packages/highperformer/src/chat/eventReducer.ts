import type {
  ChatEvent,
  ChatMessage,
  MessagePart,
  TextPart,
  ToolPart,
  ErrorPart,
  TraceEntry,
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
  },
): MessagePart[] {
  const idx = parts.findIndex(
    (p) => p.kind === "tool" && (p as ToolPart).tool === ev.tool,
  );
  // Preserve args from the 'started' event when 'ok' / 'error' arrives
  // without args. Preserve duration_ms from end event when later updates come.
  const prev = idx === -1 ? undefined : (parts[idx] as ToolPart);
  const updated: ToolPart = {
    kind: "tool",
    tool: ev.tool,
    status: ev.status,
    summary: ev.summary ?? prev?.summary,
    args: ev.args ?? prev?.args,
    duration_ms: ev.duration_ms ?? prev?.duration_ms,
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
      });
      const traceEntry: TraceEntry =
        ev.status === "started"
          ? { kind: "tool_start", tool: ev.tool, args: ev.args }
          : {
              kind: "tool_end",
              tool: ev.tool,
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
      const cur = ensureCurrent(state);
      return {
        ...state,
        current: appendTrace(
          { ...cur, parts: appendErrorPart(cur.parts, ev.message) },
          { kind: "error", message: ev.message },
        ),
        status: "error",
      };
    }
    case "done": {
      const cur = state.current
        ? { ...state.current, endedAt: Date.now(), usage: ev.usage }
        : null;
      return {
        history: cur ? [...state.history, cur] : state.history,
        current: null,
        status: "idle",
      };
    }
    default: {
      // Unknown event type — defensive; surface as error part.
      const cur = ensureCurrent(state);
      const message = `unknown event type: ${(ev as { type?: string }).type ?? "<missing>"}`;
      return {
        ...state,
        current: { ...cur, parts: appendErrorPart(cur.parts, message) },
        status: "error",
      };
    }
  }
}
