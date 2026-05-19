import { useCallback, useRef, useState } from "react";
import { chat } from "../api";
import type { ChatEvent, WireMessage } from "./types";
import { buildViewStateSnapshot } from "./viewStateSnapshot";

export function useChatTurn() {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (
      slug: string,
      messages: WireMessage[],
      threadId: string | null,
      onEvent: (e: ChatEvent) => void,
    ): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      try {
        // Capture state snapshot at send time. Only non-default fields are
        // included; agent uses this to answer relative queries ("zoom in
        // more", "change to a different gene") without a tool round-trip.
        const viewState = buildViewStateSnapshot();
        for await (const ev of chat.streamTurn(slug, messages, viewState, threadId, controller.signal)) {
          onEvent(ev);
        }
      } catch (e) {
        if (controller.signal.aborted) {
          // User-initiated cancel. Surface as a friendly error event via
          // onEvent — don't bubble the raw browser AbortError text
          // ("BodyStreamBuffer was aborted" / "signal is aborted without
          // reason") to the user.
          onEvent({ type: "error", message: "Cancelled", retryable: false });
          return;
        }
        throw e;
      } finally {
        setStreaming(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { streaming, start, stop };
}
