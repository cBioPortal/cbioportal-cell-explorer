import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WhyPanel } from "./WhyPanel";
import type { ChatMessage } from "./types";

afterEach(() => cleanup());

function msg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    role: "assistant",
    parts: [],
    trace: [],
    startedAt: 0,
    endedAt: 3200,
    ...overrides,
  };
}

describe("WhyPanel", () => {
  it("renders nothing when there is no trace or usage", () => {
    const { container } = render(
      <WhyPanel message={{ role: "assistant", parts: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a collapsed chip with tool count and duration", () => {
    render(
      <WhyPanel
        message={msg({
          trace: [
            { kind: "tool_start", tool: "get_dataset_schema", args: {} },
            {
              kind: "tool_end",
              tool: "get_dataset_schema",
              status: "ok",
              duration_ms: 245,
            },
          ],
        })}
      />,
    );
    // Chip summary text — matched piecewise since icon + spans split the line
    const chip = screen.getByRole("button");
    expect(chip.textContent).toContain("Why");
    expect(chip.textContent).toContain("1 tool");
    expect(chip.textContent).toContain("3.2s");
    // Collapsed by default — the trace row is not visible
    expect(screen.queryByText(/get_dataset_schema\(\)/)).toBeNull();
  });

  it("expands to show trace rows when clicked", () => {
    render(
      <WhyPanel
        message={msg({
          trace: [
            { kind: "tool_start", tool: "get_dataset_schema", args: {} },
            {
              kind: "tool_end",
              tool: "get_dataset_schema",
              status: "ok",
              duration_ms: 245,
            },
          ],
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/get_dataset_schema\(\)/)).toBeDefined();
    expect(screen.getByText(/245 ms/)).toBeDefined();
  });

  it("auto-expands when the trace contains an error", () => {
    render(
      <WhyPanel
        message={msg({
          trace: [
            { kind: "tool_start", tool: "explode", args: { x: 1 } },
            {
              kind: "tool_end",
              tool: "explode",
              status: "error",
              summary: "kaboom",
              duration_ms: 12,
            },
          ],
        })}
      />,
    );
    // Already expanded — tool name visible without clicking
    expect(screen.getByText(/explode/)).toBeDefined();
    expect(screen.getByText(/kaboom/)).toBeDefined();
    // Chip uses ⚠ variant and shows error count
    const chip = screen.getByRole("button");
    expect(chip.textContent).toContain("1 tool");
    expect(chip.textContent).toContain("(1 error)");
    expect(chip.textContent).toContain("3.2s");
  });

  it("renders pluralized tool count correctly", () => {
    render(
      <WhyPanel
        message={msg({
          trace: [
            { kind: "tool_start", tool: "a" },
            { kind: "tool_end", tool: "a", status: "ok", duration_ms: 5 },
            { kind: "tool_start", tool: "b" },
            { kind: "tool_end", tool: "b", status: "ok", duration_ms: 7 },
          ],
        })}
      />,
    );
    expect(screen.getByText(/2 tools/)).toBeDefined();
  });

  it("shows usage summary when expanded", () => {
    render(
      <WhyPanel
        message={msg({
          trace: [
            { kind: "tool_start", tool: "a" },
            { kind: "tool_end", tool: "a", status: "ok", duration_ms: 5 },
          ],
          usage: { input_tokens: 1200, output_tokens: 80 },
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/1280 tokens/)).toBeDefined();
  });

  it("shows UI action payload in the trace", () => {
    render(
      <WhyPanel
        message={msg({
          trace: [
            { kind: "ui_action", payload: { colorBy: "gene", gene: "CD8A" } },
          ],
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/"gene":"CD8A"/)).toBeDefined();
  });
});
