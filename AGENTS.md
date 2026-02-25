# AGENTS.md

- On Windows, use PowerShell 7 (`pwsh`).
- Read and write all text files as UTF-8 (no BOM).
- Never reinterpret encoding as Shift-JIS/ANSI or other legacy code pages.
- Preserve encoding on edits; do not perform lossy conversion.
- If terminal output looks garbled, rerun with UTF-8 session settings:
  - `chcp 65001 > $null`
  - `[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)`
  - `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`
  - `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)`
- Run `npm run check:mojibake` before and after large edits.
- If `check:mojibake` fails, stop editing and fix encoding first.
