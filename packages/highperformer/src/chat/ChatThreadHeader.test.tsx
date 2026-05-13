import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ChatThreadHeader } from "./ChatThreadHeader";

describe("ChatThreadHeader", () => {
  afterEach(() => cleanup());

  it("renders the title when one is provided", () => {
    render(<ChatThreadHeader title="My thread" onBack={() => {}} />);
    expect(screen.getByText("My thread")).toBeDefined();
  });

  it("renders 'New chat' when title is null (new mode)", () => {
    render(<ChatThreadHeader title={null} onBack={() => {}} />);
    expect(screen.getByText(/new chat/i)).toBeDefined();
  });

  it("calls onBack when the back button is clicked", () => {
    const onBack = vi.fn();
    render(<ChatThreadHeader title="Some thread" onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
