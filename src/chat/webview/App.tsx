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

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

export function App() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [config, setConfig]           = useState<Config | null>(null);
  const [workspace, setWorkspace]     = useState<string | null>(null);
  const [isStreaming, setIsStreaming]  = useState(false);
  const [pendingKb, setPendingKb]     = useState<string | null>(null);
  const [apiKey, setApiKey]           = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [routingMode, setRoutingMode] = useState<RoutingMode>('local-first');

  // Session management
  const [sessions, setSessions]             = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(crypto.randomUUID());
  const [sessionLimit, setSessionLimit]     = useState(5);
  const [showHistory, setShowHistory]       = useState(false);

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
    if (msg.type === 'sessions_loaded') {
      setSessions((msg.sessions as ChatSession[]) ?? []);
      setSessionLimit((msg.limit as number) ?? 5);
    }
  }, []);

  const { send } = useVSCodeBridge(handleMessage);

  useEffect(() => {
    send({ type: 'get_config' });
    send({ type: 'get_secret' });
    send({ type: 'get_workspace' });
    send({ type: 'load_sessions' });
  }, [send]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist sessions to extension host whenever they change
  const persistSessions = useCallback((updated: ChatSession[]) => {
    send({ type: 'save_sessions', sessions: updated });
  }, [send]);

  const newSession = useCallback(() => {
    let updatedSessions = [...sessions];

    // Archive current chat if it has messages
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
        : 'Untitled';
      const archived: ChatSession = {
        id: currentSessionId,
        title,
        createdAt: Date.now(),
        messages: [...messages],
      };
      updatedSessions = [archived, ...updatedSessions.filter(s => s.id !== currentSessionId)];

      // Trim to limit
      while (updatedSessions.length > sessionLimit) {
        updatedSessions.pop();
      }
    }

    setSessions(updatedSessions);
    persistSessions(updatedSessions);
    setMessages([]);
    setCurrentSessionId(crypto.randomUUID());
  }, [messages, sessions, currentSessionId, sessionLimit, persistSessions]);

  const loadSession = useCallback((id: string) => {
    const target = sessions.find(s => s.id === id);
    if (!target) return;

    // Archive current first
    let updatedSessions = [...sessions];
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
        : 'Untitled';
      const archived: ChatSession = {
        id: currentSessionId,
        title,
        createdAt: Date.now(),
        messages: [...messages],
      };
      const idx = updatedSessions.findIndex(s => s.id === currentSessionId);
      if (idx >= 0) {
        updatedSessions[idx] = archived;
      } else {
        updatedSessions = [archived, ...updatedSessions];
      }
    }

    setSessions(updatedSessions);
    persistSessions(updatedSessions);
    setMessages([...target.messages]);
    setCurrentSessionId(id);
    setShowHistory(false);
  }, [messages, sessions, currentSessionId, persistSessions]);

  const deleteSession = useCallback((id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    persistSessions(updated);
  }, [sessions, persistSessions]);

  const handleSend = async (text: string) => {
    if (!config) return;

    // Request KB results
    send({ type: 'kb_search', query: text });

    // Capture prior history BEFORE adding the new messages to avoid duplicates
    const priorMessages = messages.filter(m => m.content);

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
          ...priorMessages,
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
      {/* Header with New Chat + History */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 8px', borderBottom: '1px solid var(--vscode-panel-border)',
        fontSize: 11,
      }}>
        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--vscode-descriptionForeground)' }}>
          AI Chat
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={newSession}
            style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--vscode-input-border)',
              color: 'var(--vscode-textLink-foreground)',
            }}
            title="Start a new chat (archives current)"
          >
            + New
          </button>
          {sessions.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
                background: showHistory ? 'var(--vscode-button-background)' : 'transparent',
                color: showHistory ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)',
                border: '1px solid var(--vscode-input-border)',
              }}
              title="Show past sessions"
            >
              History ({sessions.length})
            </button>
          )}
        </div>
      </div>

      {/* Session history list */}
      {showHistory && (
        <div style={{ maxHeight: 140, overflowY: 'auto', borderBottom: '1px solid var(--vscode-panel-border)' }}>
          {sessions.map(ses => (
            <div
              key={ses.id}
              onClick={() => loadSession(ses.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                borderBottom: '1px solid var(--vscode-panel-border)',
                background: ses.id === currentSessionId ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                color: ses.id === currentSessionId ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-editor-foreground)',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={ses.title}>
                {ses.title}
              </span>
              <span style={{ flexShrink: 0, marginLeft: 6, fontSize: 10, color: 'var(--vscode-descriptionForeground)' }}>
                {new Date(ses.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(ses.id); }}
                style={{
                  flexShrink: 0, marginLeft: 4, padding: '0 4px', cursor: 'pointer',
                  background: 'transparent', border: 'none', fontSize: 10,
                  color: 'var(--vscode-descriptionForeground)',
                }}
                title="Delete session"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

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
