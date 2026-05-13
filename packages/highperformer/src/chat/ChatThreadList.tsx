import { Button, Modal, Spin } from "antd";
import { useCallback, useEffect, useState } from "react";
import { chat } from "../api";
import type { ThreadSummary } from "./types";

export type ChatThreadListProps = {
  slug: string;
  onSelect: (threadId: string) => void;
  onNew: () => void;
};

function formatRelative(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ChatThreadList({ slug, onSelect, onNew }: ChatThreadListProps) {
  const [threads, setThreads] = useState<ThreadSummary[] | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  const refresh = useCallback(async () => {
    setError(undefined);
    try {
      const data = await chat.listThreads(slug);
      setThreads(data.threads);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    (thread: ThreadSummary) => {
      Modal.confirm({
        title: "Delete this thread?",
        content: thread.title,
        okText: "Delete",
        okType: "danger",
        async onOk() {
          await chat.deleteThread(slug, thread.id);
          await refresh();
        },
      });
    },
    [slug, refresh],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <span style={{ fontWeight: 600 }}>Conversations</span>
        <Button type="link" size="small" onClick={onNew}>
          + New chat
        </Button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {threads === undefined && !error && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <Spin size="small" />
          </div>
        )}
        {error && (
          <div style={{ padding: 16, color: "#cf1322" }}>
            Couldn't load threads: {error.message}
          </div>
        )}
        {threads !== undefined && threads.length === 0 && (
          <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
            No conversations yet — start one with + New chat.
          </div>
        )}
        {threads !== undefined && threads.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {threads.map((t) => (
              <li
                key={t.id}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #fafafa",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
                onClick={() => onSelect(t.id)}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#999" }}>
                    {formatRelative(t.updated_at)} · {t.message_count} msg
                  </div>
                </div>
                <Button
                  type="text"
                  size="small"
                  danger
                  aria-label="delete thread"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(t);
                  }}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
