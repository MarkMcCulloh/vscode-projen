import * as vscode from "vscode";
import { GeneratedFileDecorationProvider } from "./generated_file_decorator";

async function readTextFromFile(uri: vscode.Uri) {
  const readData = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder("utf-8").decode(readData);
}

export class ProjenInfo {
  public managedFiles: vscode.Uri[] = [];
  public tasks: ProjenTask[] = [];
  public dependencies: ProjenDependency[] = [];
  public rcFile?: vscode.Uri;
  public label: string;
  previouslyManaged: vscode.Uri[];
  decorator: GeneratedFileDecorationProvider;

  constructor(
    public workspaceFolder: vscode.WorkspaceFolder,
    public projectRoot: vscode.Uri
  ) {
    this.previouslyManaged = [];
    this.label = projectRoot.path
      .toLowerCase()
      .replace(workspaceFolder.uri.path.toLowerCase(), "");

    if (this.label.startsWith("/")) {
      this.label = this.label.slice(1);
    }
    if (this.label === "") {
      this.label = workspaceFolder.name;
    }
    this.decorator = new GeneratedFileDecorationProvider();
    vscode.window.registerFileDecorationProvider(this.decorator);
  }

  async update() {
    const projenFolderFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(this.projectRoot, ".projen/*")
    );
    const rootFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(this.projectRoot, "*")
    );

    if (projenFolderFiles.length == 0) {
      void vscode.commands.executeCommand(
        "setContext",
        "projen.inProject",
        false
      );

      this.managedFiles = [];
      this.dependencies = [];
      this.decorator.files = [];

      if (
        rootFiles.length === 0 &&
        (
          await vscode.workspace.findFiles(
            new vscode.RelativePattern(this.projectRoot, "**"),
            undefined,
            1
          )
        ).length === 0
      ) {
        // in an empty workspace

        const choice = await vscode.window.showInformationMessage(
          "Looks like you're in an empty folder, would you like to generate a project with projen?",
          "Sure!",
          "No Thanks!"
        );

        if (choice === "Sure!") {
          void vscode.commands.executeCommand("projen.new");
        }
      }

      return;
    }

    this.rcFile = rootFiles.find((r) => r.path.includes(".projenrc."));

    let files: vscode.Uri[] = [];
    let verifiedFiles = false;

    const fileManifestUri = projenFolderFiles.find((f) =>
      f.path.endsWith("files.json")
    );
    if (fileManifestUri) {
      try {
        const fileManifest = await readTextFromFile(fileManifestUri);
        const fileData: string[] = JSON.parse(fileManifest).files;
        files = fileData.map((f) => vscode.Uri.joinPath(this.projectRoot, f));

        // handles special cases
        const specialFiles = rootFiles.filter(
          (f) =>
            f.path.endsWith("package-lock.json") ||
            f.path.endsWith(".lock") ||
            f.path.endsWith("package.json")
        );
        if (specialFiles.length > 0) {
          files.push(...specialFiles);
        }

        verifiedFiles = true;
      } catch (error) {
        console.error(error);
      }

      if (files.length === 0) {
        files.push(...rootFiles, ...projenFolderFiles);
      }
    }

    void vscode.commands.executeCommand("setContext", "projen.inProject", true);

    const projenManaged: vscode.Uri[] = [];
    for (const f of files) {
      if (
        verifiedFiles ||
        f.path.endsWith("package-lock.json") ||
        f.path.endsWith(".lock")
      ) {
        // TODO handle lockfiles in a smarter way
        // Since dependencies are managed by projen, a lockfile is as well (kinda)
        // lock files are typically huge, would much rather not try to search them
        projenManaged.push(f);
      } else {
        const fileContent = await readTextFromFile(f);
        if (
          fileContent.includes(
            `~~` + ` Generated by projen. To modify, edit .projenrc`
          )
        ) {
          projenManaged.push(f);
        }
      }
    }

    const taskFile = projenFolderFiles.find((file) =>
      file.path.endsWith("tasks.json")
    );
    if (taskFile) {
      const fileContent = await readTextFromFile(taskFile);
      const taskData = JSON.parse(fileContent).tasks;

      this.tasks = Object.values(taskData).map(
        (t: any) => new ProjenTask(this, t)
      );
      this.tasks.sort((a, b) => a.name.localeCompare(b.name));
    }

    const depFile = projenFolderFiles.find((file) =>
      file.path.endsWith("deps.json")
    );
    if (depFile) {
      const fileContent = await readTextFromFile(depFile);
      const depData = JSON.parse(fileContent).dependencies;
      depData.sort((a: any, b: any) => a.name.localeCompare(b.name));

      this.dependencies = depData.map(
        (d: any) => new ProjenDependency(this, d.name, d.type, d.version)
      );
    }

    const directoryMap: any = {};
    projenManaged.forEach((f) => {
      const directory = f.with({
        path: f.path.replace(/\\/g, "/").split("/").slice(0, -1).join("/"),
      });

      if (directoryMap[directory.toString()] !== undefined) {
        directoryMap[directory.toString()]++;
      } else {
        directoryMap[directory.toString()] = 1;
      }
    });

    let managedDirectories: vscode.Uri[] = [];
    for (const d of Object.keys(directoryMap)) {
      const dirUri = vscode.Uri.parse(d);
      const filesFromDir = await vscode.workspace.findFiles(
        new vscode.RelativePattern(dirUri, "*")
      );

      if (directoryMap[d] === filesFromDir.length) {
        managedDirectories.push(dirUri);
      }
    }

    if (managedDirectories.length > 0) {
      projenManaged.push(...managedDirectories);
    }

    projenManaged.sort((a, b) => a.toString().localeCompare(b.toString()));

    this.decorator.files = projenManaged.map((f) => f.toString());
    this.managedFiles = projenManaged;

    this.decorator._onDidChangeFileDecorations.fire(
      this.previouslyManaged.concat(...projenManaged)
    );

    this.previouslyManaged = projenManaged;
  }
}
export class ProjenStep {
  constructor(public type: string, public value: string) {}
}

export class ProjenTask {
  public name: string;
  public description?: string;
  public steps: ProjenStep[];
  public readonly projenInfo: ProjenInfo;

  constructor(projenInfo: ProjenInfo, taskData: any) {
    this.name = taskData.name;
    this.projenInfo = projenInfo;
    this.description = taskData.description;
    this.steps = (taskData.steps ?? []).map((s: any) => {
      const entries = Object.entries(s)[0];
      return new ProjenStep(entries[0], entries[1] as any);
    });
  }
}

export class ProjenDependency {
  constructor(
    public projenInfo: ProjenInfo,
    public name: string,
    public type: string,
    public version?: string
  ) {}
}
