# Bash Reference Audit — 2026-11-18

## Scope and outcome

Reviewed the shared GitHub Pages Bash reference against course files supplied during this update. The English-only library is now at **1.7.2**, with **129 individual command or keyword entries**, **25 topical guides**, and **433 documented option/syntax rows**.

Changes:
- Rewrote the short **command-name** info buttons throughout the previous 117-entry library, concentrating on names, expansions, historical etymology, or literal naming.
- Replaced option info buttons for all 339 previously documented rows with brief mnemonic or syntax labels. Full behavior remains in the option descriptions below.
- Corrected command-specific overloaded letters and resolved all generic mnemonic placeholders in follow-up releases 1.7.1 and 1.7.2.
- Expanded relevant common flags, especially `sed`, `grep`, `cut`, `cat`, `less`, `tail`, `awk`, `find`, `test`, `read`, and `chmod`.
- Added 12 reference entries and seven topical guides. Bash version history is preserved with immutable snapshots; the independent C / C++ content was left unchanged.

## Source coverage

### Tutorial 02 — Intro to Bash
- Shell command lookup, `which`, working directories and `PATH`.
- Bash variables, arithmetic expressions, conditional tests, arrays and control flow.
- Redirection and file descriptors `stdin`, `stdout`, `stderr`; pipelines and command substitution.
- `cat`, `sort`, `uniq`, `head`, `wc`, `cut`, `grep` and extended regex.
- `chmod g-w`, including the distinction between group (`g`) and owner (`u`) permissions.

### Workshop 03 — Bash Scripts + Advanced CLI Part 1
- Script interpreter line (`#!/bin/bash`), execution permissions, positional parameters and functions.
- `head` byte counts; `tail` following, retries and offset notation; `cat` numbering; `less` shortcuts.
- `sed` script actions (`s`, `d`, `p`) versus CLI flags (`-n`, `-e`, `-i`), address ranges and substitution modifiers (`g`).
- `awk` records, fields and `BEGIN`/`END` blocks.
- Added `lspci` for the command example and `shift`/`getopts` for practical script handling.

### Tutorial 03 — Files
- Added `xxd` for inspecting binary file contents; verified `head -c` documentation.
- Reinforced file descriptors and redirects in a Bash-specific guide.
- This tutorial primarily explains C file APIs, e.g. `fopen`, `fread`, `fwrite`, `fseek` and `FILE*`; **these C topics were deliberately not inserted in the Bash library**. They belong in the independent C / C++ section.

### Tutorial 01 — Coding Conventions
- Primarily C coding style, clarity, documentation and naming, not additional Bash CLI commands or flags.
- Material retained as future C / C++ study reference rather than inserted as Bash commands.

## Maintenance and accuracy rules

1. Keep **Name origin** info next to a command short and limited to the literal name, acronym, or historical origin.
2. Keep **Option name** info short; when the letter has no reliable universal expansion, identify the symbol or conventional label rather than inventing an acronym.
3. Document the **actual behavior** in `description`, `options[].description`, `note`, `examples` or topical guides, rather than the info popover.
4. A repeated flag letter is **not** a universal flag: e.g. `grep -n` means line number, `sed -n` suppresses automatic printing, and `tail -n` selects a line count.
5. Distinguish command options from script-language tokens (e.g. `sed` commands `d`, `p`, `s` and `awk` variables `NR`, `NF`).
6. GNU, BSD, macOS and Bash builtin syntax can vary; do not assert that every command supports every option.
7. This library is a **practical subset** of frequently used options, not a complete reproduction of every flag on every Unix platform. Consult local `man` pages for exhaustive implementation-specific options.
8. For new releases, update `commands.json`, add a complete `history/X.Y.Z.json` snapshot, prepend `versions.json` and update `sw.js` offline precache. Never modify old version snapshots.

## Primary verification sources

- GNU sed manual: https://www.gnu.org/software/sed/manual/sed.html
- GNU Bash reference: https://www.gnu.org/software/bash/manual/bash.html
- GNU coreutils reference: https://www.gnu.org/software/coreutils/manual/coreutils.html

## Scope boundary

This revision changed **Bash data and Bash version metadata only**, along with service-worker caching for the new Bash snapshot. The C / C++ data, release history and general UI remain separate.
