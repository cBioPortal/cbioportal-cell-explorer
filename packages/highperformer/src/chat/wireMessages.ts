/**
 * Wire-protocol message adapters for chat turns.
 *
 * The server validates that messages strictly alternate user/assistant. The
 * client's in-memory history can drift out of that invariant in two ways:
 *
 *  1. A hydrated thread whose last persisted message is a user role (because
 *     an earlier assistant turn errored before persisting). Hydration loads
 *     [..., user]; the next submit appends another user → role-alternation
 *     violation.
 *  2. Defensive guard against future state-machine bugs.
 *
 * `ensureAlternation` inserts a synthetic `(interrupted)` placeholder of the
 * opposite role between any two consecutive same-role messages. Applied at
 * the wire boundary only — does NOT mutate stored history, so the UI
 * continues to render the actual state.
 */
import type { WireMessage } from "./types";

export function ensureAlternation(msgs: WireMessage[]): WireMessage[] {
  const out: WireMessage[] = [];
  for (const m of msgs) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      const synthRole = last.role === "user" ? "assistant" : "user";
      out.push({ role: synthRole, content: "(interrupted)" });
    }
    out.push(m);
  }
  return out;
}
