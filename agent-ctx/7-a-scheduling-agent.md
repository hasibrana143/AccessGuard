# Task 7-a: Scheduled Scans with Cron Job System

## Agent: Scheduling Agent

## Summary

Successfully implemented a comprehensive scheduled scans system with cron job functionality for the AccessGuard application.

## Files Created

### 1. Prisma Schema Updates (`prisma/schema.prisma`)
- Added `ScheduledScan` model with fields:
  - `id`, `projectId`, `cron` (cron expression)
  - `nextRunAt`, `lastRunAt`, `enabled`
  - `createdAt`, `updatedAt`
- Updated `Project` model to include `scheduledScans` relation

### 2. Scheduler Library (`src/lib/scheduler.ts`)
- `validateCronExpression(expression)` - Validates cron format
- `getNextRunTime(cronExpression)` - Calculate next run time
- `getFutureRunTimes(cronExpression, count)` - Get multiple future run times
- `getCronDescription(expression)` - Human-readable cron description
- `getPresetFromCron(expression)` - Match cron to preset
- `parseCronExpression(expression)` - Parse cron into components
- `createCronExpression(components)` - Build cron from components
- `getTimeUntilNextRun(nextRunAt)` - Human-readable time until next run
- `formatScheduleDate(date)` - Format date for display
- `SCHEDULE_PRESETS` - Common schedules (hourly, daily, weekly, monthly)
- Configuration helpers for API key, max concurrent scans, and port

### 3. Scheduler Mini-Service (`mini-services/scheduler/index.ts`)
- Independent Bun-based background service (port 3001)
- Checks for scheduled scans every minute
- Handles concurrent scan limits (default: 3)
- Graceful shutdown handling
- Comprehensive logging
- API key authentication for internal communication

### 4. API Routes

#### `/api/schedule/route.ts`
- `GET` - List scheduled scans for organization
- `POST` - Create new scheduled scan
- `DELETE` - Cancel scheduled scan by ID or project ID
- `PATCH` - Update schedule (enable/disable, change cron)

#### `/api/schedule/[id]/route.ts`
- `GET` - Get specific scheduled scan with recent scan history
- `DELETE` - Delete scheduled scan
- `PATCH` - Update scheduled scan

#### `/api/schedule/process/route.ts`
- Internal endpoint for scheduler service
- `POST` - Trigger scan for project (API key protected)
- `GET` - Health check endpoint

### 5. React Hooks (`src/hooks/useSchedule.ts`)
- `useScheduledScans(projectId?)` - List schedules
- `useScheduledScan(id)` - Get specific schedule
- `useCreateSchedule()` - Create schedule mutation
- `useUpdateSchedule()` - Update schedule mutation
- `useDeleteSchedule()` - Delete schedule mutation
- `useDeleteScheduleByProject()` - Delete by project ID

### 6. UI Updates (`src/app/page.tsx`)
- Added schedule dialog with preset and custom cron options
- Updated project card to show next scheduled scan time
- Added "Schedule" option to project dropdown menu
- Show schedule status (Scheduled/Paused) badge
- Display time until next run

### 7. Types (`src/types/index.ts`)
- Added `ScheduledScan` interface
- Added `CreateScheduleInput` interface
- Added `UpdateScheduleInput` interface

### 8. Package Configuration (`package.json`)
- Added `"scheduler": "bun run mini-services/scheduler/index.ts"` script

## Features Implemented

1. **Schedule Presets**
   - Hourly (every hour)
   - Daily (every day at 2 AM)
   - Weekly (every Monday at 2 AM)
   - Monthly (1st of month at 2 AM)
   - Custom cron expression

2. **Schedule Management**
   - Create/update/delete schedules
   - Enable/disable schedules
   - View last run and next run times
   - Recent scan history per schedule

3. **Background Processing**
   - Independent scheduler service
   - Concurrent scan limiting
   - Automatic next run calculation
   - Graceful error handling

## Dependencies Added
- `cron-parser` - For parsing and calculating cron expressions
- `cronstrue` - For human-readable cron descriptions

## Environment Variables (Optional)
- `SCHEDULER_PORT` - Scheduler service port (default: 3001)
- `SCHEDULER_API_KEY` - API key for internal communication
- `MAX_CONCURRENT_SCANS` - Max concurrent scans (default: 3)

## Verification
- ✅ `bun run db:push` - Database schema updated successfully
- ✅ `bun run lint` - No ESLint errors
- ✅ Scheduler service started successfully

## Usage

1. Start the scheduler service:
   ```bash
   bun run scheduler
   ```

2. In the UI, click on a project's dropdown menu and select "Schedule"

3. Choose a preset schedule or enter a custom cron expression

4. Enable/disable the schedule as needed

5. The scheduler will automatically trigger scans at the specified times
