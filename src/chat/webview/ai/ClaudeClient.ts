import type { ChatMessage, StreamChunk } from './AIRouter';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export class ClaudeClient {
  constructor(private apiKey: string = '') {}

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (c: StreamChunk) => void,
    model: string = DEFAULT_MODEL,
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error('No Anthropic API key configured. Set it in VS Code Settings or via the ForgeIDE panel.');
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        stream: true,
        messages: messages.filter((m) => m.role !== 'system'),
        system: messages.find((m) => m.role === 'system')?.content,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error ${res.status}: ${err}`);
    }
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          onChunk({ content: '', done: true });
          return;
        }
        try {
          const obj = JSON.parse(data);
          if (obj.type === 'content_block_delta') {
            const content = obj.delta?.text ?? '';
            if (content) onChunk({ content, done: false });
          } else if (obj.type === 'message_stop') {
            onChunk({ content: '', done: true });
          }
        } catch {
          /* skip */
        }
      }
    }
  }
}
