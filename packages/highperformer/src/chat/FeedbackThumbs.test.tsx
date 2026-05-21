import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeedbackThumbs } from "./FeedbackThumbs";

afterEach(() => cleanup());

describe("FeedbackThumbs", () => {
  it("renders both thumbs in neutral state when rating is null", () => {
    const onChange = vi.fn();
    render(<FeedbackThumbs rating={null} comment={null} onChange={onChange} />);
    expect(screen.getByRole("button", { name: /thumbs up/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /thumbs down/i })).toBeDefined();
    // No comment box in null state.
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("clicking thumb-up calls onChange with rating up", () => {
    const onChange = vi.fn();
    render(<FeedbackThumbs rating={null} comment={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/i }));
    expect(onChange).toHaveBeenCalledWith({ rating: "up", comment: null });
  });

  it("clicking the active thumb-up clears the rating", () => {
    const onChange = vi.fn();
    render(<FeedbackThumbs rating="up" comment={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("renders the comment textarea when rating is down", () => {
    const onChange = vi.fn();
    render(<FeedbackThumbs rating="down" comment={null} onChange={onChange} />);
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("sending a comment calls onChange with rating down + comment", () => {
    const onChange = vi.fn();
    render(<FeedbackThumbs rating="down" comment={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "off-topic answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onChange).toHaveBeenLastCalledWith({
      rating: "down",
      comment: "off-topic answer",
    });
  });

  it("disabled prop disables both thumbs and the textarea", () => {
    const onChange = vi.fn();
    render(
      <FeedbackThumbs rating="down" comment="" onChange={onChange} disabled />,
    );
    expect(screen.getByRole("button", { name: /thumbs up/i })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: /thumbs down/i })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("textbox")).toHaveProperty("disabled", true);
  });

  it("Send is disabled when textarea is empty and no comment is saved", () => {
    const onChange = vi.fn();
    render(<FeedbackThumbs rating="down" comment={null} onChange={onChange} />);
    expect(screen.getByRole("button", { name: /send/i })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("Send re-enables when the user types", () => {
    const onChange = vi.fn();
    render(<FeedbackThumbs rating="down" comment={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    expect(screen.getByRole("button", { name: /send/i })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("Send greys out after a successful save (draft matches saved comment)", () => {
    // Simulate the post-save state: the saved comment now matches the draft
    // the user typed. The Send button should disable on its own.
    const onChange = vi.fn();
    render(
      <FeedbackThumbs
        rating="down"
        comment="off-topic answer"
        onChange={onChange}
      />,
    );
    // Local draft initialized to "off-topic answer" via useState(comment ?? "")
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "off-topic answer" },
    });
    expect(screen.getByRole("button", { name: /send/i })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("Send re-enables when the user clears a previously-saved comment", () => {
    // After clearing the textarea, draft="" → null, saved="text" → "text".
    // Sending now would null out the saved comment, which is a legitimate change.
    const onChange = vi.fn();
    render(
      <FeedbackThumbs
        rating="down"
        comment="off-topic answer"
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(screen.getByRole("button", { name: /send/i })).toHaveProperty(
      "disabled",
      false,
    );
  });
});
