# Scan Authentication (authenticated scans)

> Volume 21 · authenticated scans (cookies / headers / login script)
> Code: `src/lib/scan-auth.ts`, `src/app/api/scan-auth/**`, `src/services/scanner/strategies/axe-core.ts`

## What it is

Some targets only expose their accessibility tree to a logged-in browser session. Scan
authentication lets an org attach credentials to a project so the scanner reaches the page the
same way a signed-in user does.

Three config types are supported:

| Type | What it does | Applied by |
|---|---|---|
| `cookie` | Session cookies sent with every request | `context.addCookies()` before navigation |
| `header` | Extra request headers (e.g. `Authorization: Bearer …`) | `page.setExtraHTTPHeaders()` before navigation |
| `script` | A login flow: selector-based form fill **or** a custom script | `page.evaluate()` on the login page |

Every active config of a project is applied. Cookies and headers merge; the first config that
carries a login script (or script config) wins.

## API

All endpoints require a **verified email** and the **`manage_settings` permission** (owner/admin
only) — these credentials are admin-level material.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/scan-auth?projectId=<id>` | List the active configs of a project (masked) |
| POST | `/api/scan-auth` | Create a config |
| GET | `/api/scan-auth/{id}` | Read one config (masked) |
| PUT | `/api/scan-auth/{id}` | Update a config |
| DELETE | `/api/scan-auth/{id}` | Delete a config |

Create body:

```jsonc
{
  "name": "Staging login",
  "type": "script",              // cookie | header | script
  "projectId": "clx…",
  "config": {
    "cookies": [{ "name": "session", "value": "…", "domain": "app.example.com", "path": "/" }],
    "headers": { "Authorization": "Bearer …" },
    "script": "document.querySelector('#email').value = window.__accessguardAuth.username;",
    "scriptConfig": {
      "loginUrl": "https://app.example.com/login",
      "usernameSelector": "#email",
      "passwordSelector": "#password",
      "submitSelector": "#submit",
      "waitForSelector": "#dashboard",
      "waitAfterLogin": 2000,
      "username": "…",           // encrypted at rest
      "password": "…"            // encrypted at rest
    }
  }
}
```

Audit events: `scan_auth_created`, `scan_auth_updated`, `scan_auth_deleted`.

## Secret handling

| Stage | Behaviour |
|---|---|
| At rest | Cookie values, sensitive header values, the login script and the login credentials are encrypted with AES-256-GCM (`src/lib/crypto.ts`). Non-secret values (selectors, header names, `X-Trace`-style headers) stay readable. |
| In the API | Reads mask cookie values and sensitive headers with `••••••••`; the login script and the credentials are **never** returned. |
| In the scanner | Secrets are decrypted only when the browser context is prepared (`decryptScanAuthConfig`). |
| Header detection | A header is treated as secret when its name contains `auth`, `token`, `cookie`, `secret`, `password` or `session`. |

## Login flow (browser side)

`applyAuthContext()` runs before the target URL is loaded:

1. Cookies are added to the browser context.
2. Extra headers are set on the page.
3. If `scriptConfig.loginUrl` is set, the page navigates to it.
4. If `username`/`password` plus the three selectors are present, the form is filled and submitted.
5. If `script` is present, it runs in the page context as an async IIFE. The credentials are exposed
   to the page as `window.__accessguardAuth` so the script does not have to embed them.
6. `waitForSelector` (15 s cap) and `waitAfterLogin` are honoured.

The custom script runs in the **browser** context, so it uses DOM/`fetch` APIs — `page.fill()` and
other Playwright APIs are not available inside it.

## Known limits

- In crawl mode each page is scanned in its own browser context, so a script-based login runs once
  per page. Cookie and header auth are cheap; script auth makes crawls slower.
- Credentials are not injected into third-party pages outside the configured `loginUrl` flow.
- A login script is executable code stored per organization. Only admins can create one, and the
  script is never exposed through the API.

## Tests

`src/app/api/scan-auth/route.test.ts` covers the contract: 401 without a session, 403 for members,
404 across organizations, encryption at rest, masked reads, update and delete.
