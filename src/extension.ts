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
    vscode.commands.registerCommand("projen.runProjen", () => {
      if (vscode.window.activeTerminal) {
        vscode.window.activeTerminal.sendText("npx projen");
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

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.runTask", async (task?: string) => {
      if (vscode.window.activeTerminal) {
        if (task) {
          vscode.window.activeTerminal.sendText(`npx projen ${task}`);
        } else {
          const selection = await vscode.window.showQuickPick(
            projenInfo.tasks.map((t) => t.name)
          );

          if (selection) {
            vscode.window.activeTerminal.sendText(`npx projen ${selection}`);
          }
        }
      }
    })
  );

  const updateStuff = async () => {
    await projenInfo.update();
    taskView._onDidChangeTreeData.fire();
    depsView._onDidChangeTreeData.fire();
    filesView._onDidChangeTreeData.fire();
  };

  projenWatcher.onDirectoryChange(updateStuff);
  void updateStuff();
}

// this method is called when your extension is deactivated
export function deactivate() {}

// function getExcludes() {
//   if (!vscode.workspace.rootPath || vscode.workspace.rootPath === "") {
//     return [];
//   }

//   const config = vscode.workspace.getConfiguration("files", null);
//   const excludes: any = config.get("exclude");

//   let list = excludes ? Object.keys(config.get("exclude")!) : [];

//   for (let i = 0; i < list.length; i++) {
//     let enabled = excludes[list[i]] ? 1 : 0;
//     list[i] = `${list[i]}|${enabled}`;
//   }

//   return list;
// }

// function updateConfig(excludes: string[]) {
//   if (!vscode.workspace.rootPath || vscode.workspace.rootPath === "") {
//     return;
//   }

//   const config = vscode.workspace.getConfiguration("files", null);

//   let target = vscode.ConfigurationTarget.WorkspaceFolder;

//   void config.update("exclude", excludes, target);
// }
