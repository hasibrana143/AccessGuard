import * as vscode from 'vscode';
import * as path from 'path';
import { AccessGuardClient, FixResult } from './client';
import { DiagnosticsProvider } from './diagnostics';

export class ScanCommands {
  constructor(
    private client: AccessGuardClient,
    private diagnostics: DiagnosticsProvider
  ) {}

  async scanCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    if (!this.client.isConfigured()) {
      vscode.window.showWarningMessage(
        'AccessGuard: API key not configured. Run AccessGuard: Configure Settings'
      );
      return;
    }

    await this.diagnostics.scanDocument(editor.document);
  }

  async scanWorkspace(): Promise<void> {
    if (!this.client.isConfigured()) {
      vscode.window.showWarningMessage(
        'AccessGuard: API key not configured. Run AccessGuard: Configure Settings'
      );
      return;
    }

    const files = await vscode.workspace.findFiles(
      '**/*.{html,htm,jsx,tsx,vue,svelte}',
      '**/node_modules/**'
    );

    if (files.length === 0) {
      vscode.window.showInformationMessage('No scannable files found');
      return;
    }

    vscode.window.showInformationMessage(
      `AccessGuard: Scanning ${files.length} files...`
    );

    let scanned = 0;
    for (const file of files) {
      try {
        const doc = await vscode.workspace.openTextDocument(file);
        await this.diagnostics.scanDocument(doc);
        scanned++;
      } catch {
        // Skip files that can't be opened
      }
    }

    vscode.window.showInformationMessage(
      `AccessGuard: Scan complete. ${scanned}/${files.length} files scanned`
    );
  }

  showOutput(): void {
    const channel = vscode.window.createOutputChannel('AccessGuard');
    channel.show();
  }

  async configure(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your AccessGuard API key',
      placeHolder: 'agk_...',
      password: true,
      validateInput: (value) => {
        if (!value) return 'API key is required';
        if (!value.startsWith('agk_')) return 'API key should start with agk_';
        return null;
      },
    });

    if (!apiKey) return;

    const orgId = await vscode.window.showInputBox({
      prompt: 'Enter your AccessGuard Organization ID',
      placeHolder: 'org_...',
      validateInput: (value) => {
        if (!value) return 'Organization ID is required';
        return null;
      },
    });

    if (!orgId) return;

    const config = vscode.workspace.getConfiguration('accessguard');
    await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
    await config.update('orgId', orgId, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage('AccessGuard: Settings configured successfully');
  }

  async applyFix(
    violationId: string,
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<void> {
    try {
      const fix: FixResult = await this.client.generateFix(violationId);

      const confidence = Math.round(fix.confidence * 100);
      const action = await vscode.window.showInformationMessage(
        `AccessGuard fix (${confidence}% confidence): ${fix.explanation}`,
        'Apply Fix',
        'Show Diff',
        'Cancel'
      );

      if (action === 'Apply Fix') {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, fix.code);
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage('AccessGuard: Fix applied');
      } else if (action === 'Show Diff') {
        this.showDiff(document, range, fix.code);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`AccessGuard fix failed: ${error.message}`);
    }
  }

  private showDiff(
    document: vscode.TextDocument,
    range: vscode.Range,
    newCode: string
  ): void {
    const original = document.getText(range);
    const diffContent = [
      `--- Original`,
      `+++ Suggested Fix (${Math.round(0.92 * 100)}% confidence)`,
      `@@ -${range.start.line + 1},${range.end.line - range.start.line + 1} +${range.start.line + 1},1 @@`,
      `-${original}`,
      `+${newCode}`,
    ].join('\n');

    const tempUri = vscode.Uri.parse(
      `accessguard-diff://${document.fileName}.fix`
    );
    const panel = vscode.window.createWebviewPanel(
      'accessguardDiff',
      `AccessGuard Fix: ${path.basename(document.fileName)}`,
      vscode.ViewColumn.Beside,
      { enableScripts: false }
    );
    panel.webview.html = `<!DOCTYPE html>
<html>
<head><style>body{font-family:monospace;padding:16px;white-space:pre-wrap;}del{background:#ffcccc;color:#c00}ins{background:#ccffcc;color:#060}</style></head>
<body><pre>${diffContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body>
</html>`;
  }
}
