import * as vscode from "vscode";
import { ProjenDependency, ProjenInfo } from "./projen_info";

type TreeType = void | Dependency | null | undefined;

export class ProjenDependencyView
  implements vscode.TreeDataProvider<Dependency>
{
  public _onDidChangeTreeData: vscode.EventEmitter<TreeType> =
    new vscode.EventEmitter<TreeType>();
  readonly onDidChangeTreeData: vscode.Event<TreeType> =
    this._onDidChangeTreeData.event;

  constructor(private projenInfo: ProjenInfo) {}

  getTreeItem(element: Dependency): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Dependency): Promise<Dependency[]> {
    if (!element) {
      return Promise.resolve(
        this.projenInfo.dependencies.map((dep: ProjenDependency) => {
          return new Dependency(dep);
        })
      );
    }

    return Promise.resolve([]);
  }
}

class Dependency extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("package");
  constructor(public readonly obj: ProjenDependency) {
    super(
      `${obj.type}`.padEnd(9, " ") +
        "| " +
        (obj.version ? `${obj.name} [${obj.version}]` : obj.name),
      vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = "";
  }
}
