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
