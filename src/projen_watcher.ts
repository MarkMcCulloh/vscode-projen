import { debounce } from "ts-debounce";
import * as vscode from "vscode";
import { ProjenInfo } from "./projen_info";

export class ProjenWatcher {
  readonly projenDirectoryWatcher: vscode.FileSystemWatcher;
  readonly projenFileWatcher: vscode.FileSystemWatcher;

  constructor(private projenInfo: ProjenInfo) {
    this.projenDirectoryWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.projenInfo.workspaceRoot, ".projen/**"),
      false,
      false,
      true
    );

    this.projenFileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        this.projenInfo.workspaceRoot,
        ".projenrc.{ts,js}"
      ),
      false,
      false,
      true
    );
  }

  onDirectoryChange(listener: (e: vscode.Uri) => any) {
    debounce(() => {
      this.projenDirectoryWatcher.onDidCreate(listener);
      this.projenDirectoryWatcher.onDidChange(listener);
    }, 500);
  }

  onProjenChange(listener: (e: vscode.Uri) => any) {
    debounce(() => {
      this.projenFileWatcher.onDidCreate(listener);
      this.projenFileWatcher.onDidChange(listener);
    }, 500);
  }
}
