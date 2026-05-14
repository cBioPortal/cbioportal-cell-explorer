/**
 * Feedback thumbs — presentational thumbs-up/down control for assistant
 * messages. Pure UI: takes the current rating + comment and an onChange
 * callback. The hook that wires this to the API lives in useMessageFeedback
 * (Task 9); integration into AssistantBubble is Task 10.
 *
 * Behavior:
 * - Clicking an inactive thumb selects it (emits {rating, comment: null}).
 * - Clicking the active thumb clears the rating (emits null).
 * - Selecting thumb-down reveals an optional comment textbox; pressing Enter
 *   or Send emits the rating + comment.
 */
import {
  LikeOutlined,
  LikeFilled,
  DislikeOutlined,
  DislikeFilled,
} from "@ant-design/icons";
import { Button, Input } from "antd";
import { useState } from "react";
import type { MessageFeedback } from "./types";

export type FeedbackThumbsProps = {
  rating: "up" | "down" | null;
  comment: string | null;
  onChange: (next: MessageFeedback | null) => void;
  disabled?: boolean;
};

export function FeedbackThumbs({
  rating,
  comment,
  onChange,
  disabled,
}: FeedbackThumbsProps) {
  const [draft, setDraft] = useState(comment ?? "");

  const handleUp = () => {
    if (rating === "up") {
      onChange(null);
    } else {
      onChange({ rating: "up", comment: null });
    }
  };

  const handleDown = () => {
    if (rating === "down") {
      onChange(null);
      setDraft("");
    } else {
      onChange({ rating: "down", comment: null });
    }
  };

  const sendComment = () => {
    onChange({ rating: "down", comment: draft.trim() || null });
  };

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <span style={{ display: "inline-flex", gap: 4 }}>
        <Button
          aria-label="thumbs up"
          size="small"
          type="text"
          disabled={disabled}
          icon={rating === "up" ? <LikeFilled /> : <LikeOutlined />}
          onClick={handleUp}
        />
        <Button
          aria-label="thumbs down"
          size="small"
          type="text"
          disabled={disabled}
          icon={rating === "down" ? <DislikeFilled /> : <DislikeOutlined />}
          onClick={handleDown}
        />
      </span>
      {rating === "down" && (
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <Input
            size="small"
            placeholder="What was wrong? (optional)"
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onPressEnter={sendComment}
            style={{ width: 200 }}
          />
          <Button size="small" disabled={disabled} onClick={sendComment}>
            Send
          </Button>
        </span>
      )}
    </span>
  );
}
