import * as vscode from "vscode";

export class GeneratedFileDecorationProvider
  implements vscode.FileDecorationProvider
{
  private static Decoration: vscode.FileDecoration = {
    color: new vscode.ThemeColor("gitDecoration.ignoredResourceForeground"),
    badge: "PJ",
    tooltip: "Managed By Projen. Edit the projenrc file to make changes.",
  };

  public files: string[];

  public _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri[]> =
    new vscode.EventEmitter<vscode.Uri[]>();
  readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri[]> =
    this._onDidChangeFileDecorations.event;

  constructor() {
    this.files = [];
  }

  provideFileDecoration(
    uri: vscode.Uri,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FileDecoration> {
    if (this.files.length == 0) {
      return null;
    }

    if (this.files.includes(uri.fsPath)) {
      return GeneratedFileDecorationProvider.Decoration;
    } else {
      return null;
    }
  }
}
