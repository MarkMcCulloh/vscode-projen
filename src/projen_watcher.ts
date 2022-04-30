import * as vscode from "vscode";
import { ProjenInfo } from "./projen_info";

export class ProjenWatcher {
  readonly projenDirectoryWatcher: vscode.FileSystemWatcher;
  readonly projenFileWatcher: vscode.FileSystemWatcher;

  constructor(public projenInfo: ProjenInfo) {
    this.projenDirectoryWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.projenInfo.projectRoot, ".projen/**"),
      false,
      false,
      false
    );

    this.projenFileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        this.projenInfo.projectRoot,
        ".projenrc.{ts,js}"
      ),
      false,
      false,
      false
    );
  }

  onDirectoryChange(listener: (e: vscode.Uri) => any) {
    this.projenDirectoryWatcher.onDidCreate(listener);
    this.projenDirectoryWatcher.onDidChange(listener);
    this.projenDirectoryWatcher.onDidDelete(listener);
  }

  onProjenChange(listener: (e: vscode.Uri) => any) {
    this.projenFileWatcher.onDidCreate(listener);
    this.projenFileWatcher.onDidChange(listener);
    this.projenFileWatcher.onDidDelete(listener);
  }
}
