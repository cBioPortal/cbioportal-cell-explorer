import { Alert, Button, Input, Spin, Tag } from "antd";
import { useCallback, useLayoutEffect, useReducer, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { applyConfig as applyConfigFn } from "../config/applyConfig";
import { applyErrorMessage } from "../config/applyResult";
import { initialState, reduce, type State } from "./eventReducer";
import { deriveSuggestionChips } from "./suggestionChips";
import type { ChatEvent, ChatMessage, MessagePart, WireMessage } from "./types";
import { ChatPermissionBanner } from "./ChatPermissionBanner";
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

// Components passed to ReactMarkdown — keep tables readable in a narrow sidebar
// and tighten paragraph margins for chat-density layout.
const markdownComponents = {
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: "auto", margin: "8px 0" }}>
      <table {...props} style={{ borderCollapse: "collapse", fontSize: 12 }} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      {...props}
      style={{ border: "1px solid #ddd", padding: "4px 8px", textAlign: "left", background: "#fafafa" }}
    />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td {...props} style={{ border: "1px solid #ddd", padding: "4px 8px" }} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} style={{ margin: "4px 0" }} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      {...props}
      style={{ background: "#f6f8fa", padding: "1px 4px", borderRadius: 3, fontSize: "0.9em" }}
    />
  ),
};

function MessagePartView({ part }: { part: MessagePart }) {
  if (part.kind === "text") {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {part.text}
      </ReactMarkdown>
    );
  }
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
  // applyConfigCallbackRef is a stable ref so the frozen reducerFn (created once
  // via useRef) can always reach the current callback — which itself captures
  // the stable `dispatch` returned by useReducer.
  const applyConfigCallbackRef = useRef<(cfg: Record<string, unknown>) => void>(() => {})
  const reducerFn = useRef(
    (state: State, action: Action) =>
      makeReducer((cfg) => applyConfigCallbackRef.current(cfg))(state, action),
  ).current;
  const [state, dispatch] = useReducer(reducerFn, undefined, initialState);

  // Wire the callback now that dispatch is available. dispatch is stable
  // (guaranteed by React), so this assignment runs once and stays valid.
  applyConfigCallbackRef.current = (cfg) => {
    applyConfigFn(cfg as Parameters<typeof applyConfigFn>[0]).then((result) => {
      if (!result.ok) {
        dispatch({
          type: "AGENT_EVENT",
          event: { type: "error", message: applyErrorMessage(result.reason), retryable: false },
        })
      }
    })
  }
  const [input, setInput] = useState("");
  const [lastSubmittedMessages, setLastSubmittedMessages] = useState<WireMessage[] | null>(null);

  const ctxQuery = useChatContext(slug);
  const { streaming, start, stop } = useChatTurn();

  // Auto-scroll-to-bottom: stick to the bottom of the message list as content
  // streams in, but preserve the user's scroll position if they've manually
  // scrolled up to read earlier output.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 24;
  }, []);
  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state]);

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

  // Permission gate — short-circuit before rendering input.
  const permission = ctxQuery.data?.permission;
  if (permission && !permission.can_chat) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 12 }}>
        <ChatPermissionBanner reason={permission.reason ?? "unknown"} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 12 }}>
      {ctxQuery.loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8 }}>
          <Spin size="small" />
          <span>Fetching metadata…</span>
        </div>
      )}
      {ctxQuery.error && (
        <Alert
          type="error"
          message={`Couldn't load chat context: ${(ctxQuery.error as Error).message}`}
          showIcon
        />
      )}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexShrink: 0 }}>
        <Input
          placeholder="Ask anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !streaming) submit(input);
          }}
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
