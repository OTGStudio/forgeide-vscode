import type { ChatMessage, StreamChunk } from './AIRouter';

const DEFAULT_BASE = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5-coder:7b-instruct';

export class OllamaClient {
  async healthCheck(baseUrl: string = DEFAULT_BASE): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (c: StreamChunk) => void,
    model: string = DEFAULT_MODEL,
    baseUrl: string = DEFAULT_BASE,
  ): Promise<void> {
    console.log('[Ollama] Sending chat request', { model, messageCount: messages.length });

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    console.log('[Ollama] Response status:', res.status);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Ollama error ${res.status}: ${errBody}`);
    }
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      for (const line of text.split('\n').filter(Boolean)) {
        try {
          const obj = JSON.parse(line);
          chunkCount++;
          if (chunkCount === 1) console.log('[Ollama] First chunk received');
          onChunk({
            content: obj.message?.content ?? '',
            done: obj.done ?? false,
          });
        } catch {
          /* skip malformed lines */
        }
      }
    }

    console.log('[Ollama] Stream complete, total chunks:', chunkCount);
  }
}
