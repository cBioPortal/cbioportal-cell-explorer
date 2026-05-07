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

export type ContextResponse = {
  slug: string;
  name: string;
  description: string;
  n_obs: number;
  n_var: number;
  obs_columns: ObsColumnInfo[];
  embedding_keys: string[];
  available_tools: string[];
};

// ---------- /turns wire request ----------

export type WireMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TurnRequest = {
  messages: WireMessage[];
};

// ---------- /turns wire events ----------

export type TextDelta    = { type: "text_delta"; text: string };
export type ToolProgress = {
  type: "tool_progress";
  tool: string;
  status: "started" | "ok" | "error";
  summary?: string;
};
export type UIAction     = { type: "ui_action"; payload: Record<string, unknown> };
export type ErrorEvent   = { type: "error"; message: string; retryable: boolean };
export type DoneEvent    = {
  type: "done";
  usage: { input_tokens: number; output_tokens: number };
};

export type ChatEvent =
  | TextDelta
  | ToolProgress
  | UIAction
  | ErrorEvent
  | DoneEvent;

// ---------- in-memory chat state (component-local) ----------

export type TextPart  = { kind: "text";  text: string };
export type ToolPart  = {
  kind: "tool";
  tool: string;
  status: "started" | "ok" | "error";
  summary?: string;
};
export type ErrorPart = { kind: "error"; message: string };
export type MessagePart = TextPart | ToolPart | ErrorPart;

export type ChatMessage = {
  role: "user" | "assistant";
  parts: MessagePart[];
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
