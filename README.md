# Bash Command Library

A fast, publicly accessible Bash and Unix command reference. Browse 100 practical commands and eight searchable Bash syntax guides in English. The site is hosted on GitHub Pages and keeps a local cache for offline use.

**Live website:** https://yardensz.github.io/bash-command-library/

## Features

- Instant English-language search across 100 commands, descriptions, flags, examples, and keywords.
- Network & Web category covering wget, curl, SSH, DNS, and troubleshooting tools.
- Concepts & Syntax guides for regex, assignment, quoting, streams, redirection, substitution, and globs.
- Selected commands document output, exit status, side effects, and best practices.
- Small information buttons beside command and guide titles reveal command-name meanings or memory tips without cluttering the page.
- Syntax highlighting for command names, options, parameters, paths, strings, and operators.
- Concise option explanations, copyable examples, and keyboard-driven navigation.
- Compact, responsive layout with light and dark themes.
- Offline access after the first successful online visit.
- Named versions and read-only snapshots of earlier releases.

## Usage

Search commands or concepts such as regex, =, quoting, stdout, or $(...). Search also recognizes accidental wrong-keyboard-layout input. Press `/` to focus search, use the arrow keys to navigate results, and press Enter to select a command. Click **Copy** to copy syntax or a command example.

This library includes both Bash builtins and standard Unix utilities. Options may differ between GNU/Linux, macOS, and other platforms; consult `man` or `--help` for local details.

## Publishing on GitHub Pages

1. In **Settings → Pages**, choose **Deploy from a branch**.
2. Select branch `main` and folder `/(root)`, then save.
3. Once deployment finishes, visit https://yardensz.github.io/bash-command-library/.

The site does not require a dedicated server, API token, database, or build step. Its service worker requires HTTPS (as on GitHub Pages) or localhost; opening `index.html` using `file://` does not provide the same offline behavior.

## Maintaining the command library

- `commands.json`: the current database, including `version`, `updatedAt`, `commands`, and `topics` (noncommand guides).
- `versions.json`: release metadata in newest-first order.
- `history/X.Y.Z.json`: read-only snapshots of released data.
- `app.js`: search, rendering, navigation, version selection, and caching.
- `styles.css`: responsive presentation and syntax colors.
- `sw.js`: network-first caching for offline use.

For each new release, update `commands.json`, save a matching snapshot, add an entry to `versions.json`, and advance the cache version in `sw.js`. Write descriptive Git commit messages.

Older reference snapshots have been translated to English so browsing previous library versions does not reintroduce a Hebrew interface. Original Git commits remain available in Git history.

## Offline behavior

The service worker caches the static site and selected snapshots. The latest fetched command database is also stored locally. When the internet is unavailable, the site falls back to its cached data. Clearing browser site data can remove those copies, and historical snapshots not previously cached may need an internet connection.

## About

A personal reference and learning resource, published openly for anyone studying Bash or working in a terminal.
