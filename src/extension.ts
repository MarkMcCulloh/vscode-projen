// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { getProjectIds } from "./jsii/fetcher";
import { ProjenDependencyView } from "./projen_dependency_view";
import { ProjenFileView } from "./projen_files_view";
import { ProjenInfo } from "./projen_info";
import { ProjenTaskView } from "./projen_task_view";
import { ProjenWatcher } from "./projen_watcher";

function useTerminal() {
  return vscode.workspace
    .getConfiguration("projen")
    .get("tasks.executeInTerminal");
}

function availableProjectLibraries() {
  const fromConfig =
    vscode.workspace
      .getConfiguration("projen")
      .get("projects.externalLibraries") ?? "";

  const externalOptions = `${fromConfig}\n[External Library...]`.trim();

  return [
    "Projen",
    ...externalOptions.split("\n"),
    // None of these seem to work with the current projen version :(
    // "@cdktf/provider-project | To create prebuilt provider packages for Terraform CDK",
    // "cdk-appsync-project | AWS AppSync API project that uses the cdk-appsync-transformer",
    // "@svelte-up/projen-rust-project | Cargo-based rustlang projects",
    // "p6-projen-project-awesome-list | Setup an Awesome List repository",
    // "yarn-projen | Manage monorepos using Yarn workspaces",
    // "lerna-projen | Manage monorepos using Lern",
  ];
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders?.[0]) {
    return;
  }
  const projenInfo = new ProjenInfo(vscode.workspace.workspaceFolders[0].uri);
  const projenWatcher = new ProjenWatcher(projenInfo);

  function newOrActiveTerminal() {
    let terminal = vscode.window.terminals.find((t) => t.name === "[projen]");
    if (!terminal) {
      terminal = vscode.window.createTerminal("[projen]");
    } else if (
      vscode.workspace
        .getConfiguration("projen")
        .get("terminal.alwaysChangeToWorkspaceDirectory")
    ) {
      terminal.sendText(getCDCommand(projenInfo.workspaceRoot));
    }

    terminal.show();
    return terminal;
  }

  function getVSCodeTask(name: string, ...args: string[]) {
    args.unshift("projen");

    return new vscode.Task(
      { type: "projen", task: name },
      vscode.TaskScope.Workspace,
      name,
      "projen",
      new vscode.ProcessExecution("npx", args, {
        cwd: projenInfo.workspaceRoot.fsPath,
      }),
      // TODO: Use dynamic problem matchers
      ["$tsc", "$eslint-compact"]
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.openProjenRc", async () => {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(
          projenInfo.workspaceRoot,
          ".projenrc.{ts,js}"
        )
      );

      if (files.length > 0) {
        const doc = await vscode.workspace.openTextDocument(files[0]);
        await vscode.window.showTextDocument(doc);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.run", () => {
      if (useTerminal()) {
        newOrActiveTerminal().sendText(`npx projen`);
      } else {
        void vscode.tasks.executeTask(getVSCodeTask("projen"));
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "projen.new",
      async (projectLib?: string, projectType?: string) => {
        const rawProjectLibSelection: string | undefined =
          projectLib ??
          (await vscode.window.showQuickPick(availableProjectLibraries(), {
            title: "Project Library",
            placeHolder: "Select library to view available projects",
          }));

        if (!rawProjectLibSelection) {
          return;
        }

        let projectLibSelection = rawProjectLibSelection
          .toLowerCase()
          .split("|")[0]
          .trim();

        if (projectLibSelection === "[external library...]") {
          const customLib = await vscode.window.showInputBox({
            prompt: "Specify external library",
            title: "External Library Selection",
          });

          if (!customLib) {
            return;
          }

          projectLibSelection = customLib.toLowerCase().trim();
        }

        let projects = projectType
          ? []
          : await getProjectIds(projectLibSelection);

        let projectId: string | undefined = projectType;

        if (projects.length > 1) {
          // If there are multiple projects, we need a pjid
          projects = projects.filter((p) => !!p.pjid);
        }

        if (projects.length === 0 && !projectType) {
          void vscode.window.showErrorMessage(
            `Unable to find available project types from "${projectLibSelection}"`
          );
          return;
        }

        if (projects.length > 0) {
          const projectPickerPromise = new Promise<string | undefined>(
            (resolve) => {
              const picker = vscode.window.createQuickPick();
              picker.canSelectMany = false;
              picker.title = "Project Type Selection";
              picker.placeholder = "Select project id";
              picker.matchOnDetail = true;
              picker.items = projects.map((project) => ({
                detail: project.pjid ?? "",
                label: project.summary ?? project.typeName,
              }));

              picker.onDidAccept(() => {
                if (picker.selectedItems && picker.selectedItems.length > 0) {
                  resolve(picker.selectedItems[0].detail);
                  picker.hide();
                }
              });
              picker.onDidHide(() => {
                resolve(undefined);
                picker.dispose();
              });

              picker.show();
            }
          );

          projectId = await projectPickerPromise;
        }

        if (projectId === undefined) {
          return;
        }

        const additionalArgs = await vscode.window.showInputBox({
          prompt: "(Optional) Additional arguments to pass to 'projen new'",
        });

        if (additionalArgs === undefined) {
          return;
        }

        let args = "";
        if (projectLibSelection !== "projen") {
          args += ` --from ${projectLibSelection}`;
        }
        if (projectId) {
          args += " " + projectId;
        }
        if (additionalArgs) {
          args += " " + additionalArgs;
        }
        args = args.trim();

        if (useTerminal()) {
          newOrActiveTerminal().sendText(`npx projen new ${args}`);
        } else {
          void vscode.tasks.executeTask(getVSCodeTask("new", "new", args));
        }
      }
    )
  );

  const taskView = new ProjenTaskView(projenInfo);
  vscode.window.createTreeView("projenTasks", {
    treeDataProvider: taskView,
    showCollapseAll: true,
  });
  const depsView = new ProjenDependencyView(projenInfo);
  vscode.window.createTreeView("projenDeps", {
    treeDataProvider: depsView,
  });
  const filesView = new ProjenFileView(projenInfo);
  vscode.window.createTreeView("projenFiles", {
    treeDataProvider: filesView,
  });

  vscode.tasks.registerTaskProvider("projen", {
    provideTasks(_token?: vscode.CancellationToken) {
      return projenInfo.tasks.map((t) => getVSCodeTask(t.name, t.name));
    },
    resolveTask(task: vscode.Task, _token?: vscode.CancellationToken) {
      return task;
    },
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.runTask", async (task?: string) => {
      if (task) {
        if (useTerminal()) {
          newOrActiveTerminal().sendText(`npx projen ${task}`);
        } else {
          void vscode.tasks.executeTask(getVSCodeTask(task, task));
        }
      } else {
        const selection = await vscode.window.showQuickPick(
          projenInfo.tasks.map((t) => t.name)
        );

        if (selection) {
          if (useTerminal()) {
            newOrActiveTerminal().sendText(`npx projen ${selection}`);
          } else {
            void vscode.tasks.executeTask(getVSCodeTask(selection, selection));
          }
        }
      }
    })
  );

  const updateStuff = () => {
    void projenInfo.update().then(() => {
      taskView._onDidChangeTreeData.fire();
      depsView._onDidChangeTreeData.fire();
      filesView._onDidChangeTreeData.fire();
    });
  };

  projenWatcher.onDirectoryChange(updateStuff);
  void updateStuff();
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getCDCommand(cwd: vscode.Uri): string {
  if (process && global.process.platform === "win32") {
    if (vscode.env.shell !== "cmd.exe") {
      return `cd "${cwd.fsPath.replace(/\\/g, "/")}"`;
    }
  }

  return `cd "${cwd}"`;
}
