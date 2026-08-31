import * as vscode from 'vscode';
import { AccessGuardClient, Violation, ScanResult } from './client';

export class DiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private outputChannel: vscode.OutputChannel;

  constructor(private client: AccessGuardClient) {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection('accessguard');
    this.outputChannel = vscode.window.createOutputChannel('AccessGuard');
  }

  async scanDocument(document: vscode.TextDocument): Promise<void> {
    if (!this.client.isConfigured()) {
      vscode.window.showWarningMessage(
        'AccessGuard: API key not configured. Run AccessGuard: Configure Settings'
      );
      return;
    }

    const content = document.getText();
    const filePath = document.fileName;

    try {
      const result = await this.client.scanFile(filePath, content);
      this.updateDiagnostics(document, result);
      this.outputChannel.appendLine(
        `Scan complete: ${result.summary.critical} critical, ${result.summary.serious} serious, ${result.summary.moderate} moderate, ${result.summary.minor} minor`
      );
    } catch (error: any) {
      vscode.window.showErrorMessage(`AccessGuard scan failed: ${error.message}`);
      this.outputChannel.appendLine(`Scan error: ${error.message}`);
    }
  }

  private updateDiagnostics(
    document: vscode.TextDocument,
    result: ScanResult
  ): void {
    const config = vscode.workspace.getConfiguration('accessguard');
    const severityFilter = config.get<string[]>('severityFilter', [
      'critical',
      'serious',
      'moderate',
    ]);

    const diagnostics: vscode.Diagnostic[] = [];

    for (const violation of result.violations) {
      if (!severityFilter.includes(violation.severity)) continue;

      const line = (violation.line ?? 1) - 1;
      const column = (violation.column ?? 0);
      const range = new vscode.Range(
        new vscode.Position(line, column),
        new vscode.Position(line, column + (violation.element?.length || 10))
      );

      const severity = this.mapSeverity(violation.severity);
      const diagnostic = new vscode.Diagnostic(
        range,
        `[${violation.ruleId}] ${violation.message} (WCAG ${violation.wcagCriterion})`,
        severity
      );

      diagnostic.source = 'accessguard';
      diagnostic.code = violation.id;
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, range),
          `Element: ${violation.element}`
        ),
      ];

      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  private mapSeverity(
    severity: string
  ): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'critical':
        return vscode.DiagnosticSeverity.Error;
      case 'serious':
        return vscode.DiagnosticSeverity.Warning;
      case 'moderate':
        return vscode.DiagnosticSeverity.Information;
      case 'minor':
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Warning;
    }
  }

  clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  clearAll(): void {
    this.diagnosticCollection.clear();
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
    this.outputChannel.dispose();
  }
}
