# AccessGuard VS Code Extension

Inline accessibility diagnostics, one-click fixes, and scan integration for VS Code.

## Features

- **Inline Diagnostics**: Red squiggles on violating elements in HTML/JSX/TSX/Vue/Svelte
- **Hover Details**: Violation description + WCAG criterion + severity badge
- **Code Actions**: "Fix with AccessGuard" generates and applies fixes
- **Scan Current File**: Right-click → "Scan with AccessGuard"
- **Scan Workspace**: Command palette → "AccessGuard: Scan Workspace"
- **Settings**: API key, org selection, auto-scan on save, severity filter

## Installation

```bash
# From VS Code Marketplace
code --install-extension accessguard.accessguard-vscode

# Or from VSIX
code --install-extension accessguard-vscode-0.1.0.vsix
```

## Configuration

1. Open VS Code Settings (Ctrl+,)
2. Search for "AccessGuard"
3. Enter your API key and Organization ID

Or use the command palette:
- `AccessGuard: Configure Settings`

## Commands

| Command | Description |
|---------|-------------|
| `AccessGuard: Scan Current File` | Scan the active file for violations |
| `AccessGuard: Scan Workspace` | Scan all supported files in workspace |
| `AccessGuard: Show Output` | Open the AccessGuard output channel |
| `AccessGuard: Configure Settings` | Set API key and org ID |

## Supported Languages

- HTML (.html, .htm)
- JSX (.jsx)
- TSX (.tsx)
- Vue (.vue)
- Svelte (.svelte)

## Development

```bash
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```
