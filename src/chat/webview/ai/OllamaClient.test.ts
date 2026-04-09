import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient } from './OllamaClient';

// Helper to create a mock ReadableStream from NDJSON lines
function mockStreamResponse(lines: string[], status = 200): Response {
  const text = lines.join('\n') + '\n';
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    body: stream,
    text: async () => text,
  } as unknown as Response;
}

describe('Ollama — do I get streaming responses from my local model?', () => {
  let client: OllamaClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new OllamaClient();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('health check returns true when Ollama is running', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    expect(await client.healthCheck()).toBe(true);
  });

  it('health check returns false when Ollama is down', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await client.healthCheck()).toBe(false);
  });

  it('health check returns false on timeout', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    expect(await client.healthCheck()).toBe(false);
  });

  it('chatStream delivers chunks in order', async () => {
    const lines = [
      JSON.stringify({ message: { content: 'Hello' }, done: false }),
      JSON.stringify({ message: { content: ' world' }, done: false }),
      JSON.stringify({ message: { content: '' }, done: true }),
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(mockStreamResponse(lines));

    const chunks: string[] = [];
    await client.chatStream(
      [{ role: 'user', content: 'hi' }],
      (c) => chunks.push(c.content),
    );

    expect(chunks).toEqual(['Hello', ' world', '']);
  });

  it('chatStream signals done on final chunk', async () => {
    const lines = [
      JSON.stringify({ message: { content: 'done' }, done: true }),
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(mockStreamResponse(lines));

    let gotDone = false;
    await client.chatStream(
      [{ role: 'user', content: 'hi' }],
      (c) => { if (c.done) gotDone = true; },
    );

    expect(gotDone).toBe(true);
  });

  it('chatStream handles malformed JSON lines without crashing', async () => {
    const lines = [
      'not valid json',
      JSON.stringify({ message: { content: 'ok' }, done: false }),
      '}{broken}{',
      JSON.stringify({ message: { content: '' }, done: true }),
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(mockStreamResponse(lines));

    const chunks: string[] = [];
    await client.chatStream(
      [{ role: 'user', content: 'hi' }],
      (c) => chunks.push(c.content),
    );

    // Only the valid lines should produce chunks
    expect(chunks).toEqual(['ok', '']);
  });

  it('chatStream throws on non-200 response with error details', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as unknown as Response);

    await expect(
      client.chatStream([{ role: 'user', content: 'hi' }], () => {}),
    ).rejects.toThrow('Ollama error 500');
  });
});
