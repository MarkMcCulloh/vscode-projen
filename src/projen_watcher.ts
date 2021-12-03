import * as vscode from "vscode";

class ProjenWatcher {
  readonly projenDirectoryWatcher: vscode.FileSystemWatcher;
  readonly projenFileWatcher: vscode.FileSystemWatcher;

  constructor() {
    this.projenDirectoryWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.workspace.rootPath!, ".projen/**"),
      false,
      false,
      true
    );

    this.projenFileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.workspace.rootPath!,
        ".projenrc.{ts,js}"
      ),
      false,
      false,
      true
    );
  }
}
