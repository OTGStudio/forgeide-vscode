# Contributing to ForgeIDE VS Code Extension

Thank you for your interest in contributing! This extension is MIT-licensed and
open to community contributions.

## Before contributing

All contributors must sign the OTG Studio Contributor License Agreement (CLA)
before a pull request can be merged. The CLA bot will prompt you automatically
when you open a PR. The CLA ensures OTG Studio can continue to license and
maintain ForgeIDE as a commercial product while keeping this extension open source.

## Development setup

1. Clone the public repo: `git clone https://github.com/OTGStudio/forgeide-vscode`
2. `cd forgeide-vscode && npm install`
3. Open in VS Code: `code .`
4. Press F5 to launch the Extension Development Host

## What lives here

This repo contains the VS Code extension only. The full ForgeIDE desktop app,
plugin system, Blueprint MCP bridge, and agentic refactoring engine are in the
commercial product. See https://forgeide.com for the full product.

## Areas where we especially welcome contributions

- Additional engine-specific completion triggers (Godot, Unity, Unreal)
- KB search improvements and new pattern submissions
- Bug fixes for Ollama model compatibility
- README and documentation improvements

## Pull request process

1. Fork the repo and create a feature branch
2. Make your changes with tests where applicable
3. Run `npm run compile` — must be zero errors
4. Open a PR with a clear description of what you changed and why
5. Sign the CLA when prompted
