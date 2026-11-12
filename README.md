# AutoClicker Pro

Premium macOS autoclicker — native WKWebView shell (Tauri), not Chromium/Electron.

## Requirements

- macOS 11+
- Node.js 20+
- Rust (stable)
- Accessibility permission

## Install from GitHub Releases

Download `AutoClicker Pro_1.0.0.dmg` from the latest [GitHub Release](https://github.com/Pattuv/autoclicker-pro/releases). This build is Apple Silicon only.

Open the disk image and drag **AutoClicker Pro** into Applications.

macOS quarantines browser downloads. This build is ad-hoc signed, so Gatekeeper blocks the first open. On macOS Sequoia (15) and Tahoe (26), right-click → Open does not skip that block.

1. Open **AutoClicker Pro** and click **Done**. Do not click **Move to Trash**.
2. Go to **System Settings → Privacy & Security**, scroll to the bottom, and click **Open Anyway**.
3. Approve with Touch ID or your Mac password, then click **Open**.

**Open Anyway** only appears for about an hour after the blocked attempt. If it disappears, open the app again and go straight back to Privacy & Security. After you approve it once, that copy launches normally.

If macOS says the app is damaged, clear the quarantine flag:

```bash
xattr -dr com.apple.quarantine "/Applications/AutoClicker Pro.app"
```

Each new release is a new unidentified download, so the warning comes back on every update. A Developer ID signature plus notarization is what makes a release open with no extra step. On first launch, grant Accessibility permission so the app can post clicks.

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
