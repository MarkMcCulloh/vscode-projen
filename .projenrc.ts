import { NodePackageManager } from "projen/lib/javascript";
import { VSCodeExtensionProject } from "./src/project/project_type";

const project = new VSCodeExtensionProject({
  defaultReleaseBranch: "master",
  name: "vscode-projen",
  packageManager: NodePackageManager.NPM,
  repository: "https://github.com/MarkMcCulloh/vscode-projen.git",
  projenrcTs: true,
  entrypoint: "./lib/extension.js",
  deps: [],
  devDeps: ["@types/glob", "shx"],
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
  // TODO: Figure out a way to avoid "onStartupFinished"
  // This is needed to allow bootstrapping projen in an empty workspace
  activationEvents: [
    "workspaceContains:.projen/**",
    "onView:projen",
    "onStartupFinished",
  ],
  contributes: {
    configuration: {
      title: "Projen Configuration",
      properties: {
        "projen.tasks.executeInTerminal": {
          type: "boolean",
          default: false,
          description:
            "When running a task, use the integrated terminal instead of the special task window.",
        },
        "projen.terminal.alwaysChangeToWorkspaceDirectory": {
          type: "boolean",
          default: true,
          description:
            "Before running each command in the integrated terminal, always change the directory to the root.",
        },
        "projen.managedFiles.decoration.enable": {
          type: "boolean",
          default: true,
          description: "Darken and label projen-managed files in the explorer.",
        },
        "projen.managedFiles.decoration.badge": {
          type: "string",
          default: "PJ",
          description:
            "MUST BE < 3 CHARACTERS. Text of the label applied to managed projen files. Can leave empty to remove.",
        },
        "projen.managedFiles.decoration.themeColor": {
          type: "string",
          default: "gitDecoration.ignoredResourceForeground",
          description:
            "ThemeColor id to apply to managed files. Leave empty to not apply any color.",
        },
      },
    },
    taskDefinitions: [
      {
        type: "projen",
        required: ["task"],
        when: "shellExecutionSupported && projen.inProject",
        properties: {
          task: {
            type: "string",
            description: "The projen task to execute",
          },
        },
      },
    ],
    viewsContainers: {
      activitybar: [
        {
          id: "projen",
          title: "Projen",
          icon: "resources/dark/projen-outline.svg",
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
          name: "Managed Files/Folders",
        },
      ],
    },
    commands: [
      {
        command: "projen.run",
        title: "Run Projen",
        icon: {
          light: "resources/light/projen-outline.svg",
          dark: "resources/dark/projen-outline.svg",
        },
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
      {
        command: "projen.new",
        title: "Generate Projen Project",
      },
      {
        command: "projen.newExternal",
        title: "Generate External Projen Project",
      },
    ],
    menus: {
      "view/title": [
        {
          command: "projen.run",
          group: "navigation",
          when: "projen.inProject == true && view =~ /^projen.+$/",
        },
        {
          command: "projen.openProjenRc",
          group: "navigation",
          when: "projen.inProject == true && view =~ /^projen.+$/",
        },
        {
          command: "projen.run",
          group: "navigation",
          when: "projen.inProject == true && activeViewlet == 'workbench.view.explorer'",
        },
        {
          command: "projen.openProjenRc",
          group: "navigation",
          when: "projen.inProject == true && activeViewlet == 'workbench.view.explorer'",
        },
      ],
    },
  },
  displayName: "Projen",
  icon: "resources/projen.png",
  releaseToVSMarketplace: true,
  vscodeVersion: "^1.62.0",
  description: "Projen helpers and utilities",
  publisher: "MarkMcCulloh",
  preview: true,
  jest: true,
});

project.synth();
