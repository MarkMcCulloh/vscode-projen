# Projen + VSCode = 💖

Add some [projen](https://github.com/projen/projen) flavor to VSCode!

*Currently in beta!*

## Features

- Commands
  - Run projen
  - Run tasks
  - Generate new project
  - Generate new project from external type
- Task List
  - Run tasks with a click
  - List steps
- Dependency List
  - List packages with types and pinned versions
- Managed Files (Currently incomplete to avoid checking too many files)
  - Show list of files managed by projen (either directly or indirectly, like a lockfile)
  - De-emphasize files managed by projen in explorer and decorate it with "PJ"

## Screenshots

![Basic Overview](./screenshots/ss_1.png)

![Deps and Files](./screenshots/ss_2.png)

![Commands](./screenshots/ss_3.png)

## Changelog

Changelog is kept via [GitHub Releases](https://github.com/MarkMcCulloh/vscode-projen/releases).

## Planned Features

- Notify/remedy stale projenrc (changes have been made without rerunning projen)
- Make dependencies hierarchal
- Support multiple workspaces
- More efficient file watcher for detecting that projen has generated new files
- Make sure to efficiently get all projen-managed files
- Dynamically list available project types
  - List props and such
- Create projects in empty workspace / new dir
