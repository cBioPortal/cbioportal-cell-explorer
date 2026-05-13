import { Alert, Spin } from "antd";
import { useState, useCallback } from "react";
import { chat } from "../api";
import { ChatPermissionBanner } from "./ChatPermissionBanner";
import { ChatThreadList } from "./ChatThreadList";
import { ChatThreadHeader } from "./ChatThreadHeader";
import { ConversationView } from "./ConversationView";
import type { ChatMessage } from "./types";
import { useChatContext } from "./useChatContext";

type PanelMode =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "active"; threadId: string; title: string; initialHistory: ChatMessage[] };

export function ChatPanel({ slug }: { slug: string }) {
  const ctxQuery = useChatContext(slug);
  const [mode, setMode] = useState<PanelMode>({ kind: "list" });

  const enterNew = useCallback(() => setMode({ kind: "new" }), []);
  const enterList = useCallback(() => setMode({ kind: "list" }), []);

  const enterActive = useCallback(async (threadId: string) => {
    const detail = await chat.getThread(slug, threadId);
    const initialHistory: ChatMessage[] = detail.messages.map((m) => ({
      role: m.role,
      parts: [{ kind: "text", text: m.content }],
    }));
    setMode({
      kind: "active",
      threadId,
      title: detail.title,
      initialHistory,
    });
  }, [slug]);

  // Called by ConversationView when the stream's thread_open event arrives.
  // After the first turn of a new thread, transition into 'active' so back
  // navigation lands in the right place and the list refresh picks it up.
  const onThreadOpen = useCallback((threadId: string, title: string) => {
    setMode({ kind: "active", threadId, title, initialHistory: [] });
  }, []);

  if (ctxQuery.loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8 }}>
        <Spin size="small" />
        <span>Fetching metadata…</span>
      </div>
    );
  }
  if (ctxQuery.error) {
    return (
      <Alert
        type="error"
        message={`Couldn't load chat context: ${(ctxQuery.error as Error).message}`}
        showIcon
      />
    );
  }
  const data = ctxQuery.data;
  if (!data) return null;

  if (!data.permission.can_chat) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 12 }}>
        <ChatPermissionBanner reason={data.permission.reason ?? "unknown"} />
      </div>
    );
  }

  if (mode.kind === "list") {
    return (
      <ChatThreadList slug={slug} onSelect={enterActive} onNew={enterNew} />
    );
  }

  const headerTitle = mode.kind === "active" ? mode.title : null;
  const threadId = mode.kind === "active" ? mode.threadId : null;
  const initialHistory = mode.kind === "active" ? mode.initialHistory : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ChatThreadHeader title={headerTitle} onBack={enterList} />
      <ConversationView
        slug={slug}
        ctxData={data}
        threadId={threadId}
        initialHistory={initialHistory}
        onThreadOpen={onThreadOpen}
      />
    </div>
  );
}
