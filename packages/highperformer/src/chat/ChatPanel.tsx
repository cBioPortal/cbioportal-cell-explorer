import { Alert, Spin } from "antd";
import { ChatPermissionBanner } from "./ChatPermissionBanner";
import { ConversationView } from "./ConversationView";
import { useChatContext } from "./useChatContext";

export function ChatPanel({ slug }: { slug: string }) {
  const ctxQuery = useChatContext(slug);

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

  return (
    <ConversationView
      slug={slug}
      ctxData={data}
      threadId={null}           // Task B7 wires this from mode state
      onThreadOpen={() => {}}   // Task B7 wires this
    />
  );
}
