import * as vscode from "vscode";

export class GeneratedFileDecorationProvider
  implements vscode.FileDecorationProvider
{
  private static Decoration: vscode.FileDecoration = {
    color: new vscode.ThemeColor(
      vscode.workspace
        .getConfiguration("projen")
        .get("managedFiles.decoration.themeColor")!
    ),
    badge: vscode.workspace
      .getConfiguration("projen")
      .get("managedFiles.decoration.badge"),
    tooltip: "Managed By Projen. Edit the projenrc file to make changes.",
  };
  private lastBadge: string = "PJ";
  private lastColor: string = "gitDecoration.ignoredResourceForeground";

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
    if (
      this.files.length == 0 ||
      !vscode.workspace
        .getConfiguration("projen")
        .get("managedFiles.decoration.enable")
    ) {
      return null;
    }

    if (this.files.includes(uri.toString())) {
      const newBadge = vscode.workspace
        .getConfiguration("projen")
        .get("managedFiles.decoration.badge") as string;
      if (this.lastBadge !== newBadge) {
        GeneratedFileDecorationProvider.Decoration.badge = newBadge;
      }
      const newColor = vscode.workspace
        .getConfiguration("projen")
        .get("managedFiles.decoration.themeColor") as string;
      if (this.lastColor !== newColor) {
        GeneratedFileDecorationProvider.Decoration.color =
          new vscode.ThemeColor(newColor);
      }

      return GeneratedFileDecorationProvider.Decoration;
    } else {
      return null;
    }
  }
}
