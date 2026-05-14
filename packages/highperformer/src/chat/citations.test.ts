import { describe, expect, it } from "vitest";
import { hasCitations, parseCitations } from "./citations";

describe("parseCitations", () => {
  it("returns the input as a single text segment when no markers present", () => {
    expect(parseCitations("plain text")).toEqual([
      { kind: "text", text: "plain text" },
    ]);
  });

  it("extracts an ordinal marker between text segments", () => {
    expect(parseCitations("The top gene is CD8A [t:1] in cluster 3.")).toEqual([
      { kind: "text", text: "The top gene is CD8A " },
      { kind: "citation", ordinal: 1, raw: "[t:1]" },
      { kind: "text", text: " in cluster 3." },
    ]);
  });

  it("handles back-to-back markers with no separator", () => {
    expect(parseCitations("CD8A, GZMB [t:1][t:2]")).toEqual([
      { kind: "text", text: "CD8A, GZMB " },
      { kind: "citation", ordinal: 1, raw: "[t:1]" },
      { kind: "citation", ordinal: 2, raw: "[t:2]" },
    ]);
  });

  it("only matches digit ordinals — letter-shaped markers are plain text", () => {
    expect(parseCitations("see [t:abc] not a citation")).toEqual([
      { kind: "text", text: "see [t:abc] not a citation" },
    ]);
  });

  it("ignores square-bracket text that isn't a t: marker", () => {
    expect(parseCitations("see [Smith 2024] for context")).toEqual([
      { kind: "text", text: "see [Smith 2024] for context" },
    ]);
  });

  it("handles multi-digit ordinals", () => {
    expect(parseCitations("ok [t:12]")).toEqual([
      { kind: "text", text: "ok " },
      { kind: "citation", ordinal: 12, raw: "[t:12]" },
    ]);
  });
});

describe("hasCitations", () => {
  it("detects a marker", () => {
    expect(hasCitations("x [t:1] y")).toBe(true);
  });

  it("returns false for non-citation text", () => {
    expect(hasCitations("just some text [1] (Smith)")).toBe(false);
  });

  it("is stateless across calls (regex lastIndex reset)", () => {
    const s = "x [t:1] y";
    expect(hasCitations(s)).toBe(true);
    expect(hasCitations(s)).toBe(true);
    expect(hasCitations(s)).toBe(true);
  });
});
