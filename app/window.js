const { app, BrowserWindow, nativeImage } = require('electron');
const join = require('path').join;
const Store = require('electron-store');
const windowStateKeeper = require('electron-window-state');

const store = new Store({ zoom: 1 });

const delay = (fn, timeout) =>
  new Promise(resolve => {
    setTimeout(() => {
      fn();
      resolve();
    }, timeout);
  });

const icon = nativeImage.createFromPath(join(__dirname, 'icon.png'));

require('electron-context-menu')();
// {
//   prepend: (params, browserWindow) => {
//     return [
//       {
//         label: 'Format Document',
//         visible: true,
//       },
//     ];
//   },
// });

const windows = new Set();

function makeNewWindow(makeEmpty = false) {
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
      let promise = Promise.resolve();
      if (makeEmpty) {
        promise = mainWindow.webContents.executeJavaScript(
          `
            input.setValue('.');
            source.setValue('{}');
            jq.sourceChange(source, input);
            updateData('{}', true);
            Post('{}')
            setFilename({ base: false });
            exec(input.getValue());
          `
        );
      }

      resolve(promise);
    });
  }).then(() => {
    // mainWindow.openDevTools();
    const settings = store.get('settings');
    const hideSource = store.get('hideSource');

    if (makeEmpty) {
      settings.slurp = false;
      settings.rawInput = false;
      settings.raw = false;
    }

    if (settings) {
      const handler = require('./handler');

      mainWindow.settings = settings;
      const timeout = hideSource ? 50 : 0;

      return delay(() => {
        handler.hideSource(hideSource);
        mainWindow.show();
        handler.configChange(settings);
      }, timeout);
    } else {
      mainWindow.show();
    }
  });
}

module.exports = { makeNewWindow, windows };
