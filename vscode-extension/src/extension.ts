import * as vscode from 'vscode';
import { AccessGuardClient } from './client';
import { DiagnosticsProvider } from './diagnostics';
import { ScanCommands } from './commands';

let client: AccessGuardClient;
let diagnostics: DiagnosticsProvider;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('accessguard');
  client = new AccessGuardClient(
    config.get<string>('apiKey', ''),
    config.get<string>('orgId', ''),
    config.get<string>('apiUrl', 'https://api.accessguard.io')
  );

  diagnostics = new DiagnosticsProvider(client);

  const commands = new ScanCommands(client, diagnostics);
  context.subscriptions.push(
    vscode.commands.registerCommand('accessguard.scanFile', () => commands.scanCurrentFile()),
    vscode.commands.registerCommand('accessguard.scanWorkspace', () => commands.scanWorkspace()),
    vscode.commands.registerCommand('accessguard.showOutput', () => commands.showOutput()),
    vscode.commands.registerCommand('accessguard.configure', () => commands.configure())
  );

  const autoScanOnSave = config.get<boolean>('autoScanOnSave', false);
  if (autoScanOnSave) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (isSupportedLanguage(doc.languageId)) {
          diagnostics.scanDocument(doc);
        }
      })
    );
  }

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'html' },
      new AccessGuardCodeActionProvider(diagnostics),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  vscode.window.showInformationMessage('AccessGuard activated');
}

function isSupportedLanguage(languageId: string): boolean {
  const supported = ['html', 'typescriptreact', 'javascriptreact', 'typescript', 'javascript', 'vue', 'svelte'];
  return supported.includes(languageId);
}

export function deactivate() {
  client?.dispose();
  diagnostics?.dispose();
}

class AccessGuardCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private diagProvider: DiagnosticsProvider) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'accessguard') continue;

      const violationId = diagnostic.code as string;
      if (!violationId) continue;

      const fixAction = new vscode.CodeAction(
        `Fix with AccessGuard: ${diagnostic.message}`,
        vscode.CodeActionKind.QuickFix
      );
      fixAction.command = {
        command: 'accessguard.applyFix',
        title: 'Apply AccessGuard Fix',
        arguments: [violationId, document, diagnostic.range],
      };
      fixAction.diagnostics = [diagnostic];
      fixAction.isPreferred = true;
      actions.push(fixAction);
    }

    return actions;
  }
}
