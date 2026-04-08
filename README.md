# ForgeIDE — Game Dev AI Assistant

AI-powered game design knowledge base and coding assistant for Unity, Unreal Engine, and Godot developers. Local-first with optional cloud AI.

## Features

- **Knowledge Base**: 50+ game programming patterns with engine-specific code examples (Object Pool, FSM, ECS, Behavior Tree, Rollback Netcode, and more)
- **AI Chat**: Ask questions about game dev patterns, get grounded answers with KB context injection
- **Local-First AI**: Route to Ollama for fully offline inference — no data leaves your machine
- **Cloud AI**: Optional Claude API routing for higher-quality responses
- **Engine-Aware**: Pattern results include Unity (C#), Unreal (C++), and Godot (GDScript) implementations

## Installation

### From VSIX

1. Download the `.vsix` file from [Releases](https://github.com/OTGStudio/project-eade/releases)
2. In VS Code: `Ctrl+Shift+P` > `Extensions: Install from VSIX...`
3. Select the downloaded file

### From Open VSX

Search for "ForgeIDE" in the Extensions panel or visit [open-vsx.org](https://open-vsx.org).

## Setup

### Local AI (Ollama)

1. Install [Ollama](https://ollama.com) for your platform
2. Pull a model: `ollama pull qwen2.5-coder:7b-instruct`
3. Ollama runs on `http://localhost:11434` by default
4. Open ForgeIDE chat panel — it auto-detects Ollama

### Cloud AI (Claude)

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. In the chat panel, switch routing mode to "Cloud" or "Local-first"
3. Enter your API key when prompted (stored securely in VS Code Secret Storage)

## Usage

1. Open the ForgeIDE chat panel from the sidebar
2. Ask about game programming patterns: "How do I implement object pooling in Unity?"
3. The AI searches the knowledge base, finds relevant patterns, and includes engine-specific code examples in its response
4. Switch between Local, Cloud, and Local-first routing modes as needed

## Requirements

- VS Code 1.90.0 or later
- Ollama (for local AI) or Anthropic API key (for cloud AI)

## Links

- [Source Code](https://github.com/OTGStudio/project-eade)
- [ForgeIDE Desktop App](https://github.com/OTGStudio/project-eade) (Tauri 2.0 standalone IDE)
