import { WorkerMessageSchema } from './colorBuffer.schemas'
import { handleColorBufferMessage } from './colorBuffer.handler'

const workerSelf = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null
  postMessage(message: unknown, transfer: Transferable[]): void
}

workerSelf.onmessage = (e: MessageEvent) => {
  const { _poolTaskId, ...rest } = e.data

  const result = WorkerMessageSchema.safeParse(rest)
  if (!result.success) {
    console.warn('universal worker: invalid message', result.error)
    return
  }

  const response = handleColorBufferMessage(result.data)
  workerSelf.postMessage(
    { ...response, _poolTaskId },
    [response.buffer.buffer] as Transferable[],
  )
}
