import type {
  ChatEvent,
  ChatMessage,
  MessagePart,
  TextPart,
  ToolPart,
  ErrorPart,
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
  return state.current ?? { role: "assistant", parts: [] };
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
  ev: { tool: string; status: ToolPart["status"]; summary?: string },
): MessagePart[] {
  const idx = parts.findIndex(
    (p) => p.kind === "tool" && (p as ToolPart).tool === ev.tool,
  );
  const updated: ToolPart = {
    kind: "tool",
    tool: ev.tool,
    status: ev.status,
    summary: ev.summary,
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
      return {
        ...state,
        current: {
          ...cur,
          parts: upsertToolPart(cur.parts, {
            tool: ev.tool,
            status: ev.status,
            summary: ev.summary,
          }),
        },
        status: "streaming",
      };
    }
    case "ui_action": {
      applyConfig(ev.payload);
      return state;
    }
    case "error": {
      const cur = ensureCurrent(state);
      return {
        ...state,
        current: { ...cur, parts: appendErrorPart(cur.parts, ev.message) },
        status: "error",
      };
    }
    case "done": {
      const cur = state.current;
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
