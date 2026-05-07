import { Alert, Button, Input, Spin, Tag } from "antd";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { initialState, reduce, type State } from "./eventReducer";
import { deriveSuggestionChips } from "./suggestionChips";
import type { ChatEvent, ChatMessage, MessagePart, WireMessage } from "./types";
import { useChatContext } from "./useChatContext";
import { useChatTurn } from "./useChatTurn";

type Action = { type: "AGENT_EVENT"; event: ChatEvent } | { type: "USER_SUBMIT"; content: string };

function makeReducer(applyConfig: (cfg: Record<string, unknown>) => void) {
  return (state: State, action: Action): State => {
    if (action.type === "USER_SUBMIT") {
      const userMsg: ChatMessage = {
        role: "user",
        parts: [{ kind: "text", text: action.content }],
      };
      return { ...state, history: [...state.history, userMsg] };
    }
    return reduce(state, action.event, applyConfig);
  };
}

function toWireMessages(history: ChatMessage[]): WireMessage[] {
  return history.map((m) => ({
    role: m.role,
    content: m.parts
      .filter((p): p is { kind: "text"; text: string } => p.kind === "text")
      .map((p) => p.text)
      .join(""),
  }));
}

function MessagePartView({ part }: { part: MessagePart }) {
  if (part.kind === "text") return <span>{part.text}</span>;
  if (part.kind === "tool") {
    const sym = part.status === "started" ? "▶" : part.status === "ok" ? "✓" : "✗";
    const color = part.status === "error" ? "red" : part.status === "ok" ? "green" : "blue";
    return (
      <Tag color={color}>
        {sym} {part.tool}
        {part.summary ? ` — ${part.summary}` : part.status === "started" ? "…" : ""}
      </Tag>
    );
  }
  return <Alert type="error" message={part.message} showIcon style={{ marginTop: 8 }} />;
}

export function ChatPanel({ slug }: { slug: string }) {
  const applyConfig = useAppStore(
    (s) => (s as { applyConfig: (cfg: Record<string, unknown>) => void }).applyConfig,
  );
  const applyConfigRef = useRef(applyConfig);
  useEffect(() => { applyConfigRef.current = applyConfig; }, [applyConfig]);
  const reducerFn = useRef(
    (state: State, action: Action) => makeReducer(applyConfigRef.current)(state, action),
  ).current;
  const [state, dispatch] = useReducer(reducerFn, undefined, initialState);
  const [input, setInput] = useState("");
  const [lastSubmittedMessages, setLastSubmittedMessages] = useState<WireMessage[] | null>(null);

  const ctxQuery = useChatContext(slug);
  const { streaming, start, stop } = useChatTurn();

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      dispatch({ type: "USER_SUBMIT", content: trimmed });
      const wireMessages: WireMessage[] = [
        ...toWireMessages(state.history),
        { role: "user", content: trimmed },
      ];
      setLastSubmittedMessages(wireMessages);
      setInput("");
      try {
        await start(slug, wireMessages, (e) => dispatch({ type: "AGENT_EVENT", event: e }));
      } catch (e) {
        const msg = (e as Error).message ?? "request failed";
        dispatch({
          type: "AGENT_EVENT",
          event: { type: "error", message: msg, retryable: false },
        });
      }
    },
    [start, slug, state.history, streaming],
  );

  const retry = useCallback(async () => {
    if (!lastSubmittedMessages) return;
    try {
      await start(slug, lastSubmittedMessages, (e) =>
        dispatch({ type: "AGENT_EVENT", event: e }),
      );
    } catch (e) {
      const msg = (e as Error).message ?? "request failed";
      dispatch({
        type: "AGENT_EVENT",
        event: { type: "error", message: msg, retryable: false },
      });
    }
  }, [start, slug, lastSubmittedMessages]);

  const isEmpty = state.history.length === 0 && state.current === null && !streaming;
  const hasError = state.status === "error";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 12 }}>
      {ctxQuery.loading && <Spin />}
      {ctxQuery.error && (
        <Alert
          type="error"
          message={`Couldn't load chat context: ${(ctxQuery.error as Error).message}`}
          showIcon
        />
      )}
      {ctxQuery.data && isEmpty && (
        <div>
          <p>
            Ask about {ctxQuery.data.name} — {ctxQuery.data.n_obs.toLocaleString()} cells ×{" "}
            {ctxQuery.data.n_var.toLocaleString()} genes.
          </p>
          {deriveSuggestionChips(ctxQuery.data).map((chip) => (
            <Button
              key={chip.label}
              size="small"
              style={{ margin: "4px 4px 4px 0" }}
              onClick={() => setInput(chip.prompt)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      )}
      {!isEmpty && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 12,
            flex: 1,
            overflowY: "auto",
          }}
        >
          {state.history.map((m, i) => (
            <div key={i}>
              <strong>{m.role === "user" ? "You: " : "Assistant: "}</strong>
              {m.parts.map((p, j) => (
                <MessagePartView key={j} part={p} />
              ))}
            </div>
          ))}
          {state.current && (
            <div>
              <strong>Assistant: </strong>
              {state.current.parts.map((p, j) => (
                <MessagePartView key={j} part={p} />
              ))}
            </div>
          )}
          {hasError && (
            <Button onClick={retry} type="primary" size="small">
              Retry
            </Button>
          )}
        </div>
      )}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <Input
          placeholder="Ask anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !streaming) submit(input);
          }}
          disabled={streaming}
        />
        {streaming ? (
          <Button onClick={stop}>Stop</Button>
        ) : (
          <Button type="primary" onClick={() => submit(input)}>
            Send
          </Button>
        )}
      </div>
    </div>
  );
}
