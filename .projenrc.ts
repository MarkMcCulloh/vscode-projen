import { NodePackageManager } from "projen";
import { VSCodeExtensionProject } from "./src/project_type";

const project = new VSCodeExtensionProject({
  defaultReleaseBranch: "master",
  name: "vscode-projen",
  packageManager: NodePackageManager.NPM,
  repository: "https://github.com/MarkMcCulloh/vscode-projen.git",
  projenrcTs: true,
  entrypoint: "./lib/extension.js",
  deps: ["ts-debounce"],
  devDeps: ["@types/glob"],
  eslintOptions: {
    dirs: ["src"],
    devdirs: ["test"],
    prettier: true,
  },
  tsconfig: {
    compilerOptions: {
      lib: ["es2019", "dom"],
    },
  },
  activationEvents: ["workspaceContains:.projen/**", "onView:projen"],
  contributes: {
    viewsContainers: {
      activitybar: [
        {
          id: "projen",
          title: "Projen",
          icon: "resources/projen-outline.svg",
        },
      ],
    },
    views: {
      projen: [
        {
          id: "projenTasks",
          name: "Tasks",
        },
        {
          id: "projenDeps",
          name: "Dependencies",
        },
        {
          id: "projenFiles",
          name: "Managed Files",
        },
        {
          id: "projenProjects",
          name: "Available Projects",
        },
      ],
    },
    commands: [
      {
        command: "projen.runProjen",
        title: "Run Projen",
        icon: "$(refresh)",
      },
      {
        command: "projen.runTask",
        title: "Run Projen Task",
        icon: "$(play)",
      },
      {
        command: "projen.openProjenRc",
        title: "Open Projen File",
        icon: "$(gear)",
      },
    ],
    menus: {
      "view/title": [
        {
          command: "projen.runProjen",
          group: "navigation",
        },
        {
          command: "projen.openProjenRc",
          group: "navigation",
        },
      ],
    },
  },
  displayName: "Projen",
  icon: "resources/projen.png",
  releaseToVSMarketplace: true,
  vscodeVersion: "^1.62.0",
  description: "VSCode extension for Projen",
  publisher: "MarkMcCulloh",
  preview: true,
  // TODO: :(
  jest: false,
});

project.synth();
