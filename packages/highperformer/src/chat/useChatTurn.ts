import { useCallback, useRef, useState } from "react";
import { chat } from "../api";
import type { ChatEvent, WireMessage } from "./types";

export function useChatTurn() {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (
      slug: string,
      messages: WireMessage[],
      onEvent: (e: ChatEvent) => void,
    ): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      try {
        for await (const ev of chat.streamTurn(slug, messages, controller.signal)) {
          onEvent(ev);
        }
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
