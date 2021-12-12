/* eslint-disable import/no-extraneous-dependencies */
import { FileBase, IgnoreFile, TextFile } from "projen";
import { JobPermission } from "projen/lib/github/workflows-model";
import { Release } from "projen/lib/release";
import {
  TypeScriptAppProject,
  TypeScriptProjectOptions,
} from "projen/lib/typescript";
import {
  VSCodeExtensionCapabilities,
  VSCodeExtensionContributions,
} from "./vscode_types";

export interface VSCodeExtensionProjectOptions
  extends TypeScriptProjectOptions {
  readonly releaseToVSMarketplace?: boolean;
  readonly vscodeVersion: string;
  readonly displayName: string;
  readonly publisher: string;
  readonly preview: boolean;
  readonly icon: string;
  readonly activationEvents: string[];
  readonly categories?: string[];
  readonly capabilities?: VSCodeExtensionCapabilities;
  readonly contributes: VSCodeExtensionContributions;
  readonly keywords?: string[];
}

export class VSCodeExtensionProject extends TypeScriptAppProject {
  public readonly release?: Release;
  public readonly vscodeIgnore?: IgnoreFile;

  constructor(options: VSCodeExtensionProjectOptions) {
    super(options);

    this.addExcludeFromCleanup("test/**");

    const esbuildBase =
      "esbuild ./src/extension.ts --bundle --outfile=lib/extension.js --external:vscode --format=cjs --platform=node";

    this.addDeps("@types/vscode");
    this.addDevDeps("vsce", "esbuild");

    this.vscodeIgnore = new IgnoreFile(this, ".vscodeignore");
    this.vscodeIgnore.addPatterns(
      ".vscode/**",
      ".vscode-test/**",
      "src/**",
      ".gitignore",
      "**/tsconfig.json",
      "**/.eslintrc.json",
      "**/*.map",
      "**/*.ts",
      "node_modules/",
      "dist/",
      "test/",
      "test-reports/",
      "coverage/",
      ".projen/"
    );
    this.gitignore.addPatterns("out", "*.vsix", ".vscode-test");

    this.package.addEngine("vscode", options.vscodeVersion);
    this.package.addField("displayName", options.displayName);
    this.package.addField("icon", options.icon);
    this.package.addField("preview", options.preview);
    this.package.addField("publisher", options.publisher);

    if (options.categories) {
      this.package.addField("categories", options.categories);
    }

    this.package.addField("activationEvents", options.activationEvents);
    this.package.addField("contributes", options.contributes);

    if (this.jest) {
      // look at https://github.com/stylelint/vscode-stylelint/blob/main/.github/workflows/testing.yml#L72
      this.addDevDeps("@vscode/test-electron", "jest-runner-vscode");
      this.jest.config.runner = "vscode";
      this.jest.config.globals["ts-jest"] = {
        tsconfig: `<rootDir>/${this.tsconfigDev.file.path}`,
      };
      new TextFile(this, "jest-runner-vscode.config.js", {
        lines: `\
// ${FileBase.PROJEN_MARKER}

module.exports = {
  // Additional arguments to pass to VS Code
  launchArgs: [
    '--new-window',
    '--disable-extensions'
  ],
}
`.split("\n"),
      });
    }

    if (super.release) {
      this.release = super.release;
    }

    if (options.releaseToVSMarketplace) {
      if (!this.release) {
        this.release = new Release(this, {
          branch: options.defaultReleaseBranch,
          task: this.buildTask,
          versionFile: "package.json",
          releaseWorkflowName: "Publish",
          releaseWorkflowSetupSteps: this.installWorkflowSteps,
        });
      }

      this.release.addJobs({
        release_marketplace: {
          name: "Publish to VSCode Marketplace",
          runsOn: ["ubuntu-latest"],
          needs: ["release_github"],
          permissions: { contents: JobPermission.READ },
          steps: [
            {
              name: "Download build artifacts",
              uses: "actions/download-artifact@v2",
              with: {
                name: "dist",
                path: "dist",
              },
            },
            {
              name: "Publish",
              uses: "HaaLeo/publish-vscode-extension@v0",
              with: {
                pat: "${{ secrets.VS_MARKETPLACE_TOKEN }}",
                registryUrl: "https://marketplace.visualstudio.com",
                extensionFile: "./dist/extension.vsix",
                packagePath: "",
              },
            },
          ],
        },
      });

      this.compileTask.reset("tsc --noEmit");
      this.compileTask.exec(esbuildBase);

      const packageTask = this.tasks.tryFind("package")!;
      packageTask.exec("mkdir -p dist");
      packageTask.exec(`${esbuildBase} --minify`);
      packageTask.exec("vsce package -o dist/extension.vsix");
    }
  }
}
