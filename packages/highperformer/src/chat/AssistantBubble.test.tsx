import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AssistantBubble } from "./AssistantBubble";
import { chat as chatClient } from "../api";
import type { ChatMessage } from "./types";

afterEach(() => cleanup());

function withOneTool(text: string): ChatMessage {
  return {
    role: "assistant",
    parts: [{ kind: "text", text }],
    trace: [
      { kind: "tool_start", tool: "compare_groups", tool_call_id: "id_1", args: {} },
      {
        kind: "tool_end",
        tool: "compare_groups",
        tool_call_id: "id_1",
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
        slug="public-atlas"
      />,
    );
    expect(screen.getByText(/no citations here/)).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders [t:N] as a clickable citation link", () => {
    render(
      <AssistantBubble
        message={withOneTool("Top gene is CD8A [t:1] in cluster 3.")}
        slug="public-atlas"
      />,
    );
    const link = screen.getByRole("link", { name: /citation 1/i });
    expect(link).toBeDefined();
    expect(link.textContent).toBe("[1]");
  });

  it("renders out-of-range ordinals as inert grey labels (no link)", () => {
    render(
      <AssistantBubble
        message={withOneTool("Citing the second tool [t:2] (but only one ran).")}
        slug="public-atlas"
      />,
    );
    // No link role for an invalid ordinal.
    expect(screen.queryByRole("link")).toBeNull();
    // The number still renders so the text doesn't show a raw [t:2] literal.
    expect(screen.getByLabelText(/citation 2 \(no source\)/i)).toBeDefined();
  });

  it("clicking a citation opens the WhyPanel and shows the cited tool row", () => {
    render(
      <AssistantBubble message={withOneTool("CD8A [t:1].")} slug="public-atlas" />,
    );
    // Panel collapsed initially — tool row not visible
    expect(screen.queryByText(/compare_groups/)).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: /citation 1/i }));
    // Panel auto-expanded; tool row visible with the [1] label
    const row = screen.getByText(/compare_groups/).closest("[data-cite-ordinal]");
    expect(row).not.toBeNull();
    expect(row!.getAttribute("data-cite-ordinal")).toBe("1");
    expect(row!.textContent).toContain("[1]");
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
        slug="public-atlas"
      />,
    );
    expect(screen.getByText(/compare_groups/)).toBeDefined();
  });

  it("renders FeedbackThumbs when message.id is present", () => {
    vi.spyOn(chatClient, "putFeedback").mockResolvedValue({
      rating: "up",
      comment: null,
    });
    render(
      <AssistantBubble
        message={{
          ...withOneTool("Some answer."),
          id: "msg-1",
          feedback: { rating: "up", comment: null },
        }}
        slug="public-atlas"
      />,
    );
    // Thumb-up should render in the filled state.
    expect(screen.getByRole("button", { name: /thumbs up/i })).toBeDefined();
  });

  it("does not render FeedbackThumbs on a streaming message (no id)", () => {
    render(
      <AssistantBubble
        message={withOneTool("Mid-stream answer.")}
        slug="public-atlas"
      />,
    );
    expect(screen.queryByRole("button", { name: /thumbs up/i })).toBeNull();
  });
});
