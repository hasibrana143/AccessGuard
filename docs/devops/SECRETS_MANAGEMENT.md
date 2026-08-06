# Volume 7 — Secrets Management

## 1. Current state (verified)

### Development
- `.env` file (gitignored) copied from `.env.example`
- `.env.example` documents **names only** (no values)
- Docker Compose injects from `.env` via `environment:` mapping

### CI (GitHub Actions)
- `ci.yml`: hardcoded test secrets (`NEXTAUTH_SECRET: ci-secret-key-for-testing-only`, DB creds)
- `docker.yml`: uses `GITHUB_TOKEN` for GHCR auth (auto-provided)

### Production (manual / single-host)
- `.env` on host with real values
- Docker Compose reads `.env` → passes to container
- No rotation, no audit trail, no encryption at rest

### Required secrets (from `.env.example` + code audit)
| Secret | Used by | Rotation |
| --- | --- | --- |
| `DATABASE_URL` | Prisma, entrypoint, backup script | Manual |
| `NEXTAUTH_SECRET` | NextAuth JWT signing, session encryption | Manual (fail-closed in oauth-state) |
| `OAUTH_STATE_SECRET` | OAuth state HMAC (V6 fail-closed) | Manual |
| `NEXTAUTH_URL` | NextAuth callback URL | On deploy |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (PR pipeline) | Manual (GitHub app settings) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking | Manual |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing | Manual (Stripe dashboard) |
| `ANTHROPIC_API_KEY` / `NVIDIA_API_KEY` | AI providers (optional) | Manual |
| `REDIS_URL` | BullMQ, rate-limit, session | Manual |
| `LOG_LEVEL` | Pino logger | Config |
| `BACKUP_DIR` / `KEEP_BACKUPS` / `POSTGRES_CONTAINER` | db-backup script | Config |

## 2. Gaps

| Gap | Risk | Fix |
| --- | --- | --- |
| **No secret rotation** | Long-lived credentials = blast radius | Automated rotation (RDS IAM auth, GitHub App tokens, scheduled secret updates) |
| **No central secret store** | `.env` on disk; no audit; no versioning | HashiCorp Vault / AWS Secrets Manager / Azure Key Vault / GCP Secret Manager / 1Password Connect |
| **No secret injection at runtime** | Secrets baked into image / compose file | CSI driver (K8s) / ECS secrets / Doppler / Infisical |
| **No secrets scanning in CI** | Accidental commit of `.env` | `trufflehog` / `gitleaks` in ci.yml (pre-commit + PR scan) |
| **No least-privilege DB auth** | Single `accessguard` user with full perms | RDS IAM auth / dedicated users per service (app, backup, migration) |
| **No encryption key management** | `NEXTAUTH_SECRET` used for JWT + OAuth state; no KMS | KMS-backed envelope encryption for secrets at rest |

## 3. Target architecture (progressive adoption)

### Phase 1 — CI hygiene (immediate)
- Add `gitleaks`/`trufflehog` step in `ci.yml` (fail on secrets)
- Move test DB creds to GitHub Actions secrets (not hardcoded)
- Add `dependabot` for secret rotation reminders

### Phase 2 — External secret store (month 1)
- **Option A (AWS)**: AWS Secrets Manager + IAM roles for service accounts (IRSA)
  - EKS pod identity → read secrets at startup → env vars
  - RDS IAM auth → no DB password in secrets
- **Option B (Cloud-agnostic)**: HashiCorp Vault (self-hosted or HCP) + Vault Agent Injector
- **Option C (Simpler)**: Doppler / Infisical / 1Password Connect — sync to GitHub Actions secrets + K8s

### Phase 3 — Runtime injection (month 2)
- **K8s**: `ExternalSecrets` operator → sync from Vault/AWS SM/GCP SM → K8s Secret → pod env
- **Compose/VM**: `doppler run --` / `infisical run --` / `vault agent` sidecar
- **Entrypoint**: Fetch secrets at container start (not build) → never in image layers

### Phase 4 — Rotation & audit (month 3)
- **Automated rotation**:
  - DB password: AWS Secrets Manager rotation lambda (30d)
  - GitHub OAuth: GitHub App installation tokens (1h TTL) — already short-lived
  - Stripe: Manual (webhook secret rotation requires coordination)
  - `NEXTAUTH_SECRET` / `OAUTH_STATE_SECRET`: Custom rotation job (90d) → rollout with zero-downtime (overlap old/new for 1h)
- **Audit**: CloudTrail / Vault audit log → SIEM alerts on unusual access

## 4. Immediate hardening (do this week)

1. **Add secret scan to CI** (`.github/workflows/ci.yml`):
   ```yaml
   - name: Secret scan
     uses: trufflesecurity/trufflehog@main
     with:
       path: ./
       base: main
       head: HEAD
       extra_args: --fail --json
   ```

2. **Move hardcoded CI secrets to GitHub Secrets**:
   - `TEST_DATABASE_URL`, `TEST_NEXTAUTH_SECRET`, `TEST_REDIS_URL` → repo settings → Actions secrets
   - Update `ci.yml` to reference `${{ secrets.TEST_DATABASE_URL }}` etc.

3. **Document `.env.example` completely** (verify all required vars listed):
   - Cross-reference with `src/lib/*` imports of `process.env`

4. **Add `NEXTAUTH_SECRET` rotation procedure** to runbook:
   - Generate new 32-byte base64: `openssl rand -base64 32`
   - Deploy with overlap: set `NEXTAUTH_SECRET_NEW` + `NEXTAUTH_SECRET_OLD` → middleware accepts both for 1h → switch → remove old

## 5. Compliance mapping

| Standard | Requirement | Current | Target |
| --- | --- | --- | --- |
| **SOC 2 CC6.1** | Logical access credentials managed | Manual `.env` | Vault + rotation + audit |
| **SOC 2 CC6.7** | Transmission encryption | TLS 1.2+ (enforced) | ✅ |
| **GDPR Art. 32** | Encryption of personal data at rest | DB encrypted (RDS) | ✅ + secrets encrypted |
| **PCI DSS 8.2.3** | Password rotation 90d | None | Automated 90d |
| **ISO 27001 A.9.2** | Privilege management | Single DB user | Least-privilege users |

## 6. Secrets inventory (living document)
| Secret | Owner | Rotation | Store | Last rotated |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Infra | 90d (auto) | AWS SM | — |
| `NEXTAUTH_SECRET` | App team | 90d (manual) | Vault | — |
| `OAUTH_STATE_SECRET` | App team | 90d (manual) | Vault | — |
| `GITHUB_CLIENT_SECRET` | Infra | On compromise | GitHub + Vault | — |
| `STRIPE_SECRET_KEY` | Billing | On compromise | Stripe + Vault | — |
| `SENTRY_DSN` | Infra | On compromise | Sentry + Vault | — |

*Update this table on every rotation.*