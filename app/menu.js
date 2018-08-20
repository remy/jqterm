const { Menu, app, dialog, shell } = require('electron');
const fs = require('fs');
const share = require('./share');
const Store = require('electron-store');
const store = new Store({
  settings: {
    slurp: false,
    raw: false,
    rawInput: false,
    sourceVisible: false,
  },
  theme: 'light',
});
const handler = require('./handler');

const save = format => () => {
  dialog.showSaveDialog(
    { showsTagField: false, filters: [{ name: format, extensions: [format] }] },
    filename => {
      const panel = format === 'jq' ? 'input' : 'result';
      handler.getSource({
        panel,
        callback: value => {
          fs.writeFile(filename, value, 'utf8', err => {
            // TODO update UI
            console.log('saved', err);
          });
        },
      });
    }
  );
};

const saveOutput = save('json');
const saveInput = save('jq');

const updateTheme = theme => () => {
  store.set({ theme });
  handler.setTheme(theme);
};

const updateZoom = factor => (menu, browserWindow) => {
  if (factor === 0) {
    store.set('zoom', 1);
    browserWindow.webContents.setZoomFactor(1);
    browserWindow.webContents.setZoomLevel(0);
    return;
  }

  browserWindow.webContents.getZoomFactor(zoom => {
    let newZoom = zoom + factor;
    store.set('zoom', newZoom);
    browserWindow.webContents.setZoomFactor(newZoom);
  });
};

app.on('open-file', (event, file) => {
  event.preventDefault();
  console.log('handle open-file', file);
  handler.openFiles([file]);
});

const updateConfig = menu => {
  store.set(`settings.${menu.name}`, menu.checked);
  handler.configChange({
    [menu.name]: menu.checked,
  });
};

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        accelerator: 'CommandOrControl+n',
        click: () => handler.createNew(),
      },
      { type: 'separator' },
      {
        label: 'Open',
        accelerator: 'CommandOrControl+o',
        click: () => {
          dialog.showOpenDialog(
            {
              properties: ['openFile', 'multiSelections'],
              filters: [
                { name: 'JSON, JQ', extensions: ['json', 'jq'] },
                { name: 'JSON', extensions: ['json'] },
                { name: 'JavaScript', extensions: ['js', 'mjs'] },
                { name: 'All Files', extensions: ['*'] },
              ],
            },
            filePaths => {
              if (!filePaths) {
                return;
              }

              filePaths.forEach(f => app.addRecentDocument(f));
              handler.openFiles(filePaths);
            }
          );
        },
      },
      // { role: 'recentDocuments' },
      { type: 'separator' },
      {
        label: 'Share',
        click: () => share(store.get('settings')),
        accelerator: 'Command+Control+s',
      },
      { type: 'separator' },
      {
        label: 'Save Result',
        accelerator: 'CommandOrControl+s',
        click: saveOutput,
      },
      {
        label: 'Save Query',
        accelerator: 'CommandOrControl+shift+s',
        click: saveInput,
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { role: 'selectall' },
    ],
  },
  {
    label: 'Options',
    submenu: [
      { label: 'Source', enabled: false },
      {
        label: 'Slurp (-s)',
        name: 'slurp',
        type: 'checkbox',
        click: updateConfig,
        checked: store.get('settings.slurp'),
      },
      {
        label: 'Raw Input (-R)',
        name: 'rawInput',
        type: 'checkbox',
        checked: store.get('settings.rawInput'),
        click: updateConfig,
      },
      { type: 'separator' },
      { label: 'Output', enabled: false },
      {
        label: 'Raw Output (-r)',
        checked: store.get('settings.raw'),
        name: 'raw',
        type: 'checkbox',
        click: updateConfig,
      },
    ],
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Hide source',
        accelerator: 'CommandOrControl+shift+t',
        type: 'checkbox',
        name: 'hide-source',
        checked: store.get('settings.hideSource'),
        click(menu) {
          store.set('settings.hideSource', menu.checked);
          handler.hideSource(menu.checked);
        },
      },
      { type: 'separator' },
      {
        label: 'Light theme',
        type: 'radio',
        name: 'theme',
        click: updateTheme('light'),
        checked: store.get('theme') === 'light',
      },
      {
        label: 'Dark theme',
        type: 'radio',
        name: 'theme',
        click: updateTheme('dark'),
        checked: store.get('theme') === 'dark',
      },
      { type: 'separator' },
      { label: 'Actual Size', accelerator: 'Command+0', click: updateZoom(0) },
      { label: 'Zoom In', accelerator: 'Command+plus', click: updateZoom(0.1) },
      { label: 'Zoom Out', accelerator: 'Command+-', click: updateZoom(-0.1) },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  {
    role: 'window',
    submenu: [{ role: 'minimize' }, { role: 'close' }],
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'jq manual',
        click() {
          shell.openExternal('https://stedolan.github.io/jq/manual/');
        },
      },
    ],
  },
];

if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  });

  // // Window menu
  template[5].submenu = [
    { role: 'close' },
    { role: 'minimize' },
    { role: 'zoom' },
  ];
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
