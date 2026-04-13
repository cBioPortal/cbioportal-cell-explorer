import createClient from 'openapi-fetch'
import type { paths } from './index'

export type ApiClient = ReturnType<typeof createClient<paths>>

export function createApiClient(baseUrl = '/'): ApiClient {
  return createClient<paths>({ baseUrl })
}

export type { paths, components } from './index'
