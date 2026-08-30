export interface SseEvent {
  event: string;
  data: string;
}

interface ConsumeSseOptions {
  signal?: AbortSignal;
  idleTimeoutMs?: number;
}

export function parseSseEvent(rawEvent: string): SseEvent | null {
  const lines = rawEvent.replace(/\r\n|\r/g, "\n").split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return dataLines.length ? { event, data: dataLines.join("\n") } : null;
}

export function splitSseBuffer(buffer: string) {
  const normalized = buffer.replace(/\r\n|\r/g, "\n");
  const blocks = normalized.split("\n\n");
  return {
    events: blocks.slice(0, -1),
    remainder: blocks.at(-1) ?? ""
  };
}

export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void,
  options: ConsumeSseOptions = {}
) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  const idleTimeoutMs = options.idleTimeoutMs ?? 120_000;
  let buffer = "";
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  const cancelReader = () => {
    void reader.cancel(options.signal?.reason).catch(() => undefined);
  };
  const resetIdleTimer = () => {
    if (idleTimer !== null) {
      globalThis.clearTimeout(idleTimer);
    }
    if (idleTimeoutMs > 0) {
      idleTimer = globalThis.setTimeout(() => {
        timedOut = true;
        void reader.cancel().catch(() => undefined);
      }, idleTimeoutMs);
    }
  };

  options.signal?.addEventListener("abort", cancelReader, { once: true });
  if (options.signal?.aborted) {
    cancelReader();
  }
  resetIdleTimer();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      resetIdleTimer();
      buffer += decoder.decode(value, { stream: true });
      const { events, remainder } = splitSseBuffer(buffer);
      buffer = remainder;
      for (const rawEvent of events) {
        const event = parseSseEvent(rawEvent);
        if (event) {
          onEvent(event);
        }
      }
    }

    if (timedOut) {
      throw new Error("流式响应等待超时，请稍后重试。");
    }
    if (options.signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }

    buffer += decoder.decode();
    const finalEvent = parseSseEvent(buffer);
    if (finalEvent) {
      onEvent(finalEvent);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    if (idleTimer !== null) {
      globalThis.clearTimeout(idleTimer);
    }
    options.signal?.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}
