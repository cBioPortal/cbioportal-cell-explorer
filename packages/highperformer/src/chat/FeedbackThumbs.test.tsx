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
});
