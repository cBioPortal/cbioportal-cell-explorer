/**
 * Parse a binary stream of `\n`-terminated UTF-8 JSON lines into objects.
 *
 * Buffers a partial trailing line until the next chunk arrives. Closes
 * cleanly on stream end (parses any non-empty final buffer). Underlying
 * stream errors (including AbortError) propagate through the iterator.
 */
export async function* parseNdjson<T = unknown>(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<T> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.length > 0) yield JSON.parse(line) as T;
      }
    }
    // Flush any remaining decoder state and a final unterminated line.
    buffer += decoder.decode();
    if (buffer.length > 0) yield JSON.parse(buffer) as T;
  } finally {
    reader.releaseLock();
  }
}
