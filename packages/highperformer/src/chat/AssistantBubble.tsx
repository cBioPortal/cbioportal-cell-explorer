/**
 * AssistantBubble — renders one assistant turn (text/tool/error parts + the
 * WhyPanel below) and orchestrates the citation handshake.
 *
 * Citations use ordinals (the model emits `[t:1]`, `[t:2]`, ...). The ordinal
 * resolves to a tool by position in the trace — `[t:N]` → the Nth `tool_start`
 * entry. Out-of-range ordinals render as inert grey labels.
 *
 * When a citation is clicked, the WhyPanel opens (if collapsed) and the
 * corresponding tool row flashes; the flash clears after a short timeout.
 */
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Alert, Tag } from "antd";
import { Citation } from "./Citation";
import { parseCitations } from "./citations";
import { FeedbackThumbs } from "./FeedbackThumbs";
import { useChatFeedback } from "./useChatFeedback";
import { WhyPanel } from "./WhyPanel";
import type { ChatMessage, MessageFeedback, MessagePart, ToolPart } from "./types";

const FLASH_MS = 2000;

/** Total number of `tool_start` entries in this message's trace. */
function toolCount(message: ChatMessage): number {
  return (message.trace ?? []).filter((e) => e.kind === "tool_start").length;
}

/** Walk through ReactMarkdown's children and replace [t:N] in text nodes. */
function walk(
  node: ReactNode,
  maxOrdinal: number,
  onCite: (ordinal: number) => void,
): ReactNode {
  if (typeof node === "string") {
    const segments = parseCitations(node);
    if (segments.length === 1 && segments[0].kind === "text") return node;
    return segments.map((seg, i) =>
      seg.kind === "text" ? (
        seg.text
      ) : (
        <Citation
          key={`cite-${i}-${seg.ordinal}`}
          ordinal={seg.ordinal}
          valid={seg.ordinal >= 1 && seg.ordinal <= maxOrdinal}
          onCite={onCite}
        />
      ),
    );
  }
  if (Array.isArray(node)) {
    return node.map((child) => walk(child, maxOrdinal, onCite));
  }
  return node;
}

function ToolPartTag({ part }: { part: ToolPart }) {
  const sym = part.status === "started" ? "▶" : part.status === "ok" ? "✓" : "✗";
  const color = part.status === "error" ? "red" : part.status === "ok" ? "green" : "blue";
  // Pulse the pill while the tool is in flight so it reads as "working"
  // alongside the higher-level "Thinking…" indicator. Keyframes in index.css.
  const className = part.status === "started" ? "chat-tool-pulse" : undefined;
  return (
    <Tag color={color} className={className}>
      {sym} {part.tool}
      {part.summary ? ` — ${part.summary}` : part.status === "started" ? "…" : ""}
    </Tag>
  );
}

export type AssistantBubbleProps = {
  message: ChatMessage;
  /** Dataset slug — required to scope feedback writes to the right thread. */
  slug: string;
  /** Inherited from the parent — controls antd-table layout etc. */
  markdownComponents?: Components;
};

export function AssistantBubble({ message, slug, markdownComponents }: AssistantBubbleProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [flashOrdinal, setFlashOrdinal] = useState<number | null>(null);

  const maxOrdinal = useMemo(() => toolCount(message), [message]);

  const onCite = useCallback((ordinal: number) => {
    setWhyOpen(true);
    setFlashOrdinal(ordinal);
    window.setTimeout(() => setFlashOrdinal(null), FLASH_MS);
  }, []);

  const componentsWithCitations: Components = useMemo(() => {
    const base = markdownComponents ?? {};
    // Wrap the components that commonly host text content so their text
    // children get scanned for citation markers. Block-level tags only —
    // citations land inside paragraphs, list items, table cells, and code.
    const wrap = <T extends keyof JSX.IntrinsicElements>(
      tag: T,
      baseRenderer?: Components[T],
    ) => {
      const Wrapped = (props: { children?: ReactNode } & Record<string, unknown>) => {
        const transformed = walk(props.children, maxOrdinal, onCite);
        if (baseRenderer) {
          const Renderer = baseRenderer as (p: typeof props) => ReactNode;
          return <>{Renderer({ ...props, children: transformed })}</>;
        }
        const Tag = tag as keyof JSX.IntrinsicElements;
        return <Tag {...(props as Record<string, unknown>)}>{transformed}</Tag>;
      };
      return Wrapped as Components[T];
    };
    return {
      ...base,
      p: wrap("p", base.p),
      li: wrap("li", base.li),
      td: wrap("td", base.td),
      th: wrap("th", base.th),
      strong: wrap("strong", base.strong),
      em: wrap("em", base.em),
    };
  }, [markdownComponents, maxOrdinal, onCite]);

  return (
    <div>
      {message.parts.map((p, i) => (
        <PartView
          key={i}
          part={p}
          markdownComponents={componentsWithCitations}
        />
      ))}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <WhyPanel
          message={message}
          open={whyOpen}
          onOpenChange={setWhyOpen}
          flashOrdinal={flashOrdinal}
        />
        {message.id && (
          <FeedbackSlot
            slug={slug}
            messageId={message.id}
            initial={message.feedback ?? null}
          />
        )}
      </div>
    </div>
  );
}

function FeedbackSlot({
  slug,
  messageId,
  initial,
}: {
  slug: string;
  messageId: string;
  initial: MessageFeedback | null;
}) {
  const { rating, comment, setFeedback, status } = useChatFeedback(
    slug,
    messageId,
    initial,
  );
  return (
    <FeedbackThumbs
      rating={rating}
      comment={comment}
      onChange={(next) => {
        setFeedback(next).catch(() => {
          // optimistic revert handled inside the hook; toast is out of scope v1
        });
      }}
      disabled={status === "pending"}
    />
  );
}

function PartView({
  part,
  markdownComponents,
}: {
  part: MessagePart;
  markdownComponents: Components;
}) {
  if (part.kind === "text") {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {part.text}
      </ReactMarkdown>
    );
  }
  if (part.kind === "tool") {
    return <ToolPartTag part={part} />;
  }
  return <Alert type="error" message={part.message} showIcon style={{ marginTop: 8 }} />;
}
