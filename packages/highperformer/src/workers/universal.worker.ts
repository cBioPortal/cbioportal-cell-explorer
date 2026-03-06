import { WorkerMessageSchema } from './colorBuffer.schemas'
import { SelectionMessageSchema } from './selection.schemas'
import { SummaryMessageSchema } from './summary.schemas'
import { handleColorBufferMessage } from './colorBuffer.handler'
import { handleSelectionMessage } from './selection.handler'
import { handleSummaryMessage } from './summary.handler'
import { z } from 'zod'

const UnifiedMessageSchema = z.union([WorkerMessageSchema, SelectionMessageSchema, SummaryMessageSchema])

const workerSelf = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null
  postMessage(message: unknown, transfer: Transferable[]): void
}

workerSelf.onmessage = (e: MessageEvent) => {
  const { _poolTaskId, ...rest } = e.data

  const result = UnifiedMessageSchema.safeParse(rest)
  if (!result.success) {
    console.warn('universal worker: invalid message', result.error)
    return
  }

  const msg = result.data

  if (msg.type === 'pointsInPolygon') {
    const response = handleSelectionMessage(msg)
    workerSelf.postMessage(
      { ...response, _poolTaskId },
      [response.indices.buffer] as Transferable[],
    )
    return
  }

  // Summary messages
  if (msg.type === 'summarizeCategory' || msg.type === 'summarizeExpression') {
    const response = handleSummaryMessage(msg)
    if (response.type === 'categorySummary') {
      workerSelf.postMessage(
        { ...response, _poolTaskId },
        [response.counts.buffer] as Transferable[],
      )
    } else {
      workerSelf.postMessage(
        { ...response, _poolTaskId },
        [response.bins.buffer, response.binEdges.buffer] as Transferable[],
      )
    }
    return
  }

  // Color buffer messages
  const response = handleColorBufferMessage(msg)
  workerSelf.postMessage(
    { ...response, _poolTaskId },
    [response.buffer.buffer] as Transferable[],
  )
}
