import { useState, useEffect, useCallback, useRef } from 'react';
import { useVSCodeBridge } from './useVSCodeBridge';
import { ChatMessage, ChatInput } from './components';
import { AIRouter } from './ai/AIRouter';
import type { RoutingMode } from './ai/AIRouter';

interface Config {
  ollamaBaseUrl: string;
  ollamaModel: string;
  routingMode: RoutingMode;
}

interface Message { role: 'user' | 'assistant'; content: string; }

export function App() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [config, setConfig]           = useState<Config | null>(null);
  const [workspace, setWorkspace]     = useState<string | null>(null);
  const [isStreaming, setIsStreaming]  = useState(false);
  const [pendingKb, setPendingKb]     = useState<string | null>(null);
  const [apiKey, setApiKey]           = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [routingMode, setRoutingMode] = useState<RoutingMode>('local-first');

  const routerRef = useRef(new AIRouter());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback((msg: Record<string, unknown>) => {
    if (msg.type === 'config') {
      setConfig({
        ollamaBaseUrl: msg.ollamaBaseUrl as string,
        ollamaModel: msg.ollamaModel as string,
        routingMode: msg.routingMode as RoutingMode,
      });
      setRoutingMode(msg.routingMode as RoutingMode);
    }
    if (msg.type === 'workspace') setWorkspace(msg.path as string | null);
    if (msg.type === 'secret') {
      const key = msg.key as string | null;
      setApiKey(key);
      if (key) routerRef.current.setApiKey(key);
    }
    if (msg.type === 'kb_results') {
      const results = msg.results as Array<{ pattern: { name: string; summary: string } }>;
      if (results.length > 0) {
        const ctx = results.map(r => `- **${r.pattern.name}**: ${r.pattern.summary}`).join('\n');
        setPendingKb(ctx);
      }
    }
  }, []);

  const { send } = useVSCodeBridge(handleMessage);

  useEffect(() => {
    send({ type: 'get_config' });
    send({ type: 'get_secret' });
    send({ type: 'get_workspace' });
  }, [send]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!config) return;

    // Request KB results
    send({ type: 'kb_search', query: text });

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    // Build system prompt with KB context if available
    const kbContext = pendingKb
      ? `\n\nRelevant game design patterns:\n${pendingKb}`
      : '';
    const systemPrompt = `You are ForgeIDE, a game development AI assistant specialized in Unity, Unreal Engine, and Godot.${kbContext}${workspace ? `\n\nCurrent workspace: ${workspace}` : ''}`;
    setPendingKb(null);

    try {
      await routerRef.current.chat(
        [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.content),
          { role: 'user', content: text },
        ],
        routingMode,
        (chunk) => {
          if (!chunk.done) {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + chunk.content,
              };
              return updated;
            });
          }
        },
        { ollamaBaseUrl: config.ollamaBaseUrl, ollamaModel: config.ollamaModel, claudeModel: 'claude-sonnet-4-6' },
      );
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Error: ${e}` };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'var(--vscode-font-family)' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--vscode-descriptionForeground)', textAlign: 'center', marginTop: 40, fontSize: 12 }}>
            Ask about game design patterns, code architecture, or your current project.
          </p>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            msg={msg}
            isStreaming={isStreaming && i === messages.length - 1}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* API key prompt — shown when cloud routing needs a key */}
      {!apiKey && routingMode !== 'local' && (
        <div style={{ padding: '8px', borderTop: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)' }}>
          <label style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', display: 'block', marginBottom: 4 }}>
            Anthropic API Key (required for cloud mode)
          </label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                flex: 1, fontSize: 11, padding: '4px 6px',
                background: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: 3,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && apiKeyInput.trim()) {
                  send({ type: 'set_secret', value: apiKeyInput.trim() });
                  setApiKey(apiKeyInput.trim());
                  routerRef.current.setApiKey(apiKeyInput.trim());
                  setApiKeyInput('');
                }
              }}
            />
            <button
              onClick={() => {
                if (!apiKeyInput.trim()) return;
                send({ type: 'set_secret', value: apiKeyInput.trim() });
                setApiKey(apiKeyInput.trim());
                routerRef.current.setApiKey(apiKeyInput.trim());
                setApiKeyInput('');
              }}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 3, border: 'none', cursor: 'pointer',
                background: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
      {apiKey && routingMode !== 'local' && (
        <div style={{ padding: '4px 8px', borderTop: '1px solid var(--vscode-panel-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
            API key saved
          </span>
          <button
            onClick={() => {
              send({ type: 'set_secret', value: '' });
              setApiKey(null);
              routerRef.current.setApiKey('');
            }}
            style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 3, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--vscode-input-border)',
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            Clear
          </button>
        </div>
      )}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming || !config}
        routingMode={routingMode}
        onRoutingModeChange={setRoutingMode}
      />
    </div>
  );
}
