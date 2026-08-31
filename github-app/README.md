# AccessGuard GitHub App

First-class GitHub integration providing PR checks, violation annotations, and one-click auto-fix PRs.

## Features

- **PR Checks**: Automatic accessibility scanning on every push/PR
- **Annotations**: Violations shown as annotations on PR files
- **Auto-Fix PRs**: One-click fix generates a PR with the solution
- **VPAT Reports**: Generate compliance reports on main branch pushes

## Installation

1. Go to https://github.com/apps/accessguard
2. Click "Install"
3. Select repositories to protect
4. Configure secrets in your repository

## Required Secrets

| Secret | Description |
|--------|-------------|
| `ACCESSGUARD_API_KEY` | Your AccessGuard API key |
| `ACCESSGUARD_PROJECT_ID` | Project ID to scan |

## How It Works

### On Push/PR
1. AccessGuard check appears: "AccessGuard Accessibility Scan"
2. Scans changed files for violations
3. Shows violations as annotations on PR files
4. Pass/fail based on critical violations

### On Fix Request
1. Click "Fix with AccessGuard" button on check run
2. AccessGuard generates AI fix
3. Creates PR with the solution
4. Review and merge

## GitHub Actions Workflow

The included workflow (`.github/workflows/accessguard.yml`) runs automatically:

```yaml
name: AccessGuard Scan
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: accessguard/action@v1
        with:
          api-key: ${{ secrets.ACCESSGUARD_API_KEY }}
          project-id: ${{ secrets.ACCESSGUARD_PROJECT_ID }}
          fail-on: critical
```

## Development

```bash
npm install
npm run dev
```
