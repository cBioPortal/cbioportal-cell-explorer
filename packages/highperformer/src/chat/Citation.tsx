/**
 * Citation link — rendered in place of a [t:<id>] marker in assistant text.
 * Clicking calls onCite, which (in the parent AssistantBubble) opens the
 * WhyPanel and scroll/flashes the referenced tool row.
 */
import type { MouseEvent } from "react";

export type CitationProps = {
  toolId: string;
  index: number; // 1-based; rendered as the superscript label
  onCite: (toolId: string) => void;
};

export function Citation({ toolId, index, onCite }: CitationProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    onCite(toolId);
  };
  return (
    <sup>
      <a
        href={`#tool-${toolId}`}
        onClick={handleClick}
        title={`Source: tool call ${toolId}`}
        aria-label={`citation ${index}`}
        style={{
          color: "#1677ff",
          textDecoration: "none",
          fontSize: "0.75em",
          padding: "0 2px",
          cursor: "pointer",
        }}
      >
        [{index}]
      </a>
    </sup>
  );
}
