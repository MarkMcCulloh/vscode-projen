import * as vscode from "vscode";
import { ProjenInfo, ProjenStep, ProjenTask } from "./projen_info";

type TreeType = void | Task | Step | null | undefined;

export class ProjenTaskView implements vscode.TreeDataProvider<Task | Step> {
  public _onDidChangeTreeData: vscode.EventEmitter<TreeType> =
    new vscode.EventEmitter<TreeType>();
  readonly onDidChangeTreeData: vscode.Event<TreeType> =
    this._onDidChangeTreeData.event;
  private tasks: Task[] = [];

  constructor(private projenInfo: ProjenInfo) {}

  getTreeItem(element: Task): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Task | Step): Promise<Task[] | Step[]> {
    if (!element) {
      return Promise.resolve(
        this.projenInfo.tasks.map((t) => {
          const task = new Task(t);
          this.tasks.push(task);
          return task;
        })
      );
    } else if (element instanceof Task) {
      const task = this.projenInfo.tasks.find(
        (t) => t.name === element.label!
      )!;
      return Promise.resolve(
        task.steps.map((s: ProjenStep) => {
          if (s.type === "spawn") {
            return this.tasks.find((t) => t.label! === s.value)!;
          } else {
            return new Step(s.value);
          }
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
  constructor(obj: ProjenTask) {
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
  constructor(public readonly text: string) {
    super(text, vscode.TreeItemCollapsibleState.None);

    this.tooltip = "";
  }
}
