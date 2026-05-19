import { describe, expect, it } from "vitest";
import { ensureAlternation } from "./wireMessages";

describe("ensureAlternation", () => {
  it("returns alternating sequence unchanged", () => {
    const msgs = [
      { role: "user" as const, content: "a" },
      { role: "assistant" as const, content: "b" },
      { role: "user" as const, content: "c" },
    ];
    expect(ensureAlternation(msgs)).toEqual(msgs);
  });

  it("inserts a synthetic assistant between consecutive user messages", () => {
    // The hydrated-thread bug: server returned [user] (last assistant turn
    // never persisted), client appends new user → server 422 without this.
    const msgs = [
      { role: "user" as const, content: "old" },
      { role: "user" as const, content: "new" },
    ];
    expect(ensureAlternation(msgs)).toEqual([
      { role: "user", content: "old" },
      { role: "assistant", content: "(interrupted)" },
      { role: "user", content: "new" },
    ]);
  });

  it("inserts a synthetic user between consecutive assistant messages", () => {
    const msgs = [
      { role: "assistant" as const, content: "a" },
      { role: "assistant" as const, content: "b" },
    ];
    expect(ensureAlternation(msgs)).toEqual([
      { role: "assistant", content: "a" },
      { role: "user", content: "(interrupted)" },
      { role: "assistant", content: "b" },
    ]);
  });

  it("handles three consecutive same-role messages", () => {
    const msgs = [
      { role: "user" as const, content: "1" },
      { role: "user" as const, content: "2" },
      { role: "user" as const, content: "3" },
    ];
    expect(ensureAlternation(msgs)).toEqual([
      { role: "user", content: "1" },
      { role: "assistant", content: "(interrupted)" },
      { role: "user", content: "2" },
      { role: "assistant", content: "(interrupted)" },
      { role: "user", content: "3" },
    ]);
  });

  it("returns empty input unchanged", () => {
    expect(ensureAlternation([])).toEqual([]);
  });

  it("returns single-message input unchanged", () => {
    const msgs = [{ role: "user" as const, content: "hi" }];
    expect(ensureAlternation(msgs)).toEqual(msgs);
  });
});
