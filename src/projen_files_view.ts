import * as vscode from "vscode";
import { ProjenInfo } from "./projen_info";

type TreeType = void | File | null | undefined;

export class ProjenFileView implements vscode.TreeDataProvider<File> {
  public _onDidChangeTreeData: vscode.EventEmitter<TreeType> =
    new vscode.EventEmitter<TreeType>();
  readonly onDidChangeTreeData: vscode.Event<TreeType> =
    this._onDidChangeTreeData.event;

  constructor(private projenInfo: ProjenInfo) {}

  getTreeItem(element: File): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: File): Promise<File[]> {
    if (!element) {
      return Promise.resolve(
        this.projenInfo.managedFiles.map((file: vscode.Uri) => new File(file))
      );
    }

    return Promise.resolve([]);
  }
}

class File extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("file");
  constructor(public readonly file: vscode.Uri) {
    super(file, vscode.TreeItemCollapsibleState.None);

    this.iconPath = vscode.ThemeIcon.File;
  }
}
