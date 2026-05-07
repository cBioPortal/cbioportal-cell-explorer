import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";
import * as useChatContextModule from "./useChatContext";
import * as useChatTurnModule from "./useChatTurn";
import type { ChatEvent, ContextResponse } from "./types";

vi.mock("../store/useAppStore", () => ({
  useAppStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({ applyConfig: vi.fn() }),
    { getState: () => ({ applyConfig: vi.fn() }) },
  ),
}));

const sampleCtx: ContextResponse = {
  slug: "spectrum",
  name: "Spectrum",
  description: "test",
  n_obs: 100,
  n_var: 10,
  obs_columns: [
    { name: "cell_type", dtype: "categorical", cardinality: 3, values: ["T", "B", "M"] },
  ],
  embedding_keys: ["X_umap"],
  available_tools: ["top_expressed_genes"],
};

const startMock = vi.fn();
const stopMock = vi.fn();

beforeEach(() => {
  vi.spyOn(useChatContextModule, "useChatContext").mockReturnValue({
    data: sampleCtx,
    error: undefined,
    loading: false,
  });
  vi.spyOn(useChatTurnModule, "useChatTurn").mockReturnValue({
    streaming: false,
    start: startMock,
    stop: stopMock,
  });
  startMock.mockReset();
  stopMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChatPanel", () => {
  it("renders empty state with chips when history is empty", () => {
    render(<ChatPanel slug="spectrum" />);
    expect(screen.getByText(/Spectrum/)).toBeDefined();
    expect(screen.getByText(/Top genes in T/)).toBeDefined();
    expect(screen.getByPlaceholderText(/Ask anything/i)).toBeDefined();
  });

  it("clicking a chip fills the input", () => {
    render(<ChatPanel slug="spectrum" />);
    const chip = screen.getByText(/Top genes in T/);
    fireEvent.click(chip);
    const input = screen.getByPlaceholderText(/Ask anything/i) as HTMLInputElement;
    expect(input.value).toMatch(/Top genes in T/i);
  });

  it("submitting calls useChatTurn.start with the user message appended", async () => {
    render(<ChatPanel slug="spectrum" />);
    const input = screen.getByPlaceholderText(/Ask anything/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
    const [slug, messages] = startMock.mock.calls[0];
    expect(slug).toBe("spectrum");
    expect(messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("renders an error bubble with Retry when an error event is dispatched", async () => {
    let dispatch: ((e: ChatEvent) => void) | null = null;
    startMock.mockImplementation(async (_s, _m, onEvent) => {
      dispatch = onEvent;
    });
    render(<ChatPanel slug="spectrum" />);
    const input = screen.getByPlaceholderText(/Ask anything/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hi" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(startMock).toHaveBeenCalled());
    dispatch!({ type: "text_delta", text: "partial " });
    dispatch!({ type: "error", message: "boom", retryable: false });
    await waitFor(() => expect(screen.getByText(/boom/)).toBeDefined());
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2));
    const [, messages] = startMock.mock.calls[1];
    expect(messages).toEqual([{ role: "user", content: "hi" }]);
  });
});
