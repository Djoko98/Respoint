ResPoint — Restaurant Management System
======================================

ResPoint is a desktop application for restaurants, built with Tauri + React. It provides a visual floor planner (tables, walls, chairs), reservation management, quick statistics, and direct printing. ResPoint ships with a fully automated update pipeline so end users seamlessly receive new versions.

Author: Djordje Stefanovic

Features
--------
- Visual floor editor
  - Tables (rectangle/circle), chairs, corner/side resize, rotation, grid snapping
  - Multi‑zone layouts and saved arrangements
  - Walls with thickness/rotation
- Reservations
  - Statuses, waiting list, VIP indicator, color coding
  - Quick assignment and statistics
- Users and roles with PIN protection
- Direct printing (Windows) using native APIs
- Automatic updates (Tauri Updater)
- Supabase integration (auth and data)

Tech Stack
----------
- Tauri 2.x (Rust + WebView)
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase JS

Prerequisites
-------------
- Node.js 18+
- Rust toolchain (stable)
- Tauri system prerequisites (MSVC toolchain on Windows, etc.)
  - See: https://tauri.app/start/prerequisites/
- minisign (for signing installers during release)

Getting Started (Development)
----------------------------
Install dependencies and run the app in dev mode:

```bash
npm install
npm run tauri:dev
```

Alternatively:
- Frontend: `npm run dev`
- Desktop (Tauri) in another terminal: `npm run tauri dev`

Production Build
----------------
```bash
npm run build
npm run tauri build
```

The output will be under `src-tauri/target/release/bundle/`.

Auto‑Update (Tauri Updater)
---------------------------
ResPoint uses the Tauri Updater plugin with a public RAW JSON endpoint. The app checks for updates on startup and every ~60 seconds. When a new version is found, it prompts the user to download and install it.

- RAW latest.json endpoint:
  - `https://raw.githubusercontent.com/Djoko98/Respoint/main/latest.json`

The updater is configured in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "pubkey": "RWTOpYbpLZUbXh5YbRmnbSQq7oawAYgJa+PPNx9qnH9hRWOpnJV3zsQ5",
      "endpoints": [
        "https://raw.githubusercontent.com/Djoko98/Respoint/main/latest.json"
      ],
      "dialog": true,
      "windows": {
        "installMode": "basicUi"
      }
    }
  }
}
```

Automated Release Pipeline
--------------------------
ResPoint includes a fully automated release script that performs all steps to produce a signed installer, publish a GitHub release, and update the RAW `latest.json` in the repo root.

Prerequisites:
- `minisign` installed
- A private signing key stored at project root as `./respoint.key`
  - Keep this key private and never commit it
- Environment variable `GITHUB_TOKEN` with permissions to create releases and upload assets in the `Djoko98/Respoint` repository
- `origin` remote pointing to the GitHub repo

Command:
```bash
npm run release
```

What it does:
1. Bumps patch version in `src-tauri/tauri.conf.json`
2. Builds frontend and Tauri (`npm run build` and `npm run tauri build`)
3. Finds the generated Windows installer and standardizes filename to `ResPoint_<version>_x64-setup.exe` (stored in `dist-release/`)
4. Signs the installer using minisign:
   - `minisign -Sm "<installer>" -s ./respoint.key -x "<installer>.minisig"`
5. Extracts the first base64 line from the minisign output and generates the root `latest.json`:

```json
{
  "version": "<version>",
  "notes": "New update available",
  "platforms": {
    "windows-x86_64": {
      "signature": "<first-base64-line>",
      "url": "https://github.com/Djoko98/Respoint/releases/latest/download/ResPoint_<version>_x64-setup.exe"
    }
  }
}
```

6. Commits and pushes `latest.json` and the version bump to the `main` branch
7. Creates a GitHub release (`tag v<version>`) and uploads the installer and `latest.json`

Printing (Windows)
------------------
Direct POS printing is supported via Windows APIs exposed through Tauri commands (see `src-tauri/src/lib.rs`). The app writes raw/text data directly to the selected printer. Driver support and font/encoding specifics depend on your printer.

Supabase
--------
The app integrates with Supabase for authentication and data. For your own deployment, replace the URL and anon key in `src/utils/supabaseClient.ts` (or switch to environment variables).

Project Structure (Overview)
----------------------------
- `src/` — React app (components, contexts, services, hooks)
  - `components/Canvas/` — visual editor for tables/walls/chairs
  - `services/` — app services (auth, updater, printing, storage, reservations, etc.)
  - `context/` — global contexts (User, Layout, Reservations, Zones, Theme)
- `src-tauri/` — Tauri configuration and Rust commands/plugins
- `scripts/release.js` — automated release pipeline
- `latest.json` — update manifest (fetched from RAW URL by the updater)

Contributing
------------
Issues and Pull Requests are welcome. Please ensure the project builds locally and that linting passes before submitting a PR.

Security Notes
--------------
- Do not commit `respoint.key` or any private credentials.
- Ensure `latest.json` remains publicly readable at the RAW URL so clients can download updates.

License
-------
This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

Copyright © 2025 Djordje Stefanovic
