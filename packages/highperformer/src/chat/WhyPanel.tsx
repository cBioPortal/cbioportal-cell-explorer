/**
 * Why panel — inline drop-down under an assistant turn that surfaces the
 * agent's reasoning trace: tool calls (name + args + duration), UI actions,
 * errors, and final usage. Spec: cell-explorer-py#96 design comment.
 *
 * v1 scope: inline placement under each assistant bubble, auto-expand on
 * error, "Why" label, B+D chip variants. Reasoning text is not yet on the
 * wire so no 💬 rows in v1.
 */
import { useEffect, useMemo, useRef, useState } from "react";
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

export type WhyPanelProps = {
  message: ChatMessage;
  /** Controlled-open flag. When undefined the component manages its own state. */
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  /**
   * When set, the row with matching tool_call_id renders with a flash effect
   * (used to draw the eye after a citation click). Set back to null after
   * a few seconds in the parent.
   */
  flashToolId?: string | null;
};

export function WhyPanel({ message, open: openProp, onOpenChange, flashToolId }: WhyPanelProps) {
  const stats = useMemo(() => computeStats(message), [message]);
  const hasError = stats.errorCount > 0;
  const [openSelf, setOpenSelf] = useState(hasError);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp! : openSelf;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenSelf(next);
    onOpenChange?.(next);
  };

  // Auto-expand the first time an error appears mid-stream.
  useEffect(() => {
    if (hasError) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasError]);

  // Scroll the flashed tool row into view when a citation is clicked.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open || !flashToolId || !containerRef.current) return;
    const row = containerRef.current.querySelector(
      `[data-tool-id="${flashToolId}"]`,
    );
    if (row && row instanceof HTMLElement) {
      // jsdom and some embedded webviews lack scrollIntoView — flash still works.
      row.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }
  }, [open, flashToolId]);

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
          ref={containerRef}
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
            <TraceRow key={i} entry={entry} flash={isFlashed(entry, flashToolId)} />
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

function isFlashed(entry: TraceEntry, flashToolId?: string | null): boolean {
  if (!flashToolId) return false;
  return (
    (entry.kind === "tool_start" || entry.kind === "tool_end") &&
    entry.tool_call_id === flashToolId
  );
}

function TraceRow({ entry, flash }: { entry: TraceEntry; flash: boolean }) {
  const flashStyle: React.CSSProperties = flash
    ? {
        background: "#fff3bf",
        transition: "background 1.2s ease-out",
        borderRadius: 3,
        padding: "1px 4px",
        margin: "-1px -4px",
      }
    : {};

  switch (entry.kind) {
    case "tool_start":
      return (
        <div
          id={entry.tool_call_id ? `tool-${entry.tool_call_id}` : undefined}
          data-tool-id={entry.tool_call_id ?? undefined}
          style={flashStyle}
        >
          🛠 <code>{entry.tool}{fmtArgs(entry.args)}</code>
        </div>
      );
    case "tool_end": {
      const icon = entry.status === "error" ? "❌" : "✓";
      const color = entry.status === "error" ? "#cf1322" : "#52c41a";
      return (
        <div
          data-tool-id={entry.tool_call_id ?? undefined}
          style={{ color, paddingLeft: 14, ...flashStyle }}
        >
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
