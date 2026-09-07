const { app } = require('electron');

app.name = 'floaty';

// On Linux (especially Wayland/X11 with Mutter), GPU acceleration causes transparent
// window regions/rounded corners to render as solid black.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-gpu');
  app.disableHardwareAcceleration();

  // In development, ensure desktop launcher and icon are registered so the Linux dock displays the icon
  if (!app.isPackaged) {
    try {
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      const { exec } = require('child_process');
      const home = os.homedir();
      const appDir = path.resolve(__dirname, '..');
      const desktopFile = path.join(home, '.local/share/applications/com.sohail.floaty.desktop');
      const legacyDesktopFile = path.join(home, '.local/share/applications/floaty.desktop');
      const iconFile = path.join(home, '.local/share/icons/hicolor/512x512/apps/floaty.png');
      const srcIcon = path.join(appDir, 'assets/icon.png');

      if (fs.existsSync(legacyDesktopFile)) {
        try {
          fs.unlinkSync(legacyDesktopFile);
        } catch (_err) {
          // ignore
        }
      }

      if (fs.existsSync(srcIcon)) {
        if (!fs.existsSync(iconFile)) {
          fs.mkdirSync(path.dirname(iconFile), { recursive: true });
          fs.copyFileSync(srcIcon, iconFile);
        }
      }

      fs.mkdirSync(path.dirname(desktopFile), { recursive: true });
      const entry = `[Desktop Entry]\nName=Floaty\nComment=Floating Camera\nExec=${process.execPath} ${appDir} --no-sandbox --enable-transparent-visuals --disable-gpu\nIcon=${srcIcon}\nTerminal=false\nType=Application\nStartupWMClass=floaty\nCategories=AudioVideo;\n`;

      let needsWrite = true;
      if (fs.existsSync(desktopFile)) {
        const existing = fs.readFileSync(desktopFile, 'utf8');
        if (existing === entry) {
          needsWrite = false;
        }
      }
      if (needsWrite) {
        fs.writeFileSync(desktopFile, entry, 'utf8');
        exec('update-desktop-database ~/.local/share/applications 2>/dev/null');
        exec('gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor 2>/dev/null');
      }
    } catch {
      // Ignore shortcut setup errors
    }
  }
}

const AppManager = require('./main/app-manager');

// Create and initialize the application
const appManager = new AppManager();
appManager.initialize();

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  // eslint-disable-next-line no-console
  console.error('Uncaught Exception:', error);
  // In production, you might want to log this to a file or service
});

process.on('unhandledRejection', (reason, promise) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to log this to a file or service
});
