# Floaty

<div align="center">

![Floaty](https://img.shields.io/badge/Floaty-v1.0.0-blue?style=for-the-badge&logo=electron)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-31.x-47848F?style=for-the-badge&logo=electron&logoColor=white)

**A lightweight, elegant, and cross-platform floating always-on-top webcam mirror window.**  
Keep your face visible during screen recordings, presentations, tutorials, video meetings, or live streams.

[Features](#-features) • [Installation](#-installation) • [Keyboard Shortcuts](#-keyboard-shortcuts) • [Preferences](#-preferences--customization) • [Building](#-building) • [Development](#-development) • [Troubleshooting](#-troubleshooting) • [License](#-license)

</div>

---

## ✨ Features

### 🎥 Camera & Display
- **Always-on-Top Floating Window**: Stays pinned above all open apps, full-screen windows, and presentation decks.
- **Loom-Style Circular Bubble Mode**: Seamlessly switch between customizable rounded rectangle and a perfect 1:1 circular bubble (`C`).
- **Flip / Mirror Toggle**: One-key horizontal flip (`F`) for a natural selfie/mirror view.
- **Multi-Camera Support**: Switch instantly between integrated webcams, USB cameras, and external capture cards.
- **Quick Aspect Ratio Presets**: Instantly jump between 1:1 square, 4:3 classic, and 16:9 widescreen formats.
- **Adjustable Transparency**: Modify window opacity from 40% to 100% so background content stays readable.

### 🎨 Polished UI & UX
- **Minimalist Floating Toolbar**: Hover-activated controls that stay out of the way during recordings.
- **Dedicated Preferences Hub**: Clean, dark-mode settings panel (`Space`) for camera source, appearance, opacity, and shortcuts.
- **Custom Border Radius**: Smoothly adjust corner roundness anywhere from sharp rectangle (0px) to rounded capsule (50px).
- **Persistent Preferences**: Remembers your preferred camera, window dimensions, position, opacity, and shape across restarts.
- **Cross-Platform Polish**: Custom-tailored rendering for macOS, Windows, and Linux (including Wayland/X11 transparency fixes).

### 🔒 Privacy & Performance
- **100% Offline & Private**: All video feeds are processed locally on your hardware. Zero analytics, zero network requests, zero telemetry.
- **Camera-Only Permissions**: Only accesses video devices. Never records, stores, or streams audio/microphone data without consent.
- **Resource Efficient**: Uses lightweight hardware-accelerated rendering with fallback compatibility flags for stable performance.

---

## 🎯 Use Cases

- **Screen Recording & Demos**: Add a professional floating face bubble to OBS, Loom, screen capture, or tutorial recordings.
- **Video Conferencing**: Keep your camera preview pinned while referencing notes, slides, or terminal windows during Zoom, Google Meet, or Teams calls.
- **Streaming & Content Creation**: Use as an unobtrusive, always-visible webcam preview or overlay.
- **Quick Appearance Check**: A discreet, minimal mirror utility ready at the press of a shortcut.

---

## 📥 Installation

### Pre-built Releases

Download the latest binaries for your operating system from the [Releases](https://github.com/sohail22dec/floaty/releases) page:

- **macOS**: `.dmg` installer or `.zip` (Universal binary for both Apple Silicon M1/M2/M3 and Intel x64)
- **Windows**: `.exe` installer (NSIS) or standalone portable executable
- **Linux**: `.AppImage` or `.deb` package

### Install from Source

```bash
# Clone the repository
git clone https://github.com/sohail22dec/floaty.git
cd floaty

# Install dependencies
npm install

# Start the application
npm start
```

---

## ⌨️ Keyboard Shortcuts

Floaty provides both global shortcuts (accessible from any application) and focused in-app shortcuts.

### 🌐 Global Shortcuts

| Shortcut (macOS) | Shortcut (Win / Linux) | Action |
| :--- | :--- | :--- |
| `Cmd + Alt + P` | `Ctrl + Alt + P` | **Toggle Always on Top** (Pin / Unpin) |
| `Cmd + Alt + H` | `Ctrl + Alt + H` | **Toggle Window Visibility** (Show / Hide) |
| `Cmd + Alt + R` | `Ctrl + Alt + R` | **Reload Camera Feed** |
| `Cmd + Alt + 1` | `Ctrl + Alt + 1` | **Preset: 1:1 Square** (300×300) |
| `Cmd + Alt + 2` | `Ctrl + Alt + 2` | **Preset: 4:3 Standard** (400×300) |
| `Cmd + Alt + 3` | `Ctrl + Alt + 3` | **Preset: 16:9 Widescreen** (400×225) |
| `Cmd + Alt + I` | `Ctrl + Alt + I` | **Toggle DevTools** (Debug mode) |

> **Note**: `Ctrl+Alt+P` is used for pinning to avoid hotkey conflicts with standard Linux terminal hotkeys (`Ctrl+Alt+T`).

### 🪟 In-App Shortcuts (When Window is Focused)

| Key | Action |
| :---: | :--- |
| <kbd>Space</kbd> | Open **Floaty Preferences** Window |
| <kbd>C</kbd> | Toggle **Circle Bubble** mode (Loom style 1:1 circle vs rectangle) |
| <kbd>F</kbd> | **Mirror / Flip** camera horizontally |
| <kbd>O</kbd> | Cycle **Opacity** / transparency levels |
| <kbd>S</kbd> | Toggle **Size Presets** overlay panel |
| <kbd>H</kbd> | Toggle top controls **Toolbar visibility** |
| <kbd>P</kbd> | Toggle **Always on Top** |
| <kbd>Esc</kbd> | Close open panels or settings overlay |

---

## 🎛 Preferences & Customization

Press <kbd>Space</kbd> or click the gear icon in the floating toolbar to open the **Floaty Preferences** window:

1. **Camera**:
   - Device selector dropdown with dynamic device refresh.
   - Quick flip/mirror toggle.
2. **Appearance**:
   - **Corner Radius**: Slider from 0px (sharp rectangle) up to 50px (smooth rounded capsule).
   - **Window Transparency**: Slider from 40% to 100% opacity.
   - **Always on Top**: Sticky toggle switch.
   - **Auto-Hide Toolbar**: Keeps the bubble minimal and only reveals control buttons when hovering.
3. **Shortcuts Cheatsheet**:
   - Interactive reference list of all configured keybindings.

Settings are stored locally on your machine via Electron config storage and automatically synchronized between windows.

---

## 🔧 Building & Packaging

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v8.0.0` or higher
- Platform-specific build tools:
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Windows: Visual Studio C++ Build Tools (if native dependencies require compilation)
  - Linux: `build-essential`, `libssl-dev`

### Build Scripts

```bash
# Development mode with hot logging
npm run dev

# Package for current platform
npm run build

# macOS Builds
npm run build:mac              # Universal binary (arm64 + x64)
npm run build:mac-arm          # Apple Silicon only
npm run build:mac-intel        # Intel x64 only
npm run build:mac-universal    # Universal package

# Windows Build
npm run build:win              # Generates NSIS installer & Portable exe

# Linux Build
npm run build:linux            # Generates .AppImage and .deb

# Package all target platforms
npm run dist:all
```

Outputs will be saved in the `dist/` directory.

---

## 🛠 Development

### Project Structure

```
floaty/
├── assets/                    # Application icons and graphic assets
├── build/                     # Build resources (icons, entitlements, packaging assets)
├── scripts/                   # Build and notarization helpers
├── src/
│   ├── main.js                # Application entry point & Linux visual setup
│   ├── preload.js             # Context bridge & secure IPC API
│   ├── main/                  # Electron Main Process modules
│   │   ├── app-manager.js     # Lifecycle & single-instance management
│   │   ├── window-manager.js  # Floating camera & preferences window manager
│   │   ├── ipc-handlers.js    # Inter-process communication logic
│   │   ├── menu-manager.js    # Tray and application context menus
│   │   └── shortcut-manager.js# Global keyboard shortcut registry
│   └── renderer/              # Renderer Process UI
│       ├── index.html         # Main camera viewport layout
│       ├── styles.css         # Glassmorphism styling, circle masking, transitions
│       ├── app.js             # Main renderer bootstrap
│       ├── camera-manager.js  # MediaDevices API & stream handling
│       ├── ui-controller.js   # Toolbar, dragging, resize, and UI state
│       ├── preferences.html   # Standalone modern Preferences window
│       ├── preferences.css    # Preferences design system
│       ├── preferences.js     # Preferences event listeners & IPC sync
│       └── settings-manager.js# Client-side configuration manager
├── package.json               # Dependencies and build configuration
└── LICENSE                    # MIT License
```

### Code Quality

```bash
# Run ESLint check
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

---

## 🐛 Troubleshooting

### Camera Not Showing / Permission Denied
- **macOS**: Ensure Floaty is granted camera permission in **System Settings > Privacy & Security > Camera**.
- **Linux**: Verify your user belongs to the `video` group: `sudo usermod -aG video $USER`.
- **In-use conflict**: Ensure another application (OBS, Zoom, browser) does not hold an exclusive lock on the camera device.

### Black Window Borders on Linux (Wayland / Mutter)
Floaty includes automated startup switches (`--enable-transparent-visuals --disable-gpu`) to bypass Mutter/Wayland transparency bugs that cause rounded window corners to display solid black rectangular edges. If running manually from the terminal, ensure you launch via `npm start`.

### Window Not Staying on Top
- On macOS, ensure Floaty has necessary accessibility privileges if global window management is restricted.
- Use `Ctrl+Alt+P` (`Cmd+Alt+P` on macOS) to re-engage the sticky pin state.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository: [https://github.com/sohail22dec/floaty](https://github.com/sohail22dec/floaty)
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my new feature'`
4. Push to your branch: `git push origin feature/my-feature`
5. Submit a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ by [Sohail](https://github.com/sohail22dec) using [Electron](https://www.electronjs.org/)

If you find Floaty helpful, please consider giving it a ⭐ on [GitHub](https://github.com/sohail22dec/floaty)!

</div>
