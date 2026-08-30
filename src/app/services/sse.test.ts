import { describe, expect, it } from "vitest";
import { consumeSseStream, parseSseEvent, splitSseBuffer, type SseEvent } from "@/app/services/sse";

const encoder = new TextEncoder();

function streamFromChunks(chunks: string[]) {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
      } else {
        controller.close();
      }
    }
  });
}

describe("SSE parsing", () => {
  it("parses CRLF and multiline data according to event boundaries", () => {
    expect(parseSseEvent("event: delta\r\ndata: first\r\ndata: second")).toEqual({
      event: "delta",
      data: "first\nsecond"
    });
    expect(splitSseBuffer("data: one\r\n\r\ndata: two\r\n")).toEqual({
      events: ["data: one"],
      remainder: "data: two\n"
    });
  });

  it("handles delimiters split across network chunks and flushes the final event at EOF", async () => {
    const events: SseEvent[] = [];
    const body = streamFromChunks([
      "event: delta\r\ndata: {\"delta\":\"你\"}\r",
      "\n\r\nevent: completed\rdata: {\"ok\":true}"
    ]);

    await consumeSseStream(body, (event) => events.push(event), { idleTimeoutMs: 0 });

    expect(events).toEqual([
      { event: "delta", data: "{\"delta\":\"你\"}" },
      { event: "completed", data: "{\"ok\":true}" }
    ]);
  });

  it("ends with an AbortError when the caller cancels", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      consumeSseStream(streamFromChunks([]), () => undefined, {
        signal: controller.signal,
        idleTimeoutMs: 0
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
