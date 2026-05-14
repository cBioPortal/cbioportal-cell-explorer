/**
 * Citation marker handling.
 *
 * The agent (per cell-explorer-py#107) emits `[t:N]` markers in its assistant
 * text immediately after data-derived facts, where N is the 1-based ordinal of
 * the tool call within the current turn. The frontend resolves N → tool row by
 * position in the trace, so the marker remains valid even though the model
 * cannot reliably reproduce random tool_use_ids.
 *
 * Out-of-range ordinals (e.g. `[t:9]` when only two tools ran) are surfaced
 * but rendered as inert text — the agent will sometimes emit one when it
 * hallucinates an extra tool call. That's a graceful degradation: the user
 * sees a number that goes nowhere rather than a stuck `[t:9]` literal.
 */

export type CitationSegment =
  | { kind: "text"; text: string }
  | { kind: "citation"; ordinal: number; raw: string };

const CITATION_RE = /\[t:(\d+)\]/g;

export function parseCitations(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(CITATION_RE)) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      segments.push({ kind: "text", text: text.slice(lastIndex, start) });
    }
    segments.push({ kind: "citation", ordinal: Number(m[1]), raw: m[0] });
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
