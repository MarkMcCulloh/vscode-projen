import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

type TreeType = void | Dependency | null | undefined;

export class ProjenDependencyView
  implements vscode.TreeDataProvider<Dependency>
{
  public _onDidChangeTreeData: vscode.EventEmitter<TreeType> =
    new vscode.EventEmitter<TreeType>();
  readonly onDidChangeTreeData: vscode.Event<TreeType> =
    this._onDidChangeTreeData.event;
  depFileData: any;

  constructor(private workspaceRoot: string) {
    this.update(workspaceRoot);
  }

  getTreeItem(element: Dependency): vscode.TreeItem {
    return element;
  }

  update(workspaceRoot: string) {
    this.depFileData = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, ".projen", "deps.json"), "utf-8")
    ).dependencies;

    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: Dependency): Promise<Dependency[]> {
    if (!this.workspaceRoot) {
      void vscode.window.showInformationMessage("No deps in empty workspace");
      return Promise.resolve([]);
    }

    if (!element) {
      return Promise.resolve(
        this.depFileData.map((dep: any) => {
          return new Dependency(dep);
        })
      );
    }

    return Promise.resolve([]);
  }
}

class Dependency extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("package");
  constructor(public readonly obj: any) {
    super(
      `${obj.type}`.padEnd(9, " ") +
        "| " +
        (obj.version ? `${obj.name} [${obj.version}]` : obj.name),
      vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = "";
  }
}
