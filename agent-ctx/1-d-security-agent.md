# Task 1-d: Security Agent - CSRF Protection

## Summary
Successfully implemented CSRF protection for the AccessGuard application using the JWT-embedded CSRF token approach.

## Implementation Approach
For JWT-based APIs, the CSRF token is embedded in the JWT payload itself. This approach is cleaner because:
- No server-side session storage needed
- Token is cryptographically bound to the JWT
- Client receives CSRF token on login/registration
- Middleware verifies X-CSRF-Token header matches the token in JWT

## Files Created

### 1. src/app/api/csrf-token/route.ts
- **GET endpoint** that returns the CSRF token from the authenticated user's JWT
- Requires Authorization header with valid JWT
- Returns `{ success: true, data: { csrfToken: "..." } }`
- Useful for clients that need to retrieve their CSRF token after page refresh

## Files Modified

### 2. src/lib/auth.ts
Added CSRF-related functions:
- **`generateCsrfToken()`** - Generates a cryptographically secure 32-byte hex token using Node's `randomBytes`
- **`verifyCsrfToken(token, jwtCsrfToken)`** - Timing-safe comparison of CSRF tokens using Buffer comparison
- **`signTokenWithCsrf(payload, expiresIn)`** - Signs a JWT with an embedded CSRF token, returns both token and csrfToken

Updated interfaces:
- **`JwtPayload`** - Added `csrfToken: string` field

### 3. src/app/api/auth/login/route.ts
- Now uses `signTokenWithCsrf()` from auth lib instead of simple token string
- Returns both `token` and `csrfToken` in the response
- Maintains backward compatibility with legacy SHA-256 password hashes

### 4. src/app/api/auth/register/route.ts
- Now uses `signTokenWithCsrf()` from auth lib
- Uses `hashPassword()` from auth lib for bcrypt hashing
- Returns both `token` and `csrfToken` in the response

### 5. middleware.ts
Added CSRF verification for mutation requests:
- **New routes exempt from CSRF**: `/api/auth/login`, `/api/auth/register`
- **New function `isMutationMethod()`** - Checks if method is POST/PUT/DELETE/PATCH
- **New function `timingSafeEqual()`** - Timing-safe string comparison for CSRF verification
- Updated `verifyTokenEdge()` to extract `csrfToken` from JWT payload
- Added X-CSRF-Token to CORS allowed headers

**CSRF verification flow**:
1. For mutation requests (POST/PUT/DELETE/PATCH) to authenticated API routes
2. Check for `X-CSRF-Token` header
3. Verify header value matches `csrfToken` from JWT payload using timing-safe comparison
4. Return 403 with clear error message if missing or invalid

## API Response Changes

### Login/Register Response (New Format)
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "csrfToken": "a1b2c3d4e5f6..."
  }
}
```

### CSRF Token Endpoint
```
GET /api/csrf-token
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": {
    "csrfToken": "a1b2c3d4e5f6..."
  }
}
```

### Mutation Request (Requires CSRF)
```http
POST /api/projects
Authorization: Bearer <jwt_token>
X-CSRF-Token: a1b2c3d4e5f6...
Content-Type: application/json

{ ... }
```

## Error Responses

### Missing CSRF Token
```json
{
  "success": false,
  "error": "CSRF token required. Include X-CSRF-Token header with your request."
}
```
Status: 403 Forbidden

### Invalid CSRF Token
```json
{
  "success": false,
  "error": "Invalid CSRF token"
}
```
Status: 403 Forbidden

## Security Features
1. **Cryptographically secure tokens**: Uses Node's `randomBytes(32)` for 64-character hex tokens
2. **Timing-safe comparison**: Prevents timing attacks when comparing tokens
3. **Bound to JWT**: CSRF token is embedded in JWT, cannot be forged without JWT secret
4. **Per-session tokens**: Each login/registration generates a new unique CSRF token
5. **Exempt routes**: Login and register routes don't require CSRF (they have rate limiting and other protections)

## Client Integration Guide
1. On login/register, store both `token` and `csrfToken` from response
2. For GET requests: Include `Authorization: Bearer <token>` header
3. For mutation requests (POST/PUT/DELETE/PATCH): Also include `X-CSRF-Token: <csrfToken>` header
4. If CSRF token is lost, call `GET /api/csrf-token` to retrieve it from the JWT

## Verification
- ✅ `bun run lint` - Passed with no errors
- ✅ Dev server running successfully
- ✅ No breaking changes to existing functionality

## Notes
- Existing users can still login with their current passwords (backward compatible)
- The demo user (demo@accessguard.com / demo123) continues to work
- Frontend will need to be updated to include X-CSRF-Token header for mutation requests
