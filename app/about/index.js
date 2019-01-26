const electron = require('electron');
const BrowserWindow = electron.BrowserWindow || electron.remote.BrowserWindow;
const ipcMain = electron.ipcMain || electron.remote.ipcMain;
const url = require('url');
const path = require('path');

const pkg = require('../../package.json');

/*
openAboutWindow({
  icon_path: __dirname + '/../app/icon.png',
  product_name: 'jqTerm',
  package_json_dir: __dirname + '..',
  bug_report_url: 'https://github.com/remy/jace/issues/new',
  bug_link_text: 'Found a bug?',
  // copyright?: string,
  homepage: 'https://jqterm.com',
  description: `jqTerm is a user interface on top of the open source 'jq' tool, and provides syntax highlighting, live feedback and a number of saving options.`,
  license: '',
  // css_path?: string | string[],
  adjust_window_size: false,
  // win_options?: BrowserWindowOptions,
  use_version_info: false,
});
*/

function electronAbout(options, parentWindow) {
  return new Promise((resolve, reject) => {
    const id = `${new Date().getTime()}-${Math.random()}`;

    const opts = Object.assign(
      {
        width: 300,
        height: 350,
        resizable: false,
        title: pkg.name,
        version: pkg.version,
        alwaysOnTop: false,
        icon: __dirname + '/../icon.png',
      },
      options || {}
    );

    let window = new BrowserWindow({
      width: opts.width,
      height: opts.height,
      resizable: opts.resizable,
      parent: parentWindow,
      skipTaskbar: true,
      alwaysOnTop: opts.alwaysOnTop,
      useContentSize: true,
      modal: Boolean(parentWindow),
      title: opts.title,
      icon: opts.icon,
    });

    window.setMenu(null);

    const cleanUp = () => {
      if (window) {
        window.close();
        window = null;
      }
    };

    const unresponsiveListener = () => {
      reject(new Error('Window was unresponsive'));
      cleanUp();
    };

    const errorListener = (event, message) => {
      reject(new Error(message));
      event.returnValue = null;
      cleanUp();
    };

    const getOptionsListener = event => {
      event.returnValue = JSON.stringify(opts);
    };

    ipcMain.on('about-error:' + id, errorListener);
    ipcMain.on('about-get-options:' + id, getOptionsListener);
    window.on('unresponsive', unresponsiveListener);

    window.on('closed', () => {
      ipcMain.removeListener('about-error:' + id, getOptionsListener);
      ipcMain.removeListener('about-error:' + id, errorListener);
      resolve(null);
    });

    const promptUrl = url.format({
      protocol: 'file',
      slashes: true,
      pathname: path.join(__dirname, 'about.html'),
      hash: id,
    });

    window.loadURL(promptUrl);
  });
}

module.exports = electronAbout;
