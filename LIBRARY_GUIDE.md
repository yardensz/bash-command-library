# Reference Library — Maintenance Guide

This repository powers the public website at https://yardensz.github.io/bash-command-library/.

## Purpose

One shared, English-only, searchable, offline-friendly reference website with independent knowledge libraries for Bash and C / C++. The UI is shared; each library owns its content, release history and cached data.

## Libraries and files

| Library | Active content | Release metadata | Version snapshots |
| --- | --- | --- | --- |
| Bash | `commands.json` | `versions.json` | `history/<version>.json` |
| C / C++ | `libraries/c-cpp.json` | `libraries/c-cpp-versions.json` | `libraries/history/c-cpp/<version>.json` |

`libraries.json` is the catalog defining available libraries, labels, search hints, categories and data file paths. `index.html`, `app.js` and `styles.css` provide the shared interface. `sw.js` provides static/offline caching.

**Never replace or delete the Bash data when editing C / C++.** Do not modify the shared UI unless specifically requested. Read the current files directly from GitHub before edits; do not rely on information from another chat as the current source of truth.

## Current C / C++ status

The C / C++ library was created as an intentionally **empty scaffold**, version `0.1.0`. No C or C++ explanations, examples or definitions have yet been written. Content will be created in a separate ChatGPT conversation.

The library is selected through the dropdown in the website header. Direct link:
https://yardensz.github.io/bash-command-library/?library=c-cpp

## Content schema

Both data files follow a shared, extensible structure:

```json
{
  "schemaVersion": 1,
  "version": "0.2.0",
  "updatedAt": "YYYY-MM-DD",
  "commands": [
    {
      "id": "unique-slug",
      "name": "Display name",
      "category": "Pointers & Memory",
      "summary": "Short, plain-English summary.",
      "description": "What it does, when to use it and important distinctions.",
      "syntax": "example syntax",
      "type": "function",
      "options": [
        {
          "flag": "parameter or argument",
          "description": "Meaning of the parameter."
        }
      ],
      "examples": [
        {
          "command": "A complete example",
          "description": "What this example demonstrates.",
          "output": "Optional illustrative output"
        }
      ],
      "keywords": ["searchable phrase"],
      "note": "Optional caution"
    }
  ],
  "topics": [
    {
      "id": "unique-guide-id",
      "type": "guide",
      "name": "Concept name",
      "category": "Fundamentals",
      "summary": "Short overview.",
      "description": "Context and distinctions.",
      "sections": [
        {"title": "Section heading", "body": "Detailed explanation", "items": []}
      ],
      "examples": [
        {"command": "Illustrative code", "description": "Why this works"}
      ],
      "keywords": ["related words"]
    }
  ]
}
```

For C / C++, `commands` is the legacy schema key used by the website for individual reference entries; it **does not imply shell commands**. Use this same key until a coordinated schema migration is made.

For C / C++, appropriate `type` values include `function`, `operator`, `type`, `keyword`, `concept`; longer explanations should usually go in `topics` with `type: "guide"`. `options` is optional; it can describe function parameters when useful, but do not invent CLI flags for language constructs. Avoid pretending that Bash-specific stdout/stderr behavior applies to C expressions or types.

Choose a category from `libraries.json`. If a needed category is absent, update the C / C++ categories in that file. Keep all content and website labels **in English**. Use C and C++ language-version qualifiers where behavior differs (C99, C11, C17, C23, C++11, C++17, C++20, etc.). Do not conflate the languages or describe a C++-only feature as a C feature.

**Known UI limitation:** the code syntax-coloring function originated in a Bash-focused reference. It is acceptable for plain C / C++ examples, but precise C / C++ highlighting will require a separate improvement. Preserve all code bytes when copying examples.

## Release workflow for the C / C++ library

1. Fetch the latest `libraries.json`, `libraries/c-cpp.json` and `libraries/c-cpp-versions.json` from the GitHub repository.
2. Add or edit one or more entries in `libraries/c-cpp.json`. Keep unique IDs and validate the JSON.
3. Increase the C / C++ version and set `updatedAt`. Use semantic versioning and a descriptive release name.
4. Create a **full immutable copy** of the updated content in `libraries/history/c-cpp/<new-version>.json` with the same version and entries.
5. Prepend a release to `libraries/c-cpp-versions.json`, updating `latestVersion`, counts, release title, summary, date, and snapshot path.
6. Update the pre-cache list in `sw.js` if desired for offline first-load of the new snapshot, and bump `CACHE_NAME` for cache invalidation. Existing online-fetch behavior also caches visited files.
7. Verify JSON schemas, current and historical data, counts, and that the Bash library still loads unchanged.
8. Commit with an informative English message. Do not rewrite old snapshots.
9. The website's **Check for updates** action fetches the newest files; GitHub Pages deployment/caching can delay when users see changes.

The two libraries have **independent version numbers**. A C / C++ content release does not require changing Bash's `commands.json`, `versions.json`, or Bash snapshot files.

## Instructions for a separate ChatGPT conversation

Copy the following message into a fresh conversation. The new chat should use its GitHub connection and fetch this guide rather than relying on memory:

> I want to build the C / C++ reference library in my existing GitHub Pages website. Repository: https://github.com/yardensz/bash-command-library. Read `LIBRARY_GUIDE.md`, `libraries.json`, `libraries/c-cpp.json` and `libraries/c-cpp-versions.json` from GitHub before changing anything. We are editing **only the C / C++ content and its own version history**, not the Bash reference or the shared UI unless I ask. The site and all reference material must be in **English**; we can chat in Hebrew. Help me develop accurate, beginner-friendly, searchable entries with concise examples and relevant language-standard distinctions. Keep versioned snapshots and update the repo when I explicitly request it. Start by asking which C / C++ topic I want to add.

This document is the durable cross-chat handoff. GitHub files are the source of truth, not conversational memory.
