// Logger utility for consistent logging across the application

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  requestId?: string;
  userId?: string;
  orgId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty format for development
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
      let message = `${prefix} ${entry.message}`;

      if (entry.context) {
        message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
      }

      if (entry.error) {
        message += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
          message += `\n  Stack: ${entry.error.stack}`;
        }
      }

      return message;
    }

    // JSON format for production (for log aggregators)
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case 'debug':
        if (this.isDevelopment) console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };

    console.error(this.formatEntry(entry));
  }

  // API request logging
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: {
      userId?: string;
      orgId?: string;
      requestId?: string;
      ip?: string;
    }
  ) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `API ${method} ${path}`, {
      statusCode,
      duration: `${duration}ms`,
      ...context,
    });
  }

  // Security event logging
  security(
    event: string,
    context: {
      userId?: string;
      orgId?: string;
      ip?: string;
      userAgent?: string;
      success: boolean;
    }
  ) {
    this.log(context.success ? 'info' : 'warn', `Security: ${event}`, context);
  }
}

export const logger = new Logger();

// Audit action types
export const AuditActions = {
  // Authentication
  USER_SIGNIN: 'user.signin',
  USER_SIGNOUT: 'user.signout',
  USER_REGISTER: 'user.register',
  USER_PASSWORD_CHANGE: 'user.password_change',

  // Organization
  ORG_CREATED: 'organization.created',
  ORG_UPDATED: 'organization.updated',
  ORG_SETTINGS_CHANGED: 'organization.settings_changed',

  // Projects
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',

  // Scans
  SCAN_STARTED: 'scan.started',
  SCAN_COMPLETED: 'scan.completed',
  SCAN_FAILED: 'scan.failed',

  // Violations
  VIOLATION_VIEWED: 'violation.viewed',
  VIOLATION_UPDATED: 'violation.updated',
  VIOLATION_FIXED: 'violation.fixed',

  // Remediation
  REMEDIATION_GENERATED: 'remediation.generated',
  REMEDIATION_APPLIED: 'remediation.applied',

  // Security
  SECURITY_RATE_LIMIT: 'security.rate_limit',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];
