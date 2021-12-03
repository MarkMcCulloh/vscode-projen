import {
  FileBase,
  IgnoreFile,
  NodePackageManager,
  TextFile,
  TypeScriptAppProject,
} from "projen";
import { JobPermission } from "projen/lib/github/workflows-model";
import { Release } from "projen/lib/release";

const project = new TypeScriptAppProject({
  defaultReleaseBranch: "main",
  name: "vscode-projen",
  packageManager: NodePackageManager.NPM,
  projenrcTs: true,
  entrypoint: "./lib/extension.js",
  jestOptions: {
    jestConfig: {
      runner: "vscode",
    },
  },
  deps: ["@types/vscode"],
  devDeps: ["@types/glob", "@vscode/test-electron", "jest-runner-vscode"],
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
  description: "VSCode extension for Projen",
});

const release = new Release(project, {
  branch: "main",
  task: project.buildTask,
  versionFile: "package.json",
  releaseWorkflowName: "Publish",
});

release.addJobs({
  publish: {
    runsOn: "ubuntu-latest",
    permissions: { contents: JobPermission.READ },
    steps: [
      {
        name: "Publish to Visual Studio Marketplace",
        uses: "HaaLeo/publish-vscode-extension@v0",
        with: {
          pat: "${{ secrets.VS_MARKETPLACE_TOKEN }}",
          registryUrl: "https://marketplace.visualstudio.com",
        },
      },
    ],
  },
});

project.jest!.config.globals["ts-jest"] = {
  tsconfig: "<rootDir>/tsconfig.dev.json",
};

project.gitignore.addPatterns("out", "*.vsix", ".vscode-test");

project.package.addEngine("vscode", "^1.62.0");
project.package.addField("displayName", "Projen");
project.package.addField("icon", "resources/projen.png");
project.package.addField("preview", true);
project.package.addField("keywords", ["projen"]);
project.package.addField("publisher", "mmcculloh");

project.package.addField("activationEvents", [
  "workspaceContains:.projen/**",
  "onView:projen",
]);
project.package.addField("contributes", {
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
});

new TextFile(project, "jest-runner-vscode.config.js", {
  lines: `\
// ${FileBase.PROJEN_MARKER}

module.exports = {
  // Additional arguments to pass to VS Code
  launchArgs: [
    '--new-window',
    '--disable-extensions',
    '--no-sandbox'
  ],
}
`.split("\n"),
});

const vscodeIgnore = new IgnoreFile(project, ".vscodeignore");
vscodeIgnore.addPatterns(
  ".vscode/**",
  ".vscode-test/**",
  "src/**",
  ".gitignore",
  "**/tsconfig.json",
  "**/.eslintrc.json",
  "**/*.map",
  "**/*.ts"
);

project.synth();
