// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ProjenDependencyView } from "./projen_dependency_view";
import { ProjenFileView } from "./projen_files_view";
import { ProjenTaskView } from "./projen_task_view";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
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

  context.subscriptions.push(
    vscode.commands.registerCommand("projen.runTask", (taskName: string) => {
      if (vscode.window.activeTerminal) {
        vscode.window.activeTerminal.sendText(`npx projen ${taskName}`);
      }
    })
  );

  const taskView = new ProjenTaskView(vscode.workspace.rootPath!);
  vscode.window.createTreeView("projenTasks", {
    treeDataProvider: taskView,
    showCollapseAll: true,
  });
  const taskWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(
      vscode.workspace.rootPath!,
      ".projen/tasks.json"
    ),
    false,
    false,
    true
  );
  taskWatcher.onDidCreate((uri) =>
    taskView.update(vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath!)
  );
  taskWatcher.onDidChange((uri) =>
    taskView.update(vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath!)
  );

  const depsView = new ProjenDependencyView(vscode.workspace.rootPath!);
  vscode.window.createTreeView("projenDeps", {
    treeDataProvider: depsView,
  });
  const depWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.workspace.rootPath!, ".projen/deps.json"),
    false,
    false,
    true
  );
  depWatcher.onDidCreate((uri) =>
    depsView.update(vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath!)
  );
  depWatcher.onDidChange((uri) =>
    depsView.update(vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath!)
  );

  const filesView = new ProjenFileView(vscode.workspace.rootPath!);
  vscode.window.createTreeView("projenFiles", {
    treeDataProvider: filesView,
  });
  const managedFilesWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.workspace.rootPath!, ".projen/deps.json"),
    false,
    true,
    true
  );
  managedFilesWatcher.onDidCreate(() => {
    filesView._onDidChangeTreeData.fire();
  });
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
