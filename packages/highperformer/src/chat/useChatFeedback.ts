import { useState } from "react";
import { chat } from "../api";
import type { MessageFeedback } from "./types";

export function useChatFeedback(
  slug: string,
  messageId: string,
  initial: MessageFeedback | null,
) {
  const [rating, setRating] = useState<"up" | "down" | null>(
    initial?.rating ?? null,
  );
  const [comment, setComment] = useState<string | null>(
    initial?.comment ?? null,
  );
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  async function setFeedback(next: MessageFeedback | null): Promise<void> {
    // Capture previous state for rollback.
    const prev = { rating, comment };
    setRating(next?.rating ?? null);
    setComment(next?.comment ?? null);
    setStatus("pending");
    try {
      if (next === null) {
        await chat.deleteFeedback(slug, messageId);
      } else {
        const persisted = await chat.putFeedback(slug, messageId, {
          rating: next.rating,
          comment: next.comment ?? null,
        });
        setRating(persisted.rating);
        setComment(persisted.comment ?? null);
      }
      setStatus("idle");
    } catch (err) {
      setRating(prev.rating);
      setComment(prev.comment);
      setStatus("error");
      throw err;
    }
  }

  return { rating, comment, setFeedback, status };
}
