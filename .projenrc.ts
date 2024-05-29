import { NodePackageManager } from "projen/lib/javascript";
import { VSCodeExtensionProject } from "./src/project/project_type";

const project = new VSCodeExtensionProject({
  defaultReleaseBranch: "master",
  name: "vscode-projen",
  packageManager: NodePackageManager.NPM,
  repository: "https://github.com/MarkMcCulloh/vscode-projen.git",
  projenrcTs: true,
  entrypoint: "./lib/extension.js",
  minNodeVersion: "20.0.0",
  deps: ["gunzip-maybe", "tar-stream", "pacote", "registry-url"],
  devDeps: ["shx", "@types/gunzip-maybe", "@types/tar-stream", "@types/pacote"],
  eslintOptions: {
    dirs: ["src"],
    devdirs: ["test"],
    prettier: true,
  },
  tsconfig: {
    compilerOptions: {
      lib: ["es2021", "dom"],
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
      title: "Projen",
      properties: {
        "projen.projects.externalLibraries": {
          type: "string",
          editPresentation: "multilineText",
          default: "",
          description:
            "When creating a new project, these external libraries will show as options.\nSeparate with newlines.\nMay use `|` after library name to add documentation (e.g. `vue-projen | Vue templates`).",
        },
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
          description: "Label and darken projen-managed files in the explorer.",
        },
        "projen.managedFiles.decoration.badge": {
          type: "string",
          default: "PJ",
          description:
            "MUST BE < 3 CHARACTERS.\nText of the label applied to managed projen files. Can leave empty to remove.",
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
          id: "projenProjects",
          name: "Projects",
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
    ],
    menus: {
      "view/title": [
        {
          command: "projen.run",
          group: "navigation",
          when: "projen.inProject == true && view == projenProjects",
        },
        {
          command: "projen.openProjenRc",
          group: "navigation",
          when: "projen.inProject == true && view == projenProjects",
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
  publishToVSMarketplace: true,
  publishToOpenVSXRegistry: true,
  vscodeVersion: "^1.62.0",
  description: "Projen helpers and utilities",
  publisher: "MarkMcCulloh",
  preview: true,
  jest: true,
});

project.vscodeIgnore!.addPatterns("!node_modules/node-gyp/bin/node-gyp.js");

project.addFields({
  browser: "./lib/extension.js",
});

project.addExcludeFromCleanup("test/**");

project.synth();
