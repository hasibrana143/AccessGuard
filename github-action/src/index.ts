import * as core from '@actions/core';
import * as github from '@actions/github';

const API_URL = 'https://api.accessguard.io';

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('api-key', { required: true });
    const projectId = core.getInput('project-id', { required: true });
    const command = core.getInput('command') || 'scan';
    const failOn = core.getInput('fail-on') || 'critical';
    const standard = core.getInput('standard') || 'wcag22aa';
    const format = core.getInput('format') || 'pdf';

    core.setSecret(apiKey);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    if (command === 'scan') {
      core.info('Starting accessibility scan...');

      const scanResult = await apiRequest<{
        scanId: string;
        status: string;
        summary: {
          score: number;
          critical: number;
          serious: number;
          moderate: number;
          minor: number;
        };
        violations: Array<{
          path: string;
          line: number;
          severity: string;
          ruleId: string;
          message: string;
        }>;
      }>(headers, '/api/scan', {
        method: 'POST',
        body: JSON.stringify({ projectId, standard }),
      });

      core.setOutput('score', scanResult.summary.score);
      core.setOutput('violations-count', scanResult.violations.length);
      core.setOutput('critical-count', scanResult.summary.critical);

      core.info(`Score: ${scanResult.summary.score}%`);
      core.info(`Critical: ${scanResult.summary.critical}`);
      core.info(`Serious: ${scanResult.summary.serious}`);
      core.info(`Moderate: ${scanResult.summary.moderate}`);
      core.info(`Minor: ${scanResult.summary.minor}`);

      for (const violation of scanResult.violations) {
        const annotation = `${violation.path}:${violation.line} - [${violation.severity}] ${violation.ruleId}: ${violation.message}`;
        if (violation.severity === 'critical') {
          core.error(annotation);
        } else {
          core.warning(annotation);
        }
      }

      const severityOrder = ['minor', 'moderate', 'serious', 'critical'];
      const failOnIndex = severityOrder.indexOf(failOn);
      const maxSeverity = scanResult.violations.reduce((max, v) => {
        const idx = severityOrder.indexOf(v.severity);
        return idx > max ? idx : max;
      }, 0);

      if (maxSeverity >= failOnIndex) {
        core.setFailed(`Accessibility check failed: ${scanResult.summary.critical} critical violations`);
      } else {
        core.info('Accessibility check passed');
      }
    } else if (command === 'generate-vpat') {
      core.info('Generating VPAT report...');

      const vpatResult = await apiRequest<{
        downloadUrl: string;
        expiresAt: string;
      }>(headers, `/api/projects/${projectId}/vpat`, {
        method: 'POST',
        body: JSON.stringify({ format, standard }),
      });

      core.setOutput('vpat-url', vpatResult.downloadUrl);
      core.info(`VPAT generated: ${vpatResult.downloadUrl}`);
    } else if (command === 'check-compliance') {
      core.info('Running compliance check...');

      const checkResult = await apiRequest<{
        score: number;
        passed: number;
        failed: number;
      }>(headers, '/api/check', {
        method: 'POST',
        body: JSON.stringify({ projectId, standard }),
      });

      core.setOutput('score', checkResult.score);
      core.info(`Compliance score: ${checkResult.score}%`);
      core.info(`Passed: ${checkResult.passed}, Failed: ${checkResult.failed}`);
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

async function apiRequest<T>(
  headers: Record<string, string>,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

run();
