/**
 * AssistantBubble — renders one assistant turn (text/tool/error parts + the
 * WhyPanel below) and orchestrates the citation handshake:
 *
 *   1. Scan the message's text for [t:<id>] markers; assign each unique id a
 *      1-based index (so the first cited tool is "[1]", the second "[2]", etc.)
 *   2. Render text through ReactMarkdown with a components override that
 *      replaces marker substrings with Citation link components
 *   3. When a citation is clicked, open the WhyPanel and flash the matching
 *      tool row (cleared after 2 seconds)
 */
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Alert, Tag } from "antd";
import { Citation } from "./Citation";
import { parseCitations } from "./citations";
import { WhyPanel } from "./WhyPanel";
import type { ChatMessage, MessagePart, ToolPart } from "./types";

const FLASH_MS = 2000;

/** Walk through ReactMarkdown's children and replace [t:<id>] in text nodes. */
function withCitations(
  children: ReactNode,
  citeIndex: Map<string, number>,
  onCite: (id: string) => void,
): ReactNode {
  return walk(children, citeIndex, onCite);
}

function walk(
  node: ReactNode,
  citeIndex: Map<string, number>,
  onCite: (id: string) => void,
): ReactNode {
  if (typeof node === "string") {
    const segments = parseCitations(node);
    if (segments.length === 1 && segments[0].kind === "text") return node;
    return segments.map((seg, i) =>
      seg.kind === "text" ? (
        seg.text
      ) : (
        <Citation
          key={`cite-${i}-${seg.toolId}`}
          toolId={seg.toolId}
          index={citeIndex.get(seg.toolId) ?? 0}
          onCite={onCite}
        />
      ),
    );
  }
  if (Array.isArray(node)) {
    return node.map((child) => walk(child, citeIndex, onCite));
  }
  return node;
}

function buildCitationIndex(message: ChatMessage): Map<string, number> {
  const index = new Map<string, number>();
  let next = 1;
  for (const p of message.parts) {
    if (p.kind !== "text") continue;
    for (const m of p.text.matchAll(/\[t:([A-Za-z0-9_-]+)\]/g)) {
      const id = m[1];
      if (!index.has(id)) {
        index.set(id, next++);
      }
    }
  }
  return index;
}

function ToolPartTag({ part }: { part: ToolPart }) {
  const sym = part.status === "started" ? "▶" : part.status === "ok" ? "✓" : "✗";
  const color = part.status === "error" ? "red" : part.status === "ok" ? "green" : "blue";
  return (
    <Tag color={color}>
      {sym} {part.tool}
      {part.summary ? ` — ${part.summary}` : part.status === "started" ? "…" : ""}
    </Tag>
  );
}

export type AssistantBubbleProps = {
  message: ChatMessage;
  /** Inherited from the parent — controls antd-table layout etc. */
  markdownComponents?: Components;
};

export function AssistantBubble({ message, markdownComponents }: AssistantBubbleProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [flashToolId, setFlashToolId] = useState<string | null>(null);

  const citeIndex = useMemo(() => buildCitationIndex(message), [message]);

  const onCite = useCallback((toolId: string) => {
    setWhyOpen(true);
    setFlashToolId(toolId);
    window.setTimeout(() => setFlashToolId(null), FLASH_MS);
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
        const transformed = withCitations(props.children, citeIndex, onCite);
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
  }, [markdownComponents, citeIndex, onCite]);

  return (
    <div>
      {message.parts.map((p, i) => (
        <PartView
          key={i}
          part={p}
          markdownComponents={componentsWithCitations}
        />
      ))}
      <WhyPanel
        message={message}
        open={whyOpen}
        onOpenChange={setWhyOpen}
        flashToolId={flashToolId}
      />
    </div>
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
