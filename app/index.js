const { app, BrowserWindow } = require('electron');
const join = require('path').join;

app.setName('jqterm');
let mainWindow = null;

app.on('ready', () => {
  require('./menu');
  process.env.API = '';
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    show: false,
    title: 'jqterm',
  });

  mainWindow.loadFile(join(__dirname, '..', 'public', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.webContents.openDevTools();
    mainWindow.maximize();
    mainWindow.show();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', e => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

// // Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
