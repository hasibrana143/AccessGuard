# AccessGuard GitHub Action

Scan your project for WCAG accessibility violations in GitHub Actions.

## Usage

```yaml
- uses: accessguard/action@v1
  with:
    api-key: ${{ secrets.ACCESSGUARD_API_KEY }}
    project-id: ${{ secrets.ACCESSGUARD_PROJECT_ID }}
    fail-on: critical
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `api-key` | AccessGuard API key (required) | - |
| `project-id` | AccessGuard project ID (required) | - |
| `command` | Command to run | `scan` |
| `fail-on` | Fail on severity level | `critical` |
| `standard` | WCAG standard | `wcag22aa` |
| `format` | VPAT format | `pdf` |

## Outputs

| Output | Description |
|--------|-------------|
| `score` | Accessibility score percentage |
| `violations-count` | Number of violations found |
| `critical-count` | Number of critical violations |
| `vpat-url` | VPAT download URL |

## Examples

### Basic Scan

```yaml
- uses: accessguard/action@v1
  with:
    api-key: ${{ secrets.ACCESSGUARD_API_KEY }}
    project-id: ${{ secrets.ACCESSGUARD_PROJECT_ID }}
```

### Generate VPAT

```yaml
- uses: accessguard/action@v1
  with:
    api-key: ${{ secrets.ACCESSGUARD_API_KEY }}
    project-id: ${{ secrets.ACCESSGUARD_PROJECT_ID }}
    command: generate-vpat
    format: pdf
```

### Fail on Serious

```yaml
- uses: accessguard/action@v1
  with:
    api-key: ${{ secrets.ACCESSGUARD_API_KEY }}
    project-id: ${{ secrets.ACCESSGUARD_PROJECT_ID }}
    fail-on: serious
```
