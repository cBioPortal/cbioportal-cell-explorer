/**
 * Citation link — rendered in place of a [t:N] ordinal marker in assistant text.
 * Clicking calls onCite(ordinal), which (in the parent AssistantBubble) opens
 * the WhyPanel and scroll/flashes the matching tool row by position in the
 * turn's trace.
 *
 * `valid=false` renders the same number with reduced affordance — no
 * underline, not clickable — so out-of-range ordinals from a hallucinating
 * model degrade gracefully instead of throwing the layout off.
 */
import type { MouseEvent } from "react";

export type CitationProps = {
  ordinal: number;
  valid: boolean;
  onCite: (ordinal: number) => void;
};

export function Citation({ ordinal, valid, onCite }: CitationProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    if (valid) onCite(ordinal);
  };
  const baseStyle = {
    fontSize: "0.75em",
    padding: "0 2px",
  };
  if (!valid) {
    return (
      <sup>
        <span
          title={`Source ${ordinal} (not in this turn)`}
          aria-label={`citation ${ordinal} (no source)`}
          style={{ ...baseStyle, color: "#999" }}
        >
          [{ordinal}]
        </span>
      </sup>
    );
  }
  return (
    <sup>
      <a
        href={`#cite-${ordinal}`}
        onClick={handleClick}
        title={`Source: tool call #${ordinal}`}
        aria-label={`citation ${ordinal}`}
        style={{ ...baseStyle, color: "#1677ff", textDecoration: "none", cursor: "pointer" }}
      >
        [{ordinal}]
      </a>
    </sup>
  );
}
