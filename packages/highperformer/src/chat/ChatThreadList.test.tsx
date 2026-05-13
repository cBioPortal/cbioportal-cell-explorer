import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChatThreadList } from "./ChatThreadList";
import { chat } from "../api";

vi.mock("../api", () => ({
  chat: {
    listThreads: vi.fn(),
    deleteThread: vi.fn(),
  },
}));

describe("ChatThreadList", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    (chat.listThreads as any).mockReset();
    (chat.deleteThread as any).mockReset();
  });

  it("renders rows from listThreads", async () => {
    (chat.listThreads as any).mockResolvedValue({
      threads: [
        { id: "t1", title: "Show CD8A", created_at: "2026-05-11T10:00:00Z",
          updated_at: "2026-05-11T10:05:00Z", message_count: 4 },
        { id: "t2", title: "What are clusters", created_at: "2026-05-10T09:00:00Z",
          updated_at: "2026-05-10T09:00:00Z", message_count: 2 },
      ],
    });
    render(<ChatThreadList slug="demo" onSelect={() => {}} onNew={() => {}} />);
    await waitFor(() => expect(screen.getByText("Show CD8A")).toBeDefined());
    expect(screen.getByText("What are clusters")).toBeDefined();
  });

  it("renders empty state when zero threads", async () => {
    (chat.listThreads as any).mockResolvedValue({ threads: [] });
    render(<ChatThreadList slug="demo" onSelect={() => {}} onNew={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText(/no conversations yet/i)).toBeDefined()
    );
  });

  it("calls onSelect when a row is clicked", async () => {
    (chat.listThreads as any).mockResolvedValue({
      threads: [
        { id: "t1", title: "Hello", created_at: "2026-05-11T10:00:00Z",
          updated_at: "2026-05-11T10:00:00Z", message_count: 1 },
      ],
    });
    const onSelect = vi.fn();
    render(<ChatThreadList slug="demo" onSelect={onSelect} onNew={() => {}} />);
    await waitFor(() => screen.getByText("Hello"));
    fireEvent.click(screen.getByText("Hello"));
    expect(onSelect).toHaveBeenCalledWith("t1");
  });

  it("calls onNew when + New chat is clicked", async () => {
    (chat.listThreads as any).mockResolvedValue({ threads: [] });
    const onNew = vi.fn();
    render(<ChatThreadList slug="demo" onSelect={() => {}} onNew={onNew} />);
    await waitFor(() => screen.getByText(/no conversations/i));
    const buttons = screen.getAllByRole("button", { name: /new chat/i });
    fireEvent.click(buttons[0]);
    expect(onNew).toHaveBeenCalled();
  });

  it("deletes a thread after confirm and refetches", async () => {
    (chat.listThreads as any)
      .mockResolvedValueOnce({
        threads: [
          { id: "t1", title: "Doomed", created_at: "2026-05-11T10:00:00Z",
            updated_at: "2026-05-11T10:00:00Z", message_count: 1 },
        ],
      })
      .mockResolvedValueOnce({ threads: [] });
    (chat.deleteThread as any).mockResolvedValue(undefined);
    render(<ChatThreadList slug="demo" onSelect={() => {}} onNew={() => {}} />);
    await waitFor(() => screen.getByText("Doomed"));

    const deleteBtns = screen.getAllByRole("button", { name: /delete thread/i });
    fireEvent.click(deleteBtns[0]);

    // antd Modal.confirm renders in a portal; click the OK button to confirm.
    await waitFor(() => screen.getByText(/^delete$/i));
    fireEvent.click(screen.getByText(/^delete$/i));

    await waitFor(() => expect(chat.deleteThread).toHaveBeenCalledWith("demo", "t1"));
    await waitFor(() => expect(screen.queryByText("Doomed")).toBeNull());
  });
});
