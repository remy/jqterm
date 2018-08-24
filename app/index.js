const { app } = require('electron');
const { makeNewWindow, windows } = require('./window');

app.setName('jqTerm');

app.on('ready', () => {
  require('./menu');
  process.env.API = '';
  global.currentTabCount = 1;

  makeNewWindow();
});

app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windows.size === 0) {
    makeNewWindow();
  }
});

// // Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
