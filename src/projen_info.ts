import * as fs from "fs";
import * as vscode from "vscode";
import { GeneratedFileDecorationProvider } from "./generated_file_decorator";

export class ProjenInfo {
  public managedFiles: string[] = [];
  public tasks: ProjenTask[] = [];
  public dependencies: ProjenDependency[] = [];
  decorator: GeneratedFileDecorationProvider;

  constructor(public workspaceRoot: string) {
    this.decorator = new GeneratedFileDecorationProvider();
    vscode.window.registerFileDecorationProvider(this.decorator);
  }

  async update() {
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(this.workspaceRoot, "*")
    );
    files.push(
      ...(await vscode.workspace.findFiles(
        new vscode.RelativePattern(this.workspaceRoot, ".projen/*")
      ))
    );

    const projenManaged: vscode.Uri[] = [];
    files.forEach((f) => {
      if (
        f.fsPath.endsWith("package-lock.json") ||
        f.fsPath.endsWith("yarn.lock")
      ) {
        // TODO handles all lock files
        // lock files are huge, would much rather not try to search them
        projenManaged.push(f);
      } else {
        const fileContent = fs.readFileSync(f.fsPath, "utf-8");
        if (
          fileContent.includes(
            `~~` + ` Generated by projen. To modify, edit .projenrc`
          )
        ) {
          projenManaged.push(f);
          if (f.fsPath.endsWith("tasks.json")) {
            const taskData = JSON.parse(fileContent).tasks;

            this.tasks = Object.values(taskData).map(
              (t: any) => new ProjenTask(t)
            );
          } else if (f.fsPath.endsWith("deps.json")) {
            const depData = JSON.parse(fileContent).dependencies;

            this.dependencies = depData.map(
              (d: any) => new ProjenDependency(d.name, d.type, d.version)
            );
          }
        }
      }
    });

    this.decorator.files = projenManaged.map((f) => f.fsPath);
    this.decorator.files.push("");
    this.decorator._onDidChangeFileDecorations.fire(projenManaged);

    this.managedFiles = projenManaged.map((file: vscode.Uri) => {
      const removedRoot = file.fsPath.replace(this.workspaceRoot, "");
      const betterFile = removedRoot.replace(/\\/g, "/");

      if (betterFile.startsWith("/")) {
        return betterFile.slice(1);
      } else {
        return betterFile;
      }
    });

    this.decorator._onDidChangeFileDecorations.fire(projenManaged);
  }
}
export class ProjenStep {
  constructor(public type: string, public value: string) {}
}

export class ProjenTask {
  public name: string;
  public description?: string;
  public steps: ProjenStep[];

  constructor(taskData: any) {
    this.name = taskData.name;
    this.description = taskData.description;
    this.steps = taskData.steps.map((s: any) => {
      const entries = Object.entries(s)[0];
      return new ProjenStep(entries[0], entries[1] as any);
    });
  }
}

export class ProjenDependency {
  constructor(
    public name: string,
    public type: string,
    public version?: string
  ) {}
}
