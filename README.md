# AutoClicker Pro

Premium macOS autoclicker — native WKWebView shell (Tauri), not Chromium/Electron.

## Requirements

- macOS 11+
- Node.js 20+
- Rust (stable)
- Accessibility permission

## Install from GitHub Releases

Download `AutoClicker Pro_1.0.0.dmg` from the latest [GitHub Release](https://github.com/Pattuv/autoclicker-pro/releases). This build is Apple Silicon only.

Open the disk image and drag **AutoClicker Pro** into Applications. This build is not notarized, so macOS blocks the first open and may say the app is damaged or cannot be verified. Right-click → Open does not skip that block on macOS Sequoia (15) or Tahoe (26).

Continue the install from System Settings:

1. Open **AutoClicker Pro** and click **Done**. Do not click **Move to Trash**.
2. Go to **System Settings → Privacy & Security**, scroll to the bottom, and click **Open Anyway**.
3. Approve with Touch ID or your Mac password, then click **Open**.

**Open Anyway** only appears for about an hour after the blocked attempt. If it disappears, open the app again and go straight back to Privacy & Security. After you approve it once, that copy launches normally.

If macOS refuses to open it and there is no **Open Anyway** button, clear the quarantine flag, then open the app again and use the steps above:

```bash
xattr -dr com.apple.quarantine "/Applications/AutoClicker Pro.app"
```

Each new release is blocked again until the app is signed with a Developer ID certificate and notarized. On first launch, grant Accessibility permission so the app can post clicks.

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
