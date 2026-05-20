/**
 * Wire types for the chat backend (Plan 2 — /api/chat/{slug}).
 *
 * Hand-maintained mirror of the backend Pydantic models. When Plan 2 ships
 * and the openapi schema regenerates, this file can be replaced by a typed
 * wrapper around openapi-fetch. Streaming responses (NDJSON) still need a
 * hand-written shape since openapi-fetch doesn't model AsyncIterable.
 */

// ---------- /context response ----------

export type ObsColumnInfo = {
  name: string;
  dtype: "categorical" | "numeric" | "string";
  cardinality: number | null;
  values: string[] | null; // populated for categorical with cardinality <= 50
};

export type ChatPermission = {
  can_chat: boolean;
  reason: string | null;
};

export type ContextResponse = {
  slug: string;
  name: string;
  description: string;
  n_obs: number;
  n_var: number;
  obs_columns: ObsColumnInfo[];
  embedding_keys: string[];
  available_tools: string[];
  permission: ChatPermission;
};

// ---------- /threads wire responses ----------

export type ThreadSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

export type ThreadListResponse = { threads: ThreadSummary[] };

export type MessageFeedback = {
  rating: "up" | "down";
  comment?: string | null;
};

export type ThreadDetailResponse = {
  id: string;
  title: string;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
    feedback?: MessageFeedback | null;
  }[];
};

// ---------- /turns wire request ----------

export type WireMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TurnRequest = {
  messages: WireMessage[];
  view_state?: import("./viewStateSnapshot").ViewStateSnapshot;
};

// ---------- /turns wire events ----------

/**
 * Inline chart hint, attached to a tool's 'ok' tool_progress event.
 * `data` is renderer-specific and narrowed by each chart-type registry entry.
 * The LLM never sees `data` (backend strips it); the frontend renders charts
 * inline beneath the matching tool pill.
 */
export type ChartHint = {
  type: string;
  data?: unknown;
};

export type TextDelta    = { type: "text_delta"; text: string };
export type ToolProgress = {
  type: "tool_progress";
  tool: string;
  status: "started" | "ok" | "error";
  summary?: string;
  /** Populated on the 'started' event — the tool's input arguments. */
  args?: Record<string, unknown> | null;
  /** Populated on the 'ok' / 'error' events — wall-clock since 'started'. */
  duration_ms?: number | null;
  /** LLM-generated tool_use_id. Citation markers [t:<id>] reference this. */
  tool_call_id?: string | null;
  /** Populated only on the 'ok' event when the tool result included a chart hint. */
  chart?: ChartHint | null;
};
export type UIAction     = { type: "ui_action"; payload: Record<string, unknown> };
export type ErrorEvent   = { type: "error"; message: string; retryable: boolean };
export type DoneEvent    = {
  type: "done";
  usage: { input_tokens: number; output_tokens: number };
  /** Server-assigned id of the persisted assistant message — present once
   * the backend has flushed the row (which it does inline before yielding
   * the done event). Absent on older servers. */
  message_id?: string;
};
export type ThreadOpenEvent = {
  type: "thread_open";
  thread_id: string;
  title: string;
};

export type ChatEvent =
  | TextDelta
  | ToolProgress
  | UIAction
  | ErrorEvent
  | DoneEvent
  | ThreadOpenEvent;

// ---------- in-memory chat state (component-local) ----------

export type TextPart  = { kind: "text";  text: string };
export type ToolPart  = {
  kind: "tool";
  tool: string;
  status: "started" | "ok" | "error";
  summary?: string;
  args?: Record<string, unknown> | null;
  duration_ms?: number | null;
  /** Inline chart attached when the tool produced one. */
  chart?: ChartHint | null;
};
export type ErrorPart = { kind: "error"; message: string };
export type MessagePart = TextPart | ToolPart | ErrorPart;

/**
 * Per-turn event log used by the "Why" panel. Captures everything the agent
 * did in chronological order (tool starts, tool ends, UI actions, errors).
 * Distinct from `parts` — which holds only what renders inline in the chat
 * bubble (text + tool widgets + errors).
 */
export type TraceEntry =
  | {
      kind: "tool_start";
      tool: string;
      tool_call_id?: string | null;
      args?: Record<string, unknown> | null;
    }
  | {
      kind: "tool_end";
      tool: string;
      tool_call_id?: string | null;
      status: "ok" | "error";
      summary?: string;
      duration_ms?: number | null;
    }
  | { kind: "ui_action"; payload: Record<string, unknown> }
  | { kind: "error"; message: string };

export type ChatMessage = {
  role: "user" | "assistant";
  parts: MessagePart[];
  /** Why-panel data — populated on assistant messages from the stream. */
  trace?: TraceEntry[];
  usage?: { input_tokens: number; output_tokens: number };
  /** ms timestamps for computing total turn duration. */
  startedAt?: number;
  endedAt?: number;
  /** Server-assigned message id (present once persisted; absent during streaming). */
  id?: string;
  /** Feedback hydrated from the server when reloading a thread. */
  feedback?: MessageFeedback | null;
};

// ---------- chip definitions ----------

export type ChipDef = { label: string; prompt: string };

// ---------- error class for non-2xx pre-stream HTTP failures ----------

export class HttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = "HttpError";
  }
}
