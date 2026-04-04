import * as vscode from 'vscode';
import { searchPatterns } from '../kb/PatternDB';

export class ChatPanel implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'kb_search': {
          const results = searchPatterns(msg.query, 3);
          webviewView.webview.postMessage({ type: 'kb_results', results });
          break;
        }
        case 'get_config': {
          const config = vscode.workspace.getConfiguration('forgeid');
          webviewView.webview.postMessage({
            type: 'config',
            ollamaBaseUrl:  config.get('ollamaBaseUrl', 'http://localhost:11434'),
            ollamaModel:    config.get('ollamaModel', 'qwen2.5-coder:7b-instruct'),
            routingMode:    config.get('routingMode', 'local-first'),
          });
          break;
        }
        case 'get_secret': {
          const key = await this.context.secrets.get('anthropic_api_key');
          webviewView.webview.postMessage({ type: 'secret', key: key ?? null });
          break;
        }
        case 'set_secret': {
          await this.context.secrets.store('anthropic_api_key', msg.value);
          break;
        }
        case 'get_workspace': {
          const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
          webviewView.webview.postMessage({ type: 'workspace', path: ws });
          break;
        }
      }
    });
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline'; connect-src http://localhost:* https://api.anthropic.com;">
  <title>ForgeIDE</title>
  <style>
    body { margin: 0; padding: 0; height: 100vh; overflow: hidden;
           background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
    #root { height: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}
