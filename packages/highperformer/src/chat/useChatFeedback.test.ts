import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useChatFeedback } from "./useChatFeedback";
import { chat } from "../api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useChatFeedback", () => {
  it("starts with the seeded rating + comment", () => {
    const { result } = renderHook(() =>
      useChatFeedback("slug", "msg-1", { rating: "up", comment: null }),
    );
    expect(result.current.rating).toBe("up");
    expect(result.current.comment).toBeNull();
  });

  it("setRating('up') calls chat.putFeedback and updates state", async () => {
    const putSpy = vi
      .spyOn(chat, "putFeedback")
      .mockResolvedValue({ rating: "up", comment: null });
    const { result } = renderHook(() => useChatFeedback("slug", "msg-1", null));
    await act(async () => {
      await result.current.setFeedback({ rating: "up", comment: null });
    });
    expect(putSpy).toHaveBeenCalledWith(
      "slug",
      "msg-1",
      { rating: "up", comment: null },
    );
    expect(result.current.rating).toBe("up");
  });

  it("setFeedback(null) calls chat.deleteFeedback and clears state", async () => {
    const deleteSpy = vi.spyOn(chat, "deleteFeedback").mockResolvedValue();
    const { result } = renderHook(() =>
      useChatFeedback("slug", "msg-1", { rating: "up", comment: null }),
    );
    await act(async () => {
      await result.current.setFeedback(null);
    });
    expect(deleteSpy).toHaveBeenCalledWith("slug", "msg-1");
    expect(result.current.rating).toBeNull();
  });

  it("reverts optimistic state on API failure", async () => {
    vi.spyOn(chat, "putFeedback").mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useChatFeedback("slug", "msg-1", null));
    await act(async () => {
      await result.current
        .setFeedback({ rating: "up", comment: null })
        .catch(() => {});
    });
    // Reverted to initial null.
    expect(result.current.rating).toBeNull();
  });
});
