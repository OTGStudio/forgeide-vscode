import { useEffect, useCallback } from 'react';
import { vscode } from './main';

type MessageHandler = (msg: Record<string, unknown>) => void;

/** Post a message to the extension host and receive the response via listener. */
export function useVSCodeBridge(onMessage: MessageHandler) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      onMessage(event.data as Record<string, unknown>);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  const send = useCallback((msg: Record<string, unknown>) => {
    vscode.postMessage(msg);
  }, []);

  return { send };
}
