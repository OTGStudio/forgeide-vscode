import { OllamaClient } from './OllamaClient';
import { ClaudeClient } from './ClaudeClient';

export type RoutingMode = 'local' | 'cloud' | 'local-first';
export type StreamChunk = { content: string; done: boolean };

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ModelConfig {
  ollamaModel: string;
  claudeModel: string;
  ollamaBaseUrl: string;
}

export class AIRouter {
  private ollama = new OllamaClient();
  private claude: ClaudeClient;

  constructor(apiKey: string = '') {
    this.claude = new ClaudeClient(apiKey);
  }

  setApiKey(key: string): void {
    this.claude.setApiKey(key);
  }

  async chat(
    messages: ChatMessage[],
    mode: RoutingMode,
    onChunk: (chunk: StreamChunk) => void,
    config?: ModelConfig,
  ): Promise<void> {
    const ollamaModel = config?.ollamaModel ?? 'qwen2.5-coder:7b-instruct';
    const claudeModel = config?.claudeModel ?? 'claude-sonnet-4-6';
    const baseUrl = config?.ollamaBaseUrl ?? 'http://localhost:11434';

    if (mode === 'local') {
      await this.ollama.chatStream(messages, onChunk, ollamaModel, baseUrl);
      return;
    }
    if (mode === 'cloud') {
      await this.claude.chatStream(messages, onChunk, claudeModel);
      return;
    }
    // local-first: try Ollama, fall back to Claude on error
    try {
      const online = await this.ollama.healthCheck(baseUrl);
      if (online) {
        await this.ollama.chatStream(messages, onChunk, ollamaModel, baseUrl);
        return;
      }
    } catch {
      /* fall through */
    }
    await this.claude.chatStream(messages, onChunk, claudeModel);
  }

  async ollamaStatus(baseUrl?: string): Promise<'online' | 'offline'> {
    return (await this.ollama.healthCheck(baseUrl)) ? 'online' : 'offline';
  }
}
