import * as vscode from "vscode";
import {
  ProjenDependency,
  ProjenInfo,
  ProjenStep,
  ProjenTask,
} from "./projen_info";

type TreeNodeType =
  | vscode.TreeItem
  | Task
  | Step
  | File
  | Dependency
  | Project
  | void
  | null
  | undefined;

export class ProjenView implements vscode.TreeDataProvider<TreeNodeType> {
  public _onDidChangeTreeData: vscode.EventEmitter<TreeNodeType> =
    new vscode.EventEmitter<TreeNodeType>();
  readonly onDidChangeTreeData: vscode.Event<TreeNodeType> =
    this._onDidChangeTreeData.event;
  private tasks: Task[] = [];

  constructor(private projenInfos: ProjenInfo[]) {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  // list all projects
  async getChildrenRoot() {
    if (this.projenInfos.length === 1) {
      return this.getChildrenProjects(this.projenInfos[0]);
    } else {
      return Promise.resolve(this.projenInfos.map((i) => new Project(i)));
    }
  }
  async getChildrenProjects(info: ProjenInfo) {
    return Promise.resolve([
      new BaseTreeItem(info, "Tasks", vscode.TreeItemCollapsibleState.Expanded),
      new BaseTreeItem(
        info,
        "Managed Files",
        vscode.TreeItemCollapsibleState.Collapsed
      ),
      new BaseTreeItem(
        info,
        "Dependencies",
        vscode.TreeItemCollapsibleState.Collapsed
      ),
    ]);
  }
  async getChildrenTasks(info: ProjenInfo) {
    return Promise.resolve(
      info.tasks.map((t) => {
        const task = new Task(t);
        this.tasks.push(task);
        return task;
      })
    );
  }
  async getChildrenSteps(info: ProjenInfo, currentTask: Task) {
    const task = info.tasks.find((t) => t.name === currentTask.label!)!;

    if (task.steps.length === 0) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      task.steps.map((s: ProjenStep) => {
        if (s.type === "spawn") {
          return this.tasks.find((t) => t.label! === s.value)!;
        } else {
          return new Step(info, s.value);
        }
      })
    );
  }
  async getChildrenDependencies(info: ProjenInfo) {
    return Promise.resolve(
      info.dependencies.map((dep: ProjenDependency) => {
        return new Dependency(dep);
      })
    );
  }
  async getChildrenManagedFiles(info: ProjenInfo) {
    return Promise.resolve(
      info.managedFiles.map((file: vscode.Uri) => new File(info, file))
    );
  }

  async getChildren(element?: TreeNodeType): Promise<TreeNodeType[]> {
    if (!element) {
      return this.getChildrenRoot();
    } else if (element instanceof Project) {
      return this.getChildrenProjects(element.projenInfo);
    } else if (element instanceof BaseTreeItem && element.label === "Tasks") {
      return this.getChildrenTasks(element.projenInfo);
    } else if (
      element instanceof BaseTreeItem &&
      element.label === "Managed Files"
    ) {
      return this.getChildrenManagedFiles(element.projenInfo);
    } else if (
      element instanceof BaseTreeItem &&
      element.label === "Dependencies"
    ) {
      return this.getChildrenDependencies(element.projenInfo);
    } else if (element instanceof Task) {
      return this.getChildrenSteps(element.projenInfo, element);
    }

    return Promise.resolve([]);
  }
}

class BaseTreeItem extends vscode.TreeItem {
  constructor(
    public readonly projenInfo: ProjenInfo,
    label: string | vscode.TreeItemLabel | vscode.Uri,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label as any, collapsibleState);
  }
}

class Task extends BaseTreeItem {
  public projenInfo: ProjenInfo;
  constructor(obj: ProjenTask) {
    super(
      obj.projenInfo,
      obj.name,
      obj.steps.length === 0
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Collapsed
    );
    this.projenInfo = obj.projenInfo;
    this.command = {
      title: "Run Task",
      command: "projen.runTask",
      arguments: [this.projenInfo, obj.name],
    };
    this.tooltip = obj.description;
    this.iconPath = new vscode.ThemeIcon(
      "play",
      new vscode.ThemeColor("terminal.ansiGreen")
    );
  }
}

class Step extends BaseTreeItem {
  constructor(projenInfo: ProjenInfo, text: string) {
    super(projenInfo, text, vscode.TreeItemCollapsibleState.None);

    this.tooltip = "";
    this.iconPath = new vscode.ThemeIcon("testing-unset-icon");
  }
}

class File extends BaseTreeItem {
  constructor(projenInfo: ProjenInfo, public readonly file: vscode.Uri) {
    super(projenInfo, file, vscode.TreeItemCollapsibleState.None);

    this.iconPath = vscode.ThemeIcon.File;
  }
}

class Project extends BaseTreeItem {
  constructor(info: ProjenInfo) {
    super(info, info.projectRoot, vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = vscode.ThemeIcon.Folder;
  }
}

class Dependency extends BaseTreeItem {
  constructor(public readonly obj: ProjenDependency) {
    super(
      obj.projenInfo,
      `${obj.type}`.padEnd(9, " ") +
        "| " +
        (obj.version ? `${obj.name} [${obj.version}]` : obj.name),
      vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = "";
    this.iconPath = new vscode.ThemeIcon("package");
  }
}
