const { Menu, app, dialog, shell } = require('electron');
const fs = require('fs');
const share = require('./share');
const examples = require('./examples.json');
const Store = require('electron-store');
const defaultSettings = {
  slurp: false,
  raw: false,
  rawInput: false,
};
const store = new Store({
  settings: defaultSettings,
  theme: 'light',
});
const handler = require('./handler');

const save = format => () => {
  let defaultPath = null;

  if (store.get('filename')) {
    const suffix = format === 'json' ? '-result' : '';
    defaultPath =
      store
        .get('filename')
        .split('.')
        .slice(0, -1)
        .join('.') + suffix;
  }
  dialog.showSaveDialog(
    {
      showsTagField: false,
      defaultPath,
      filters: [{ name: format, extensions: [format] }],
    },
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
  handler.openFiles([file]);
});

const updateConfig = menu => {
  store.set(`settings.${menu.name}`, menu.checked);
  handler.configChange({
    [menu.name]: menu.checked,
  });
};

const loadExample = m => {
  const { dataSource, dataInput } = m;
  Object.keys(defaultSettings).forEach(key => {
    menu.getMenuItemById(key).checked = false;
  });
  store.set({ settings: defaultSettings });
  handler.load(dataSource, dataInput, defaultSettings);
};

examples.forEach(menu => {
  menu.submenu.forEach(menu => {
    menu.click = loadExample;
  });
});

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Window',
        accelerator: 'CommandOrControl+n',
        click: () => {
          const { makeNewWindow } = require('./window');
          makeNewWindow();
        },
      },
      {
        label: 'New Empty',
        accelerator: 'CommandOrControl+shift+n',
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

              handler.openFiles(filePaths);
            }
          );
        },
      },
      {
        role: 'recentDocuments',
        submenu: [],
      },
      {
        label: 'Examples',
        submenu: examples,
      },
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
      {
        label: 'Reset All',
        click: () => {
          Object.keys(defaultSettings).forEach(key => {
            menu.getMenuItemById(key).checked = false;
          });
          store.set({ settings: defaultSettings });
          handler.configChange(defaultSettings);
        },
      },
      { type: 'separator' },
      { label: 'Source', enabled: false },
      {
        label: 'Slurp (-s)',
        name: 'slurp',
        id: 'slurp',
        type: 'checkbox',
        click: updateConfig,
        checked: store.get('settings.slurp'),
      },
      {
        label: 'Raw Input (-R)',
        name: 'rawInput',
        id: 'rawInput',
        type: 'checkbox',
        checked: store.get('settings.rawInput'),
        click: updateConfig,
      },
      { type: 'separator' },
      { label: 'Output', enabled: false },
      {
        label: 'Raw Output (-r)',
        checked: store.get('settings.raw'),
        id: 'raw',
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
        label: 'Hide Source',
        accelerator: 'CommandOrControl+shift+t',
        type: 'checkbox',
        name: 'hide-source',
        checked: store.get('hideSource'),
        click(menu) {
          store.set('hideSource', menu.checked);
          handler.hideSource(menu.checked);
        },
      },
      { type: 'separator' },
      {
        label: 'Light Theme',
        type: 'radio',
        name: 'theme',
        click: updateTheme('light'),
        checked: store.get('theme') === 'light',
      },
      {
        label: 'Dark Theme',
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

let currentWindow = null;
app.on('browser-window-focus', (event, window) => {
  if (currentWindow === window) {
    return;
  }
  currentWindow = window;
  if (!window.settings) {
    return;
  }

  const settings = window.settings;
  Object.keys(defaultSettings).forEach(key => {
    menu.getMenuItemById(key).checked = settings[key];
  });
  store.set({ settings });
  handler.configChange(settings, false);
});

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
