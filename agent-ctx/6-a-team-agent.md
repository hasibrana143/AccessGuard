# Task 6-a: Team Member Invites and Role-Based Access Control

## Agent: Team Agent
## Status: Completed

## Summary

Successfully implemented comprehensive team member invites and role-based access control in the AccessGuard application.

## Files Created/Modified

### 1. Prisma Schema Updates
**File:** `prisma/schema.prisma`
- Added `TeamInvite` model with fields:
  - `id`, `orgId`, `email`, `role`, `token`, `invitedBy`, `expiresAt`, `acceptedAt`, `createdAt`
  - Relations to Organization model
  - Indexes on `orgId` and `email` for efficient queries
- Added `teamInvites` relation to Organization model

### 2. Team Management Library
**File:** `src/lib/team.ts`
- Role definitions with permissions:
  - `admin`: Full access, can manage team
  - `member`: Can create/edit projects, run scans
  - `viewer`: Read-only access
- Functions implemented:
  - `generateInviteToken()` - Secure 32-byte hex token generation
  - `validateInviteToken(token)` - Token validation with expiration check
  - `getRolePermissions(role)` - Returns permission array for role
  - `hasPermission(role, permission)` - Permission check helper
  - `canManageTeam(role)` - Admin check for team management
  - `checkTeamInviteLimit(orgId)` - Enforces plan limits (Starter: 2, Agency: 5, Enterprise: unlimited)
  - `createTeamInvite()` - Creates invite with 7-day expiration
  - `acceptTeamInvite()` - Marks invite as accepted
  - `cancelTeamInvite()` - Cancels pending invite
  - `getTeamMembers()` - Lists all org members
  - `getPendingInvites()` - Lists pending invites
  - `updateMemberRole()` - Changes member role
  - `removeTeamMember()` - Removes member with last-admin protection
  - `getInviteUrl()` - Generates invite acceptance URL

### 3. API Routes Created

**File:** `src/app/api/team/invite/route.ts`
- POST endpoint to send invites
- Admin-only access
- Validates email format and role
- Checks for existing members
- Enforces team size limits
- Sends invite email via Resend
- Creates audit log entry

**File:** `src/app/api/team/accept-invite/route.ts`
- POST endpoint to accept invites
- GET endpoint to fetch invite details
- Handles both new and existing users
- Creates user account if needed
- Returns auth token on success
- Validates token expiration

**File:** `src/app/api/team/members/route.ts`
- GET: List all team members
- DELETE: Remove member (admin only, prevents self-removal)
- PATCH: Update member role (admin only, prevents demoting last admin)

**File:** `src/app/api/team/pending-invites/route.ts`
- GET: List pending invites with inviter details
- DELETE: Cancel pending invite (admin only)

### 4. React Hooks
**File:** `src/hooks/useTeam.ts`
- `useTeamMembers()` - Fetches team member list
- `usePendingInvites()` - Fetches pending invites
- `useInviteMember()` - Mutation to send invite
- `useCancelInvite()` - Mutation to cancel invite
- `useUpdateMemberRole()` - Mutation to change role
- `useRemoveMember()` - Mutation to remove member
- `useInviteDetails(token)` - Fetches invite by token
- `useAcceptInvite()` - Mutation to accept invite

### 5. Email Templates
**File:** `src/lib/email-templates.ts`
- Added `getTeamInviteEmailTemplate()` with:
  - Organization name and inviter name
  - Role description
  - Invite URL
  - Expiration notice (7 days)
  - Responsive HTML and plain text versions

**File:** `src/lib/email.ts`
- Added `sendTeamInviteEmail()` function
- Added `TeamInviteEmailData` type export

**File:** `src/types/email.ts`
- Added `TeamInviteEmailData` interface
- Added 'team-invite' to `EmailTemplateType`

### 6. Frontend UI

**File:** `src/app/page.tsx`
- Added role constants (`ROLE_LABELS`, `ROLE_BADGES`, `ROLE_DESCRIPTIONS`)
- Created `TeamManagementTab` component with:
  - Team member list with role badges
  - Invite member dialog (admin only)
  - Pending invites section with cancel option
  - Role permissions reference card
  - Role change dropdown (admin only)
  - Remove member dialog (admin only)
- Added `AcceptInviteView` component for invite acceptance:
  - Shows organization name and role
  - Handles both new and existing users
  - Form for name/password (new users)
  - Simple confirmation (existing users)
  - Error handling for invalid/expired invites
- Updated Settings tabs to include Team tab
- Added invite token URL handling (`?invite-token=xxx`)

**File:** `src/types/index.ts`
- Added 'accept-invite' to View type

## Permission System

### Role Permissions:
| Permission | Admin | Member | Viewer |
|------------|-------|--------|--------|
| team:read | ✓ | ✓ | ✓ |
| team:invite | ✓ | - | - |
| team:remove | ✓ | - | - |
| team:update_role | ✓ | - | - |
| project:create | ✓ | ✓ | - |
| project:read | ✓ | ✓ | ✓ |
| project:update | ✓ | ✓ | - |
| project:delete | ✓ | - | - |
| scan:create | ✓ | ✓ | - |
| scan:read | ✓ | ✓ | ✓ |
| violation:read | ✓ | ✓ | ✓ |
| violation:update | ✓ | ✓ | - |
| report:create | ✓ | ✓ | - |
| report:read | ✓ | ✓ | ✓ |
| settings:read | ✓ | ✓ | ✓ |
| settings:update | ✓ | - | - |
| billing:read | ✓ | - | - |
| billing:update | ✓ | - | - |

## Team Size Limits by Plan
- **Starter**: 2 users
- **Agency**: 5 users
- **Enterprise**: Unlimited

## Database Migration
- Ran `bun run db:push` to sync schema changes
- Prisma client regenerated automatically

## Lint Status
- No errors: `bun run lint` passes cleanly

## Integration Points
- Uses existing auth system (`verifyToken`, `signTokenWithCsrf`)
- Uses existing email service (`sendTeamInviteEmail`)
- Uses existing audit log system
- Integrates with organization plan limits

## Notes for Future Agents
- The invite URL format is `?invite-token=xxx` (not `/accept-invite?token=xxx`)
- The last admin protection prevents removing/demoting the last admin
- Team size limits count both current members and pending invites
- Invite tokens expire after 7 days
