# Encoding Policy (UTF-8)

This project enforces UTF-8 to prevent mojibake.

## Rules

- All text files must be saved as UTF-8.
- Line endings must be LF.
- Do not open/save source files with Shift_JIS/CP932.

## Automatic Guards

- `scripts/check-mojibake.js`
  - Detects invalid UTF-8 bytes.
  - Detects replacement characters (`�`).
  - Detects known mojibake patterns.
- `scripts/watch-mojibake.js`
  - Watches file writes while developing.
  - If mojibake/encoding corruption is detected right after save, it exits with error immediately.
- Runs automatically before:
  - `npm run start`
  - `npm run dev:api`
  - `npm run dev`
  - `npm run build`
- Runs continuously in:
  - `npm run dev:all`

## Manual Check

```bash
npm run check:mojibake
```

If this command fails, fix encoding first and then rerun.

## Notes

- Save-time hard block inside the editor requires editor extensions.
- This project-side guard provides immediate detection at write time and stops the dev process.
