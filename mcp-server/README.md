# AccessGuard MCP Server

Model Context Protocol server enabling AI assistants (Claude Code, Cursor, Copilot, Continue) to interact with AccessGuard programmatically.

## Installation

```bash
npm install -g @accessguard/mcp-server
```

## Quick Start

```bash
# Set environment variables
export ACCESSGUARD_API_KEY="agk_..."
export ACCESSGUARD_ORG_ID="org_..."
export ACCESSGUARD_API_URL="https://api.accessguard.io"

# Start the server
npx @accessguard/mcp-server
```

## Configuration

### Claude Code / Cursor

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "accessguard": {
      "command": "npx",
      "args": ["@accessguard/mcp-server"],
      "env": {
        "ACCESSGUARD_API_KEY": "agk_...",
        "ACCESSGUARD_ORG_ID": "org_...",
        "ACCESSGUARD_API_URL": "https://api.accessguard.io"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `scan_project` | Trigger a full project scan |
| `get_scan_status` | Poll scan progress |
| `get_violations` | List violations with filters |
| `get_violation` | Get single violation detail |
| `generate_fix` | Generate AI remediation |
| `apply_fix` | Apply fix via GitHub PR |
| `generate_vpat` | Generate VPAT/ACR PDF |
| `check_compliance` | Quick compliance check |
| `get_project` | Get project details |
| `list_projects` | List org projects |

## Development

```bash
npm install
npm run dev
```
