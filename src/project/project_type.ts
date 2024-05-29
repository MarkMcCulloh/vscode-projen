/* eslint-disable import/no-extraneous-dependencies */
import { IgnoreFile } from "projen";
import { JobPermission, JobStep } from "projen/lib/github/workflows-model";
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
  readonly publishToVSMarketplace?: boolean;
  readonly publishToOpenVSXRegistry?: boolean;
  readonly vsMarketplaceToken?: string;
  readonly vsxRegistryToken?: string;
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

    const esbuildBase =
      "esbuild ./src/extension.ts --outfile=lib/extension.js --external:node-gyp --external:vscode --format=cjs --platform=node --bundle";

    this.addDeps("@types/vscode");
    this.addDevDeps("@vscode/vsce", "esbuild");

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

    if (options.publishToVSMarketplace || options.publishToOpenVSXRegistry) {
      if (!this.release) {
        this.release = new Release(this, {
          artifactsDirectory: "dist",
          branch: options.defaultReleaseBranch,
          task: this.buildTask,
          versionFile: "package.json",
          releaseWorkflowName: "Publish",
        });
      }

      const steps: JobStep[] = [
        {
          name: "Download build artifacts",
          uses: "actions/download-artifact@v4",
          with: {
            name: "build-artifact",
            path: "dist",
          },
        },
      ];

      if (options.publishToOpenVSXRegistry) {
        steps.push({
          name: "Publish to Open VSX Registry",
          uses: "HaaLeo/publish-vscode-extension@v1",
          with: {
            pat: `\${{ secrets.${
              options.vsxRegistryToken ?? "VSX_REGISTRY_TOKEN"
            } }}`,
            extensionFile: "./dist/extension.vsix",
          },
        });
      }

      if (options.publishToVSMarketplace) {
        steps.push({
          name: "Publish to VS Marketplace",
          uses: "HaaLeo/publish-vscode-extension@v1",
          with: {
            pat: `\${{ secrets.${
              options.vsMarketplaceToken ?? "VS_MARKETPLACE_TOKEN"
            } }}`,
            registryUrl: "https://marketplace.visualstudio.com",
            extensionFile: "./dist/extension.vsix",
          },
        });
      }

      this.release.addJobs({
        release_marketplace: {
          name: "Publish Extension",
          runsOn: ["ubuntu-latest"],
          needs: ["release_github"],
          permissions: { contents: JobPermission.READ },
          steps,
        },
      });

      this.compileTask.reset("tsc --noEmit");
      this.compileTask.exec(esbuildBase);

      const packageTask = this.tasks.tryFind("package")!;
      packageTask.exec("mkdir -p dist");
      packageTask.exec(`${esbuildBase} --minify`);
      packageTask.exec("vsce package -o dist/extension.vsix");

      this.tasks.tryFind("release")?.prependExec("npm ci");
    }
  }
}
