const { app, BrowserWindow, nativeImage } = require('electron');
const join = require('path').join;
const Store = require('electron-store');
const windowStateKeeper = require('electron-window-state');

const store = new Store({ zoom: 1 });

const icon = nativeImage.createFromPath(join(__dirname, 'icon.png'));

require('electron-context-menu')({
  // prepend: (params, browserWindow) => [{}],
});

const windows = new Set();

function makeNewWindow() {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1024,
    defaultHeight: 600,
  });

  let mainWindow = new BrowserWindow({
    height: mainWindowState.height,
    width: mainWindowState.width,
    x: mainWindowState.x + windows.size * 20,
    y: mainWindowState.y + windows.size * 20,
    show: false,
    title: `#${windows.size}`,
    webPreferences: {
      zoomFactor: store.get('zoom'),
    },
    icon,
  });

  if (windows.size === 0) {
    app.currentWindow = mainWindow;
  }

  windows.add(mainWindow);

  // mainWindow.on('new-window-for-tab', () => {
  //   global.currentTabCount++;
  //   const newWin = makeNewWindow();
  //   mainWindow.addTabbedWindow(newWin);
  // });

  mainWindow.loadFile(join(__dirname, '..', 'public', 'index.html'));
  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    windows.delete(mainWindow);
    mainWindow = null;
    global.currentTabCount--;
  });

  mainWindowState.manage(mainWindow);

  return new Promise(resolve => {
    mainWindow.once('ready-to-show', () => {
      // mainWindow.openDevTools();
      const settings = store.get('settings');
      const hideSource = store.get('hideSource');

      if (settings) {
        const handler = require('./handler');

        handler.hideSource(hideSource);
        handler.configChange(settings);

        mainWindow.settings = settings;

        setTimeout(() => {
          mainWindow.show();
          resolve();
        }, hideSource ? 50 : 0);
      } else {
        mainWindow.show();
        resolve();
      }
    });
  });
}

module.exports = { makeNewWindow, windows };
