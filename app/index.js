const { app, BrowserWindow, nativeImage } = require('electron');
const join = require('path').join;
const Store = require('electron-store');
const handler = require('./handler');
const windowStateKeeper = require('electron-window-state');

const store = new Store({
  zoom: 1,
});

const icon = nativeImage.createFromPath(join(__dirname, 'icon.png'));

require('electron-context-menu')({
  // prepend: (params, browserWindow) => [{}],
});

app.setName('jqTerm');

const windows = new Set();

function makeNewWindow() {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1024,
    defaultHeight: 600,
  });

  let mainWindow = new BrowserWindow({
    height: mainWindowState.height,
    width: mainWindowState.width,
    x: mainWindowState.x,
    y: mainWindowState.y,
    show: false,
    title: `#${windows.size}`,
    zoomFactor: store.get('zoom'),
    icon,
  });

  windows.add(mainWindow);

  // mainWindow.on('new-window-for-tab', () => {
  //   global.currentTabCount++;
  //   const newWin = makeNewWindow();
  //   mainWindow.addTabbedWindow(newWin);
  // });

  mainWindow.loadFile(join(__dirname, '..', 'public', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    // mainWindow.openDevTools();
    const settings = store.get('settings');

    if (settings) {
      handler.hideSource(settings.hideSource);
      handler.configChange(settings);

      setTimeout(() => mainWindow.show(), settings.hideSource ? 50 : 0);
    } else {
      mainWindow.show();
    }
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    global.currentTabCount--;
    windows.delete(mainWindow);
  });

  mainWindowState.manage(mainWindow);

  return mainWindow;
}

app.on('ready', () => {
  require('./menu');
  process.env.API = '';
  global.currentTabCount = 1;

  makeNewWindow();
});

// // Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
