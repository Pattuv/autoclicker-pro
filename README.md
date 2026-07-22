# AutoClicker Pro

Premium macOS autoclicker — native WKWebView shell (Tauri), not Chromium/Electron.

## Requirements

- macOS 11+
- Node.js 20+
- Rust (stable)
- Accessibility permission

## Develop

```bash
npm install
npm run tauri:dev
```

## Build

```bash
npm run tauri:build
```

## Architecture

- **UI:** React + TypeScript + Tailwind CSS v4, rendered in macOS **WKWebView**
- **Backend:** Rust (Tauri) — global hotkey, Accessibility checks, CoreGraphics mouse events
- **Clicks:** Native `CGEvent` posts at the current cursor (no cliclick / no per-click processes)
- **Icon:** `icon.png` → generated Tauri icon set under `src-tauri/icons/`
