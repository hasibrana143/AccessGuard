import { db } from './db';

interface CreateIntegrationLogInput {
  integrationId: string;
  action: string; // 'test' | 'create_issue' | 'update_issue' | 'notify'
  status: 'success' | 'failed' | 'partial';
  payload?: string;
  response?: string;
  error?: string;
}

export async function createIntegrationLog(input: CreateIntegrationLogInput): Promise<void> {
  try {
    await db.integrationLog.create({
      data: {
        integrationId: input.integrationId,
        action: input.action,
        status: input.status,
        payload: input.payload,
        response: input.response,
        error: input.error,
      },
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the main flow
    console.error('Failed to create integration log:', error);
  }
}

export async function getIntegrationLogs(
  integrationId: string,
  options?: { limit?: number; offset?: number; action?: string }
) {
  const where: Record<string, any> = { integrationId };
  if (options?.action) where.action = options.action;

  const [logs, total] = await Promise.all([
    db.integrationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.integrationLog.count({ where }),
  ]);

  return { logs, total };
}