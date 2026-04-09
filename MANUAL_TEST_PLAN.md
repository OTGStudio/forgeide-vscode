# ForgeIDE VS Code Extension — Manual Test Plan v0.2.0

## Prerequisites

- VS Code 1.90.0+
- `forgeid-0.2.0.vsix` built
- Ollama installed with `qwen2.5-coder:7b-instruct` pulled
- Anthropic API key (for cloud tests)
- A workspace folder open in VS Code

---

## 1. Installation

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | Install from VSIX | Ctrl+Shift+P > "Extensions: Install from VSIX" > select `forgeid-0.2.0.vsix` | Extension installs, no errors. Reload prompt may appear. |
| 1.2 | Sidebar icon appears | Look at Activity Bar (left edge) | ForgeIDE icon visible |
| 1.3 | Chat view loads | Click ForgeIDE sidebar icon | "AI Chat" panel renders with empty state message: "Ask anything about your code or game design patterns" |
| 1.4 | Command palette | Ctrl+Shift+P > type "ForgeIDE" | "ForgeIDE: Open AI Chat" command listed |

---

## 2. Configuration Settings

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Default settings | Open Settings (Ctrl+,) > search "forgeid" | Three settings visible: `ollamaBaseUrl` (default `http://localhost:11434`), `ollamaModel` (default `qwen2.5-coder:7b-instruct`), `routingMode` (default `local-first`) |
| 2.2 | Change Ollama URL | Set `forgeid.ollamaBaseUrl` to `http://localhost:99999` | Setting saves. Chat should fail with connection error when using local mode. |
| 2.3 | Change model | Set `forgeid.ollamaModel` to `llama3.2:3b` (if pulled) | Setting saves. Next local chat uses the new model. |
| 2.4 | Reset to defaults | Delete custom settings | Settings revert to defaults |

---

## 3. Knowledge Base Search

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Pattern search — basic | Type "object pool" in chat, send | Response references Object Pool pattern. Console (Developer Tools) shows KB context injected into system prompt. |
| 3.2 | Pattern search — networking | Type "how do I implement rollback netcode" | Response references Rollback Netcode pattern with engine-specific advice |
| 3.3 | Pattern search — AI | Type "behavior tree vs state machine" | Response references both Behavior Tree and State Machine patterns |
| 3.4 | No match | Type "what is the weather today" | Response is generic (no KB patterns injected). No errors. |
| 3.5 | Short query | Type "ecs" | Response references ECS pattern |

---

## 4. Ollama Local Chat

**Prerequisite:** Ollama running on localhost:11434 with a model pulled.

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | Local mode routing | Set routing mode to "local" via toggle buttons | "local" button highlighted |
| 4.2 | Send message | Type "What is an object pool?" and send | Streaming response appears token-by-token. "Thinking..." spinner shows briefly. |
| 4.3 | Markdown rendering | Ask "Show me a C# object pool example" | Response includes a code block with syntax highlighting |
| 4.4 | Copy code block | Hover over a code block in response | "Copy" button appears. Click it — code copies to clipboard. |
| 4.5 | Multi-turn | Follow up with "How would I use that in Godot?" | Response uses conversation history, refers to prior context |
| 4.6 | Streaming indicator | Send a message | Send button shows "..." while streaming. Input is disabled. |
| 4.7 | Ollama offline | Stop Ollama (`ollama stop`), send a message in local mode | Error message displayed in chat: connection refused or similar |

---

## 5. Claude Cloud Chat

**Prerequisite:** Valid Anthropic API key starting with `sk-ant-`.

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | Cloud mode — no key | Switch to "cloud" mode without an API key stored | API key input UI appears above chat input (password field + Save button) |
| 5.2 | Enter API key | Type API key in password field, click Save | "API key saved" confirmation with Clear button appears. Input field hides. |
| 5.3 | Cloud chat | Send "Explain the command pattern for game dev" | Streaming response from Claude. KB context injected. |
| 5.4 | Invalid key | Clear key, enter "invalid-key", save, send message | Error displayed in chat (401 or authentication error) |
| 5.5 | Clear API key | Click "Clear" button next to "API key saved" | Key removed. API key input reappears on next cloud message attempt. |
| 5.6 | Key persistence | Close and reopen VS Code | API key still stored (retrieved from Secret Storage). No re-entry needed. |

---

## 6. Local-First Fallback

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1 | Ollama online | Set mode to "local-first", ensure Ollama running, send message | Response comes from Ollama (check console for "[Ollama]" log prefix) |
| 6.2 | Ollama offline fallback | Stop Ollama, set mode to "local-first", ensure API key saved, send message | After ~2s health check timeout, falls back to Claude. Response arrives. |
| 6.3 | Both offline | Stop Ollama, clear API key, set "local-first", send message | Error displayed (Ollama unreachable + no Claude key) |

---

## 7. Routing Mode Switching

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | Switch local → cloud | Click "cloud" toggle button | Button highlights. Next message routes to Claude. |
| 7.2 | Switch cloud → local | Click "local" toggle button | Button highlights. Next message routes to Ollama. |
| 7.3 | Switch mid-conversation | Send message on local, switch to cloud, send another | Both messages in history. Second response from Claude. No errors. |
| 7.4 | All three toggles | Click local, local-first, cloud in sequence | Only one button highlighted at a time. No UI glitches. |

---

## 8. Chat UI

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | Empty state | Open fresh chat (or clear) | "Ask anything about your code or game design patterns" centered message |
| 8.2 | User message styling | Send a message | User bubble appears right-aligned with themed background |
| 8.3 | Assistant message styling | Receive a response | Assistant bubble left-aligned, full width, different background |
| 8.4 | Clear chat | Click "Clear" button in header | All messages removed. Empty state returns. |
| 8.5 | Ctrl+Enter to send | Type text, press Ctrl+Enter | Message sends (same as clicking Send button) |
| 8.6 | Empty send prevention | Click Send with empty input | Nothing happens. No error. |
| 8.7 | Long message | Paste a 500-word message and send | Message renders fully. Scrollable. No truncation. |
| 8.8 | Auto-scroll | Send multiple messages to fill the view | Chat auto-scrolls to newest message |
| 8.9 | Markdown headings | Get a response with `## Heading` | Heading renders with larger bold text |
| 8.10 | Markdown lists | Get a response with bullet/numbered lists | Lists render with proper indentation and markers |
| 8.11 | Inline code | Get a response with `backtick code` | Inline code renders with monospace background |

---

## 9. Workspace Awareness

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.1 | Project context | Open a folder in VS Code, ask "What is this project?" | Response mentions the workspace folder name. Console shows workspace path in system prompt. |
| 9.2 | No workspace | Close all folders, ask "What is this project?" | Response says it doesn't have project context (no crash) |

---

## 10. Error Handling

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1 | Network error | Disconnect network, send message (cloud mode) | Error message in chat bubble. No crash. |
| 10.2 | Ollama wrong port | Set `ollamaBaseUrl` to wrong port, send (local mode) | Connection error in chat. No crash. |
| 10.3 | Rapid sends | Click Send 5 times quickly | Only one message processes at a time (button disabled during streaming) |

---

## 11. Theme Compatibility

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11.1 | Dark theme | Set VS Code to a dark theme (e.g., "Dark+") | Chat panel renders with appropriate dark colors. Text readable. |
| 11.2 | Light theme | Set VS Code to a light theme (e.g., "Light+") | Chat panel renders with appropriate light colors. No white-on-white text. |
| 11.3 | High contrast | Set VS Code to "High Contrast" | Chat panel remains usable. Text and buttons visible. |

---

## 12. Extension Lifecycle

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 12.1 | Reload window | Ctrl+Shift+P > "Developer: Reload Window" | Extension reactivates. Chat panel re-renders. No errors in console. |
| 12.2 | Disable/Enable | Disable ForgeIDE extension, then re-enable | Extension deactivates cleanly. Re-enable restores functionality. |
| 12.3 | Uninstall | Uninstall extension | No leftover UI. Clean removal. |

---

## Pass/Fail Summary

| Section | Tests | Pass | Fail | Notes |
|---------|-------|------|------|-------|
| 1. Installation | 4 | | | |
| 2. Configuration | 4 | | | |
| 3. KB Search | 5 | | | |
| 4. Ollama Local | 7 | | | |
| 5. Claude Cloud | 6 | | | |
| 6. Local-First | 3 | | | |
| 7. Routing Mode | 4 | | | |
| 8. Chat UI | 11 | | | |
| 9. Workspace | 2 | | | |
| 10. Error Handling | 3 | | | |
| 11. Theme Compat | 3 | | | |
| 12. Lifecycle | 3 | | | |
| **Total** | **55** | | | |
