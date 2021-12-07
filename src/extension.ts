// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ProjenDependencyView } from "./projen_dependency_view";
import { ProjenFileView } from "./projen_files_view";
import { ProjenInfo } from "./projen_info";
import { ProjenTaskView } from "./projen_task_view";
import { ProjenWatcher } from "./projen_watcher";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const projenInfo = new ProjenInfo(vscode.workspace.rootPath!);
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

  function getVSCodeTask(taskName: string) {
    const task = projenInfo.tasks.find((t) => t.name === taskName)!;

    return new vscode.Task(
      { type: "projen", task: task.name },
      vscode.TaskScope.Workspace,
      task.name,
      "projen",
      new vscode.ProcessExecution("npx", ["projen", task.name], {
        cwd: projenInfo.workspaceRoot,
      }),
      // TODO: Dynamic problem matchers
      ["$tsc", "$eslint-compact"]
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.openProjenRc", async () => {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(
          vscode.workspace.rootPath!,
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
      newOrActiveTerminal().sendText("npx projen");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.new", async () => {
      const projectTypeListWithDescription = [
        "awscdk-app-java - AWS CDK app in Java.",
        "awscdk-app-ts - AWS CDK app in TypeScript.",
        "awscdk-construct - AWS CDK construct library project.",
        "cdk8s-app-ts - CDK8s app in TypeScript.",
        "cdk8s-construct - CDK8s construct library project.",
        "cdktf-construct - CDKTF construct library project.",
        "java - Java project.",
        "jsii - Multi-language jsii library project.",
        "nextjs - Next.js project without TypeScript.",
        "nextjs-ts - Next.js project with TypeScript.",
        "node - Node.js project.",
        "project - Base project.",
        "python - Python project.",
        "react - React project without TypeScript.",
        "react-ts - React project with TypeScript.",
        "typescript - TypeScript project.",
        "typescript-app - TypeScript app.",
      ];

      const selection = await vscode.window.showQuickPick(
        projectTypeListWithDescription
      );

      const additionalArgs = await vscode.window.showInputBox({
        prompt: "(Optional) Additional arguments to pass to 'projen new'",
      });

      if (selection) {
        const projectType = selection.split(" - ")[0];
        newOrActiveTerminal().sendText(
          `npx projen new ${projectType} ${additionalArgs ?? ""}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.newExternal", async () => {
      const selection = await vscode.window.showInputBox({
        prompt:
          "External project (e.g. cdk-appsync-project or cdk-appsync-project@1.1.3)",
      });

      if (selection) {
        const projectId = await vscode.window.showInputBox({
          prompt:
            "(Optional if only one project available) Project ID (e.g. cool-ts-app)",
        });

        const additionalArgs = await vscode.window.showInputBox({
          prompt: "(Optional) Additional arguments to pass to 'projen new'",
        });

        let args = "";
        if (projectId) {
          args += " " + projectId;
        }
        if (additionalArgs) {
          args += " " + additionalArgs;
        }

        newOrActiveTerminal().sendText(
          `npx projen new --from ${selection}${args}`
        );
      }
    })
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
      return projenInfo.tasks.map((t) => getVSCodeTask(t.name));
    },
    resolveTask(task: vscode.Task, _token?: vscode.CancellationToken) {
      return task;
    },
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.runTask", async (task?: string) => {
      const inTerminal = vscode.workspace
        .getConfiguration("projen")
        .get("tasks.executeInTerminal");

      if (task) {
        if (inTerminal) {
          newOrActiveTerminal().sendText(`npx projen ${task}`);
        } else {
          void vscode.tasks.executeTask(getVSCodeTask(task));
        }
      } else {
        const selection = await vscode.window.showQuickPick(
          projenInfo.tasks.map((t) => t.name)
        );

        if (selection) {
          if (inTerminal) {
            newOrActiveTerminal().sendText(`npx projen ${selection}`);
          } else {
            void vscode.tasks.executeTask(getVSCodeTask(selection));
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

function getCDCommand(cwd: string): string {
  if (process.platform === "win32") {
    if (vscode.env.shell !== "cmd.exe") {
      return `cd "${cwd.replace(/\\/g, "/")}"`;
    }
  }

  return `cd "${cwd}"`;
}
