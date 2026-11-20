import * as core from '@actions/core';
import * as github from '@actions/github';

const API_URL = core.getInput('api-url') || 'https://api.accessguard.io';

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('api-key', { required: true });
    const projectId = core.getInput('project-id', { required: true });
    const command = core.getInput('command') || 'scan';
    const failOn = core.getInput('fail-on') || 'critical';
    const standard = core.getInput('standard') || 'wcag22aa';
    const format = core.getInput('format') || 'json';
    const url = core.getInput('url') || '';

    core.setSecret(apiKey);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    if (command === 'scan') {
      core.info('Starting accessibility scan...');

      const scanResult = await apiRequest<{
        success: boolean;
        scanId: string;
        violationsFound: number;
        pagesScanned: number;
        severityCounts: { critical: number; serious: number; moderate: number; minor: number };
        riskScore: number;
        errorMessage?: string;
      }>(headers, '/api/v1/scans', {
        method: 'POST',
        body: JSON.stringify({ projectId, url: url || undefined }),
      });

      if (!scanResult.success) {
        core.setFailed(`Scan failed: ${scanResult.errorMessage}`);
        return;
      }

      core.setOutput('scan-id', scanResult.scanId);
      core.setOutput('violations-found', scanResult.violationsFound.toString());
      core.setOutput('pages-scanned', scanResult.pagesScanned.toString());
      core.setOutput('risk-score', scanResult.riskScore.toString());
      core.setOutput('critical-count', scanResult.severityCounts.critical.toString());
      core.setOutput('serious-count', scanResult.severityCounts.serious.toString());
      core.setOutput('moderate-count', scanResult.severityCounts.moderate.toString());
      core.setOutput('minor-count', scanResult.severityCounts.minor.toString());

      core.info(`Scan ID: ${scanResult.scanId}`);
      core.info(`Pages scanned: ${scanResult.pagesScanned}`);
      core.info(`Violations found: ${scanResult.violationsFound}`);
      core.info(`Risk score: ${scanResult.riskScore}/100`);
      core.info(`Critical: ${scanResult.severityCounts.critical}`);
      core.info(`Serious: ${scanResult.severityCounts.serious}`);
      core.info(`Moderate: ${scanResult.severityCounts.moderate}`);
      core.info(`Minor: ${scanResult.severityCounts.minor}`);

      const severityOrder = ['minor', 'moderate', 'serious', 'critical'];
      const failOnIndex = severityOrder.indexOf(failOn.toLowerCase());
      const maxSeverityIndex = severityOrder.findIndex((_, i) => {
        const count = scanResult.severityCounts[severityOrder[i] as keyof typeof scanResult.severityCounts];
        return count > 0;
      });

      if (maxSeverityIndex >= failOnIndex && maxSeverityIndex !== -1) {
        core.setFailed(`Accessibility check failed: ${scanResult.severityCounts.critical} critical, ${scanResult.severityCounts.serious} serious violations`);
      } else {
        core.info('Accessibility check passed');
      }
    } else if (command === 'generate-vpat') {
      core.info('Generating VPAT report...');

      const vpatResult = await apiRequest<{
        project: { id: string; name: string; url: string };
        vpat: { criteria: Array<{ id: string; level: string; name: string; conformance: string; remarks: string }>; summary: { supports: number; partiallySupports: number; doesNotSupport: number; notEvaluated: number } };
        generatedAt: string;
      }>(headers, `/api/v1/reports/vpat?projectId=${encodeURIComponent(projectId)}`, {
        method: 'GET',
      });

      core.setOutput('vpat-generated-at', vpatResult.generatedAt);
      core.info(`VPAT generated at: ${vpatResult.generatedAt}`);
      core.info(`Summary: ${vpatResult.vpat.summary.supports} supports, ${vpatResult.vpat.summary.partiallySupports} partially supports, ${vpatResult.vpat.summary.doesNotSupport} does not support, ${vpatResult.vpat.summary.notEvaluated} not evaluated`);

      // Write VPAT to file if requested
      if (format === 'json') {
        const fs = await import('fs');
        const path = await import('path');
        const outputPath = path.resolve(process.cwd(), 'vpat-report.json');
        fs.writeFileSync(outputPath, JSON.stringify(vpatResult, null, 2));
        core.info(`VPAT written to ${outputPath}`);
      }
    } else if (command === 'check-compliance') {
      core.info('Running compliance check...');

      const scanResult = await apiRequest<{
        success: boolean;
        scanId: string;
        violationsFound: number;
        pagesScanned: number;
        severityCounts: { critical: number; serious: number; moderate: number; minor: number };
        riskScore: number;
        errorMessage?: string;
      }>(headers, '/api/v1/scans', {
        method: 'POST',
        body: JSON.stringify({ projectId, url: url || undefined }),
      });

      if (!scanResult.success) {
        core.setFailed(`Scan failed: ${scanResult.errorMessage}`);
        return;
      }

      core.setOutput('score', (100 - scanResult.riskScore).toString());
      core.setOutput('violations-found', scanResult.violationsFound.toString());
      core.setOutput('pages-scanned', scanResult.pagesScanned.toString());
      core.setOutput('risk-score', scanResult.riskScore.toString());

      const passed = scanResult.severityCounts.minor + scanResult.severityCounts.moderate;
      const failed = scanResult.severityCounts.serious + scanResult.severityCounts.critical;

      core.setOutput('passed', passed.toString());
      core.setOutput('failed', failed.toString());

      core.info(`Compliance score: ${100 - scanResult.riskScore}%`);
      core.info(`Risk score: ${scanResult.riskScore}/100`);
      core.info(`Passed (minor+moderate): ${passed}, Failed (serious+critical): ${failed}`);

      if (failed > 0) {
        core.setFailed(`Compliance check failed: ${failed} serious/critical violations`);
      } else {
        core.info('Compliance check passed');
      }
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