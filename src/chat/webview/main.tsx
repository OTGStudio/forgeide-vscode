import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div style={{ padding: 16, color: 'var(--vscode-editor-foreground)', fontFamily: 'var(--vscode-font-family)' }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0' }}>ForgeIDE AI Chat</h2>
      <p style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)', margin: 0 }}>
        Ask about game design patterns, code architecture, or your current project.
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
