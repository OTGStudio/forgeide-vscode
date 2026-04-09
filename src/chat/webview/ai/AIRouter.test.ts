import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock instances — accessible to tests
const ollamaMock = {
  healthCheck: vi.fn().mockResolvedValue(true),
  chatStream: vi.fn().mockResolvedValue(undefined),
};

const claudeMock = {
  setApiKey: vi.fn(),
  chatStream: vi.fn().mockResolvedValue(undefined),
};

// Mock the client modules with class constructors
vi.mock('./OllamaClient', () => ({
  OllamaClient: class { healthCheck = ollamaMock.healthCheck; chatStream = ollamaMock.chatStream; },
}));

vi.mock('./ClaudeClient', () => ({
  ClaudeClient: class { constructor(_key?: string) {} setApiKey = claudeMock.setApiKey; chatStream = claudeMock.chatStream; },
}));

import { AIRouter } from './AIRouter';

const testMessages = [
  { role: 'system' as const, content: 'You are ForgeIDE.\n\nRelevant patterns:\n- Object Pool' },
  { role: 'user' as const, content: 'How do I pool bullets?' },
];
const noop = () => {};
const config = { ollamaModel: 'test-model', claudeModel: 'test-claude', ollamaBaseUrl: 'http://localhost:11434' };

describe('AI Routing — does the message reach the right backend?', () => {
  let router: AIRouter;

  beforeEach(() => {
    ollamaMock.healthCheck.mockReset().mockResolvedValue(true);
    ollamaMock.chatStream.mockReset().mockResolvedValue(undefined);
    claudeMock.setApiKey.mockReset();
    claudeMock.chatStream.mockReset().mockResolvedValue(undefined);
    router = new AIRouter();
  });

  it('local mode sends to Ollama, not Claude', async () => {
    await router.chat(testMessages, 'local', noop, config);

    expect(ollamaMock.chatStream).toHaveBeenCalledOnce();
    expect(claudeMock.chatStream).not.toHaveBeenCalled();
  });

  it('cloud mode sends to Claude, not Ollama', async () => {
    await router.chat(testMessages, 'cloud', noop, config);

    expect(claudeMock.chatStream).toHaveBeenCalledOnce();
    expect(ollamaMock.chatStream).not.toHaveBeenCalled();
  });

  it('local-first mode sends to Ollama when it is online', async () => {
    ollamaMock.healthCheck.mockResolvedValue(true);

    await router.chat(testMessages, 'local-first', noop, config);

    expect(ollamaMock.healthCheck).toHaveBeenCalled();
    expect(ollamaMock.chatStream).toHaveBeenCalledOnce();
    expect(claudeMock.chatStream).not.toHaveBeenCalled();
  });

  it('local-first mode falls back to Claude when Ollama is offline', async () => {
    ollamaMock.healthCheck.mockResolvedValue(false);

    await router.chat(testMessages, 'local-first', noop, config);

    expect(ollamaMock.healthCheck).toHaveBeenCalled();
    expect(ollamaMock.chatStream).not.toHaveBeenCalled();
    expect(claudeMock.chatStream).toHaveBeenCalledOnce();
  });

  it('local-first falls back to Claude when Ollama health check throws', async () => {
    ollamaMock.healthCheck.mockRejectedValue(new Error('Connection refused'));

    await router.chat(testMessages, 'local-first', noop, config);

    expect(claudeMock.chatStream).toHaveBeenCalledOnce();
  });

  it('passes the full message array including system prompt to the backend', async () => {
    await router.chat(testMessages, 'local', noop, config);

    const passedMessages = ollamaMock.chatStream.mock.calls[0][0];
    expect(passedMessages[0].role).toBe('system');
    expect(passedMessages[0].content).toContain('Object Pool');
  });
});
