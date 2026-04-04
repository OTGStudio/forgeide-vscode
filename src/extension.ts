import * as vscode from 'vscode';
import { ChatPanel } from './chat/ChatPanel';

export function activate(context: vscode.ExtensionContext): void {
  // Register sidebar webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'forgeid.chatView',
      new ChatPanel(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Register open chat command
  context.subscriptions.push(
    vscode.commands.registerCommand('forgeid.openChat', () => {
      vscode.commands.executeCommand('forgeid.chatView.focus');
    })
  );
}

export function deactivate(): void {}
