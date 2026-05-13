import { describe, expect, it } from "vitest";
import { hasCitations, parseCitations } from "./citations";

describe("parseCitations", () => {
  it("returns the input as a single text segment when no markers present", () => {
    expect(parseCitations("plain text")).toEqual([
      { kind: "text", text: "plain text" },
    ]);
  });

  it("extracts a single marker between text segments", () => {
    expect(parseCitations("The top gene is CD8A [t:toolu_abc] in cluster 3.")).toEqual([
      { kind: "text", text: "The top gene is CD8A " },
      { kind: "citation", toolId: "toolu_abc", raw: "[t:toolu_abc]" },
      { kind: "text", text: " in cluster 3." },
    ]);
  });

  it("handles back-to-back markers with no separator", () => {
    expect(parseCitations("CD8A, GZMB [t:a][t:b]")).toEqual([
      { kind: "text", text: "CD8A, GZMB " },
      { kind: "citation", toolId: "a", raw: "[t:a]" },
      { kind: "citation", toolId: "b", raw: "[t:b]" },
    ]);
  });

  it("ignores square-bracket text that isn't a t: marker", () => {
    expect(parseCitations("see [Smith 2024] for context")).toEqual([
      { kind: "text", text: "see [Smith 2024] for context" },
    ]);
  });

  it("accepts hyphens and underscores in tool ids", () => {
    expect(parseCitations("ok [t:my-tool_42]")).toEqual([
      { kind: "text", text: "ok " },
      { kind: "citation", toolId: "my-tool_42", raw: "[t:my-tool_42]" },
    ]);
  });
});

describe("hasCitations", () => {
  it("detects a marker", () => {
    expect(hasCitations("x [t:abc] y")).toBe(true);
  });

  it("returns false for non-citation text", () => {
    expect(hasCitations("just some text [1] (Smith)")).toBe(false);
  });

  it("is stateless across calls (regex lastIndex reset)", () => {
    const s = "x [t:a] y";
    expect(hasCitations(s)).toBe(true);
    expect(hasCitations(s)).toBe(true);
    expect(hasCitations(s)).toBe(true);
  });
});
