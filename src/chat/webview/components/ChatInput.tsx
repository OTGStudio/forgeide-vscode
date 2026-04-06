import { useState } from 'react';
import type { RoutingMode } from '../ai/AIRouter';

const MODES: RoutingMode[] = ['local', 'local-first', 'cloud'];

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  routingMode: RoutingMode;
  onRoutingModeChange: (mode: RoutingMode) => void;
}

export function ChatInput({ onSend, disabled, routingMode, onRoutingModeChange }: Props) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <div
      style={{
        borderTop: '1px solid var(--vscode-panel-border)',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Routing mode selector */}
      <div style={{ display: 'flex', gap: 4 }}>
        {MODES.map((mode) => (
          <button
            key={mode}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: routingMode === mode ? 'var(--vscode-button-background)' : 'transparent',
              color: routingMode === mode ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)',
              border: '1px solid var(--vscode-panel-border)',
              cursor: 'pointer',
            }}
            onClick={() => onRoutingModeChange(mode)}
          >
            {mode}
          </button>
        ))}
      </div>
      {/* Message input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          style={{
            flex: 1,
            resize: 'none',
            borderRadius: 4,
            padding: 8,
            fontSize: 13,
            background: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            minHeight: 60,
            fontFamily: 'var(--vscode-font-family)',
          }}
          placeholder="Ask about your code, patterns, or game design..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          style={{
            padding: '0 12px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            background: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: 'none',
            cursor: disabled || !input.trim() ? 'default' : 'pointer',
            opacity: disabled || !input.trim() ? 0.5 : 1,
          }}
        >
          {disabled ? '...' : 'Send'}
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', margin: 0 }}>
        Ctrl+Enter to send
      </p>
    </div>
  );
}
