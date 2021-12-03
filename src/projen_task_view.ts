import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

type TreeType = void | Task | Step | null | undefined;

export class ProjenTaskView implements vscode.TreeDataProvider<Task | Step> {
  tasks: Task[] = [];

  public _onDidChangeTreeData: vscode.EventEmitter<TreeType> =
    new vscode.EventEmitter<TreeType>();
  readonly onDidChangeTreeData: vscode.Event<TreeType> =
    this._onDidChangeTreeData.event;
  taskFileData: any;

  constructor(private workspaceRoot: string) {
    this.update(workspaceRoot);
  }

  update(workspaceRoot: string) {
    this.taskFileData = JSON.parse(
      fs.readFileSync(
        path.join(workspaceRoot, ".projen", "tasks.json"),
        "utf-8"
      )
    ).tasks;
    this.tasks = [];

    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Task): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Task | Step): Promise<Task[] | Step[]> {
    if (!this.workspaceRoot) {
      void vscode.window.showInformationMessage("No Tasks in empty workspace");
      return Promise.resolve([]);
    }

    if (!element) {
      return Promise.resolve(
        Object.values(this.taskFileData).map((t) => {
          const task = new Task(t);
          this.tasks.push(task);
          return task;
        })
      );
    } else if (element instanceof Task) {
      return Promise.resolve(
        element.obj.steps.map((s: any) => {
          if (s.spawn) {
            return this.tasks.find((t) => t.obj.name === s.spawn)!;
          }
          return new Step(s);
        })
      );
    }

    return Promise.resolve([]);
  }
}

class Task extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon(
    "play",
    new vscode.ThemeColor("terminal.ansiGreen")
  );
  constructor(public readonly obj: any) {
    super(obj.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.command = {
      title: "Run Task",
      command: "projen.runTask",
      arguments: [obj.name],
    };
    this.tooltip = obj.description;
  }
}

class Step extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("testing-unset-icon");
  constructor(public readonly obj: any) {
    super(
      Object.entries(obj)[0][1] as string,
      vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = "";
  }
}
