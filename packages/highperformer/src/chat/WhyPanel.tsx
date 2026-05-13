/**
 * Why panel — inline drop-down under an assistant turn that surfaces the
 * agent's reasoning trace: tool calls (name + args + duration), UI actions,
 * errors, and final usage. Spec: cell-explorer-py#96 design comment.
 *
 * v1 scope: inline placement under each assistant bubble, auto-expand on
 * error, "Why" label, B+D chip variants. Reasoning text is not yet on the
 * wire so no 💬 rows in v1.
 */
import { useEffect, useMemo, useState } from "react";
import { CaretDownOutlined, CaretRightOutlined, WarningOutlined } from "@ant-design/icons";
import type { ChatMessage, TraceEntry } from "./types";

type Stats = {
  toolCount: number;
  errorCount: number;
  durationMs: number | null;
  hasContent: boolean;
};

function computeStats(msg: ChatMessage): Stats {
  const trace = msg.trace ?? [];
  let toolCount = 0;
  let errorCount = 0;
  for (const e of trace) {
    if (e.kind === "tool_end") toolCount++;
    if (e.kind === "tool_end" && e.status === "error") errorCount++;
    if (e.kind === "error") errorCount++;
  }
  const durationMs =
    msg.startedAt != null && msg.endedAt != null
      ? msg.endedAt - msg.startedAt
      : null;
  return {
    toolCount,
    errorCount,
    durationMs,
    hasContent: trace.length > 0 || !!msg.usage,
  };
}

function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtArgs(args: Record<string, unknown> | null | undefined): string {
  if (!args || Object.keys(args).length === 0) return "()";
  return JSON.stringify(args);
}

/** Compact JSON pretty-print with a max length; everything past the cap is replaced with "…". */
function previewJson(value: unknown, max = 160): string {
  const s = JSON.stringify(value);
  if (!s) return "";
  return s.length <= max ? s : s.slice(0, max) + "…";
}

export function WhyPanel({ message }: { message: ChatMessage }) {
  const stats = useMemo(() => computeStats(message), [message]);
  const hasError = stats.errorCount > 0;
  const [open, setOpen] = useState(hasError);

  // Auto-expand the first time an error appears mid-stream.
  useEffect(() => {
    if (hasError) setOpen(true);
  }, [hasError]);

  if (!stats.hasContent) return null;

  const toolWord = stats.toolCount === 1 ? "tool" : "tools";
  const summary = hasError
    ? `${stats.toolCount} ${toolWord} (${stats.errorCount} error${stats.errorCount === 1 ? "" : "s"})`
    : `${stats.toolCount} ${toolWord}`;

  return (
    <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: hasError ? "#cf1322" : "#666",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          font: "inherit",
        }}
      >
        {hasError ? (
          <WarningOutlined />
        ) : open ? (
          <CaretDownOutlined />
        ) : (
          <CaretRightOutlined />
        )}
        <span>
          Why · {summary} · {fmtDuration(stats.durationMs)}
        </span>
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            paddingLeft: 12,
            borderLeft: "2px solid #eee",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {(message.trace ?? []).map((entry, i) => (
            <TraceRow key={i} entry={entry} />
          ))}
          {message.usage && (
            <div style={{ color: "#999", marginTop: 4 }}>
              ✅ Done · {message.usage.input_tokens + message.usage.output_tokens} tokens
              {" "}({message.usage.input_tokens} in / {message.usage.output_tokens} out)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraceRow({ entry }: { entry: TraceEntry }) {
  switch (entry.kind) {
    case "tool_start":
      return (
        <div>
          🛠 <code>{entry.tool}{fmtArgs(entry.args)}</code>
        </div>
      );
    case "tool_end": {
      const icon = entry.status === "error" ? "❌" : "✓";
      const color = entry.status === "error" ? "#cf1322" : "#52c41a";
      return (
        <div style={{ color, paddingLeft: 14 }}>
          {icon} {fmtDuration(entry.duration_ms)}
          {entry.summary && <span style={{ color: "#cf1322" }}> · {entry.summary}</span>}
        </div>
      );
    }
    case "ui_action":
      return (
        <div>
          🎬 <code>{previewJson(entry.payload)}</code>
        </div>
      );
    case "error":
      return (
        <div style={{ color: "#cf1322" }}>
          ⚠ {entry.message}
        </div>
      );
    default:
      return null;
  }
}
