# Projen For VS Code

## Features

- Commands
  - Run projen
  - Run tasks
- Task List
  - Run tasks with a click
  - List steps
- Dependency List
  - List packages with types and pinned versions
- Managed Files (Currently incomplete to avoid checking too many files)
  - Show list of files managed by projen (either directly or indirectly, like a lockfile)
  - De-emphasize files managed by projen in explorer and decorate it with "PJ"

## Planned Features

- Notify/remedy stale projenrc (changes have been made without rerunning projen)
- Make dependencies hierarchal
- Support multiple workspaces
- More efficient file watcher for detecting that projen has generated new files
- Make sure to get all projen-managed files
- List available project types
  - List props and such
- Create projects in empty workspace / new dir
