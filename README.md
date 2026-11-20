# Windows Boring Notch (Dynamic Island) 🚀

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue.svg)](https://microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-45.4.1-47848F.svg)](https://electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An ultra-sleek, lightweight **Dynamic Island / MacBook Notch** for **Windows 10 & 11**, inspired by [`TheBoredTeam/boring.notch`](https://github.com/TheBoredTeam/boring.notch).

Designed with an authentic **macOS Frosted Glass (Glassmorphism)** theme, ultra-smooth spring physics, system-wide hotkeys, and built-in **free YouTube Music streaming with Smart Radio auto-play**!

---

## ✨ Highlights & Features

### 1. 🪟 Compact Frosted Glass Dynamic Island
- **True Glassmorphism**: Translucent frosted glass effect (`backdrop-filter: blur(28px) saturate(190%)`) with soft edge borders and ambient glow.
- **Compact & Non-Intrusive**:
  - **Collapsed**: `190px × 32px` minimalist pill at the top of your screen.
  - **Expanded**: `480px × 185px` compact dashboard (never blocks your workspace).
- **Dual Display Modes**:
  - **Bezel Notch Mode**: Hugs the top edge of your monitor like an authentic MacBook Pro notch.
  - **Floating Dynamic Island Mode**: Floats elegantly just below the top bezel.
  - Toggle anytime using the `[▭]` button in the header.

### 2. 🎵 Built-in YouTube Music Player with "Smart Radio"
- **Free Unlimited Streaming**: Stream any track directly from YouTube / YouTube Music without opening a browser or logging in.
- **Today's Trending Hits**: On startup, dynamically loads today's fresh Tamil and viral trending tracks.
- **Smart Radio (Genre & Artist Match)**:
  - Select or search any track (e.g. *Anirudh*, *AR Rahman*, *Melodies*, *Gana*, *Lofi*), and the engine automatically builds a dynamic queue of matching genre/artist tracks.
  - Features an **"Up Next"** queue preview so you always know what's coming.
- **Seamless Auto-Play**:
  - Plays continuously without stopping. When a track finishes, it seamlessly transitions into the next similar song.
  - Auto-refills the queue dynamically in the background when fewer than 3 songs remain.
  - **Auto-Skip on Restricted Tracks**: If an owner disables third-party embeds (error 150/101), the player automatically advances to the next track within 0.5s.
- **Live Search & Quick Station Chips**:
  - Instant live search dropdown with video thumbnails and channel/artist tags.
  - Quick genre chips: `🔥 Today's Hits`, `⚡ Anirudh`, `🎵 ARR Hits`, `🦋 Melodies`, `🥁 Gana Hits`, `☕ Lofi Beats`.
- **Audio Spectrum Visualizer**:
  - Live animated visualizer bars in the main player.
  - Mini-equalizer indicator in the collapsed pill when music is playing.

### 3. 🔊 Native Windows Master Volume Control
- **True System Speaker Sync**: Direct Windows CoreAudio control via native bindings.
- Changing the notch volume slider adjusts your Windows Master Speaker volume in real time.
- Volume adjustments made elsewhere (Windows taskbar, keyboard volume keys) reflect instantly inside the notch.
- One-click mute/unmute toggle.

### 4. 📂 File Shelf (Drop Zone)
- Replicates Boring Notch's AirDrop staging tray.
- Drag & drop any files or folders from Windows Explorer directly into the notch.
- Actions: **Open**, **Show in Folder**, or **Copy Path** with a single click.

### 5. ⚡ System HUD
- **RAM Usage**: Real-time memory bar and percentage.
- **CPU Metrics**: Live CPU model and core count.
- **Uptime**: Live system uptime tracker.
- **Battery & Speaker Status**: Real-time battery indicator with charging state and volume percentage.

### 6. ⌨️ Interaction & Shortcuts
- **Hover to Expand**: Expands smoothly when hovering over the collapsed pill; automatically collapses on mouse leave.
- **Pin Notch `[📌]`**: Pin the island open while multitasking.
- **Global Hotkey**: Press **`Ctrl + Alt + N`** anywhere in Windows to toggle the notch open/closed.
- **System Tray**: Runs unobtrusively in the background with quick access from the Windows System Tray.

---

## 🛠️ Tech Stack & Architecture

- **Runtime**: [Electron](https://www.electronjs.org/) + Node.js
- **Audio Stream**: Embedded lightweight `http.createServer` (127.0.0.1) asset server + YouTube Iframe API with security header filtering to support sandboxed audio streaming.
- **Native OS Integration**: `loudness` (Windows CoreAudio endpoint volume control).
- **Styling**: Vanilla CSS3 with hardware-accelerated transforms, CSS variables, and backdrop-filter glassmorphism.
- **Packaging**: `electron-packager` for standalone win32-x64 portable executables.

---

## 🚀 Getting Started

### Prerequisites
- Windows 10 or Windows 11 (64-bit)
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/harisaravanan1708-arch/Notch.git
   cd Notch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the app in development mode:
   ```bash
   npm start
   ```

---

## 🏃 Running Without a Terminal Window

- **Silent Background Launch**: Double-click `run-notch.vbs` (runs quietly in the background without opening a black command prompt).
- **Desktop Shortcut**: Create a shortcut to `run-notch.vbs` or place it in your Windows Startup folder (`shell:startup`) to launch automatically on login.

---

## 📦 Building Standalone Portable Binary

To create a standalone portable `.exe` and update the distribution zip:

```bash
# Package win32-x64 standalone executable
npm run package-win

# Or run the all-in-one build and zip script:
update-and-zip.bat
```

Output is generated at:
- `dist/Windows Boring Notch-win32-x64/Windows Boring Notch.exe`
- `Windows-Boring-Notch.zip`

---

## ⌨️ Controls & Shortcuts

| Action | Shortcut / Trigger |
| :--- | :--- |
| **Toggle Notch Open/Closed** | `Ctrl + Alt + N` (Global) |
| **Expand on Hover** | Move mouse over the collapsed top pill |
| **Pin / Keep Open** | Click the Pin icon `[📌]` |
| **Switch Notch / Island Mode** | Click the display toggle icon `[▭]` |
| **Play / Pause Track** | Spacebar / Center Play button |
| **Next Track** | Click `⏭` (plays next smart radio track) |
| **Previous Track** | Click `⏮` (replays track or plays previous) |
| **System Mute** | Click the speaker icon in the player |

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
