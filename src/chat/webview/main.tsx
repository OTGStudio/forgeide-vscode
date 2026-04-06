import { createRoot } from 'react-dom/client';
import { App } from './App';

// acquireVsCodeApi can only be called ONCE per webview lifecycle
export const vscode = acquireVsCodeApi();

createRoot(document.getElementById('root')!).render(<App />);
