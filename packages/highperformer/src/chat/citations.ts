/**
 * Citation marker handling.
 *
 * The agent (per the system prompt instruction landed in cell-explorer-py#105)
 * emits `[t:<tool_use_id>]` markers in its assistant text immediately after
 * data-derived facts. These markers point at the tool_use_id of the tool call
 * whose result produced the fact, and are rendered by the frontend as clickable
 * links that open the corresponding tool row in the WhyPanel.
 *
 * Tool ids are LLM-generated identifiers (Anthropic returns e.g. "toolu_01ab…")
 * — alphanumeric plus underscore. The regex is intentionally permissive on the
 * id chars so we can render whatever the model emits; an unknown id still
 * renders as a non-functional citation rather than getting stuck in the text.
 */

export type CitationSegment =
  | { kind: "text"; text: string }
  | { kind: "citation"; toolId: string; raw: string };

const CITATION_RE = /\[t:([A-Za-z0-9_-]+)\]/g;

export function parseCitations(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(CITATION_RE)) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      segments.push({ kind: "text", text: text.slice(lastIndex, start) });
    }
    segments.push({ kind: "citation", toolId: m[1], raw: m[0] });
    lastIndex = start + m[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: "text", text: text.slice(lastIndex) });
  }
  return segments;
}

/** True when the string contains at least one citation marker. */
export function hasCitations(text: string): boolean {
  CITATION_RE.lastIndex = 0;
  return CITATION_RE.test(text);
}
