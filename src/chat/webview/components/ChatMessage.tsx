import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import type { ChatMessage as Msg } from '../ai/AIRouter';

export function ChatMessageBubble({ msg, isStreaming }: { msg: Msg; isStreaming: boolean }) {
  const isUser = msg.role === 'user';

  const showThinking = !isUser && msg.content === '' && isStreaming;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div
        style={{
          padding: '8px 12px',
          fontSize: 13,
          width: isUser ? undefined : '100%',
          maxWidth: isUser ? 280 : undefined,
          background: isUser ? 'var(--vscode-button-background)' : 'var(--vscode-editor-background)',
          color: isUser ? 'var(--vscode-button-foreground)' : 'var(--vscode-editor-foreground)',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        }}
      >
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        ) : showThinking ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--vscode-descriptionForeground)' }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                border: '1.5px solid var(--vscode-panel-border)',
                borderTopColor: 'var(--vscode-focusBorder)',
                animation: 'forgeide-spin 0.8s linear infinite',
                display: 'inline-block',
              }}
            />
            Thinking...
          </span>
        ) : (
          <Markdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className ?? '');
                const codeString = String(children).replace(/\n$/, '');
                const language = match?.[1] ?? 'text';

                if (match || codeString.includes('\n')) {
                  return (
                    <div style={{ margin: '8px 0' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '2px 8px',
                          borderTopLeftRadius: 6,
                          borderTopRightRadius: 6,
                          background: 'var(--vscode-editorWidget-background)',
                          borderBottom: '1px solid var(--vscode-panel-border)',
                          fontSize: 10,
                        }}
                      >
                        <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                          {language}
                        </span>
                        <button
                          style={{
                            color: 'var(--vscode-focusBorder)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 10,
                            padding: '2px 6px',
                          }}
                          onClick={() => handleCopy(codeString)}
                          title="Copy code to clipboard"
                        >
                          Copy
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={language}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0 0 6px 6px',
                          fontSize: 12,
                          background: 'var(--vscode-editorWidget-background)',
                          maxHeight: 200,
                          overflow: 'auto',
                        }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                return (
                  <code
                    style={{
                      padding: '1px 4px',
                      borderRadius: 3,
                      fontSize: 11,
                      background: 'var(--vscode-editorWidget-background)',
                      color: 'var(--vscode-editor-foreground)',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p({ children }) {
                return <p style={{ marginBottom: 8 }}>{children}</p>;
              },
              ul({ children }) {
                return <ul style={{ listStyleType: 'disc', paddingLeft: 16, marginBottom: 8 }}>{children}</ul>;
              },
              ol({ children }) {
                return <ol style={{ listStyleType: 'decimal', paddingLeft: 16, marginBottom: 8 }}>{children}</ol>;
              },
              li({ children }) {
                return <li style={{ marginBottom: 2 }}>{children}</li>;
              },
              h1({ children }) {
                return <h1 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>{children}</h1>;
              },
              h2({ children }) {
                return <h2 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>{children}</h2>;
              },
              h3({ children }) {
                return <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{children}</h3>;
              },
              strong({ children }) {
                return <strong style={{ fontWeight: 600 }}>{children}</strong>;
              },
            }}
          >
            {msg.content}
          </Markdown>
        )}
      </div>
    </div>
  );
}
