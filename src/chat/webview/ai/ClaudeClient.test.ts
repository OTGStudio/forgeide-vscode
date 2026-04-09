import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeClient } from './ClaudeClient';

// Helper to create a mock SSE stream response
function mockSSEResponse(events: string[], status = 200): Response {
  const text = events.join('\n') + '\n';
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

describe('Claude — do I get streaming responses when I have an API key?', () => {
  let client: ClaudeClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new ClaudeClient('sk-ant-test-key');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws if no API key is set', async () => {
    const noKeyClient = new ClaudeClient('');

    await expect(
      noKeyClient.chatStream([{ role: 'user', content: 'hi' }], () => {}),
    ).rejects.toThrow('No Anthropic API key');
  });

  it('sends API key in x-api-key header', async () => {
    const events = [
      'data: ' + JSON.stringify({ type: 'message_stop' }),
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(mockSSEResponse(events));

    await client.chatStream([{ role: 'user', content: 'hi' }], () => {});

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = fetchCall[1].headers;
    expect(headers['x-api-key']).toBe('sk-ant-test-key');
  });

  it('extracts text from content_block_delta events', async () => {
    const events = [
      'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { text: 'Hello' } }),
      'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { text: ' world' } }),
      'data: ' + JSON.stringify({ type: 'message_stop' }),
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(mockSSEResponse(events));

    const chunks: string[] = [];
    await client.chatStream(
      [{ role: 'user', content: 'hi' }],
      (c) => { if (c.content) chunks.push(c.content); },
    );

    expect(chunks).toEqual(['Hello', ' world']);
  });

  it('signals done on message_stop event', async () => {
    const events = [
      'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { text: 'hi' } }),
      'data: ' + JSON.stringify({ type: 'message_stop' }),
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(mockSSEResponse(events));

    let gotDone = false;
    await client.chatStream(
      [{ role: 'user', content: 'hi' }],
      (c) => { if (c.done) gotDone = true; },
    );

    expect(gotDone).toBe(true);
  });

  it('handles [DONE] marker', async () => {
    const events = [
      'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { text: 'ok' } }),
      'data: [DONE]',
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(mockSSEResponse(events));

    let gotDone = false;
    await client.chatStream(
      [{ role: 'user', content: 'hi' }],
      (c) => { if (c.done) gotDone = true; },
    );

    expect(gotDone).toBe(true);
  });

  it('extracts system message from messages array and sends as separate field', async () => {
    const events = [
      'data: ' + JSON.stringify({ type: 'message_stop' }),
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(mockSSEResponse(events));

    await client.chatStream(
      [
        { role: 'system', content: 'You are ForgeIDE with KB context' },
        { role: 'user', content: 'help me' },
      ],
      () => {},
    );

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    // System message should NOT be in the messages array
    expect(body.messages.every((m: { role: string }) => m.role !== 'system')).toBe(true);
    // System content should be in the top-level system field
    expect(body.system).toBe('You are ForgeIDE with KB context');
  });

  it('throws on non-200 response with error body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key',
    } as unknown as Response);

    await expect(
      client.chatStream([{ role: 'user', content: 'hi' }], () => {}),
    ).rejects.toThrow('Claude API error 401');
  });
});
