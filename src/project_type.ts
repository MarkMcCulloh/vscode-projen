/* eslint-disable import/no-extraneous-dependencies */
import {
  FileBase,
  IgnoreFile,
  TextFile,
  TypeScriptAppProject,
  TypeScriptProjectOptions,
} from "projen";
import { JobPermission } from "projen/lib/github/workflows-model";
import { Release } from "projen/lib/release";

export interface VSCodeExtensionProjectOptions
  extends TypeScriptProjectOptions {
  readonly releaseToVSMarketplace?: boolean;
  readonly vscodeVersion: string;
  readonly displayName: string;
  readonly publisher: string;
  readonly preview: boolean;
  readonly icon: string;
  readonly activationEvents: string[];
  readonly contributes: any;
  readonly keywords?: string[];
}

export class VSCodeExtensionProject extends TypeScriptAppProject {
  public readonly release?: Release;
  public readonly vscodeIgnore?: IgnoreFile;

  constructor(options: VSCodeExtensionProjectOptions) {
    super(options);

    this.addDeps("@types/vscode");

    this.vscodeIgnore = new IgnoreFile(this, ".vscodeignore");
    this.vscodeIgnore.addPatterns(
      ".vscode/**",
      ".vscode-test/**",
      "src/**",
      ".gitignore",
      "**/tsconfig.json",
      "**/.eslintrc.json",
      "**/*.map",
      "**/*.ts"
    );
    this.gitignore.addPatterns("out", "*.vsix", ".vscode-test");

    this.package.addEngine("vscode", options.vscodeVersion);
    this.package.addField("displayName", options.displayName);
    this.package.addField("icon", options.icon);
    this.package.addField("preview", options.preview);
    this.package.addField("keywords", options.keywords ?? []);
    this.package.addField("publisher", options.publisher);

    this.package.addField("activationEvents", options.activationEvents);
    this.package.addField("contributes", options.contributes);

    if (this.jest) {
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
    '--disable-extensions',
    '--no-sandbox'
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
          postBuildSteps: [
            {
              run: "cp ./{LICENSE,package.json,package-lock.json,README.md,.vscodeignore} dist/",
            },
            {
              run: "cp -R lib dist",
            },
            {
              run: "cp -R resources dist",
            },
          ],
        });
      }

      this.release.addJobs({
        release_marketplace: {
          name: "Publish to VSCode Marketplace",
          runsOn: "ubuntu-latest",
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
              },
            },
          ],
        },
      });
    }
  }
}
