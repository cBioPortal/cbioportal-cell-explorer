import { notification } from 'antd'
import { createApiClient } from '@cbioportal-cell-explorer/api-client/client'
import type { Middleware } from '@cbioportal-cell-explorer/api-client/client'

let lastNotification = 0
const NOTIFICATION_DEBOUNCE_MS = 5000

const authMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.status === 401) {
      // Dynamic import to avoid circular dependency (api.ts <- useAppStore.ts)
      const { default: useAppStore } = await import('./store/useAppStore')
      const { backendInfo } = useAppStore.getState()
      if (backendInfo?.auth_enabled) {
        useAppStore.setState({ user: null })
        const now = Date.now()
        if (now - lastNotification > NOTIFICATION_DEBOUNCE_MS) {
          lastNotification = now
          notification.info({
            message: 'Session expired',
            description: 'Please sign in again.',
            placement: 'topRight',
            duration: 4,
          })
        }
      }
    }
    return response
  },
}

export const api = createApiClient()
api.use(authMiddleware)

import { parseNdjson } from "./chat/ndjsonParser";
import {
  HttpError,
  type ChatEvent,
  type ContextResponse,
  type WireMessage,
} from "./chat/types";

export const chat = {
  async getContext(slug: string, signal?: AbortSignal): Promise<ContextResponse> {
    const res = await fetch(`/api/chat/${encodeURIComponent(slug)}/context`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new HttpError(res.status, await res.text());
    return (await res.json()) as ContextResponse;
  },

  async *streamTurn(
    slug: string,
    messages: WireMessage[],
    viewState: import("./chat/viewStateSnapshot").ViewStateSnapshot,
    signal: AbortSignal,
  ): AsyncIterable<ChatEvent> {
    const res = await fetch(`/api/chat/${encodeURIComponent(slug)}/turns`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, view_state: viewState }),
      signal,
    });
    if (!res.ok) throw new HttpError(res.status, await res.text());
    if (!res.body) throw new Error("empty response body");
    yield* parseNdjson<ChatEvent>(res.body);
  },
};
