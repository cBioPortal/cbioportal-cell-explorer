import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AssistantBubble } from "./AssistantBubble";
import type { ChatMessage } from "./types";

afterEach(() => cleanup());

function withCitation(text: string, toolId: string): ChatMessage {
  return {
    role: "assistant",
    parts: [{ kind: "text", text }],
    trace: [
      { kind: "tool_start", tool: "compare_groups", tool_call_id: toolId, args: {} },
      {
        kind: "tool_end",
        tool: "compare_groups",
        tool_call_id: toolId,
        status: "ok",
        duration_ms: 245,
      },
    ],
    startedAt: 0,
    endedAt: 1000,
  };
}

describe("AssistantBubble", () => {
  it("renders text without citation markers as plain text", () => {
    render(
      <AssistantBubble
        message={{
          role: "assistant",
          parts: [{ kind: "text", text: "no citations here" }],
        }}
      />,
    );
    expect(screen.getByText(/no citations here/)).toBeDefined();
    // No superscript link rendered
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders [t:<id>] as a clickable citation link", () => {
    render(
      <AssistantBubble
        message={withCitation("Top gene is CD8A [t:toolu_abc] in cluster 3.", "toolu_abc")}
      />,
    );
    const link = screen.getByRole("link", { name: /citation 1/i });
    expect(link).toBeDefined();
    expect(link.textContent).toBe("[1]");
  });

  it("numbers multiple distinct tool ids in order of first appearance", () => {
    render(
      <AssistantBubble
        message={{
          role: "assistant",
          parts: [
            {
              kind: "text",
              text: "First [t:b] then [t:a] then [t:b] again.",
            },
          ],
          trace: [],
        }}
      />,
    );
    const links = screen.getAllByRole("link");
    // 'b' was seen first → index 1. 'a' next → index 2. 'b' again → reuses 1.
    expect(links.map((l) => l.textContent)).toEqual(["[1]", "[2]", "[1]"]);
  });

  it("clicking a citation opens the WhyPanel and shows the cited tool row", () => {
    render(
      <AssistantBubble
        message={withCitation("CD8A [t:toolu_abc].", "toolu_abc")}
      />,
    );
    // Panel collapsed initially — tool row not visible
    expect(screen.queryByText(/compare_groups/)).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: /citation 1/i }));
    // Panel auto-expanded; tool row now visible and tagged with the id
    const row = screen.getByText(/compare_groups/).closest("[data-tool-id]");
    expect(row).not.toBeNull();
    expect(row!.getAttribute("data-tool-id")).toBe("toolu_abc");
  });

  it("renders tool tag pills inline (legacy ToolPart rendering preserved)", () => {
    render(
      <AssistantBubble
        message={{
          role: "assistant",
          parts: [
            { kind: "text", text: "Running it now: " },
            { kind: "tool", tool: "compare_groups", status: "started" },
          ],
          trace: [],
        }}
      />,
    );
    expect(screen.getByText(/compare_groups/)).toBeDefined();
  });
});
