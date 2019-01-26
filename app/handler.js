const { app, BrowserWindow } = require('electron');
const { promisify } = require('util');
const { basename } = require('path');
const json5 = require('json5');
const readFile = promisify(require('fs').readFile);
const newFile = require('../lib/template');
const events = require('../public/events');
const Store = require('electron-store');
const store = new Store();
const { makeNewWindow, windows } = require('./window');

function setTheme(value) {
  events.emit('set/theme', { value });
}

function configChange(data) {
  if (BrowserWindow.getFocusedWindow()) {
    const settings = store.get('settings');
    BrowserWindow.getFocusedWindow().settings = { ...settings, ...data };
  }
  events.emit('set/config', data);
  events.emit('run/exec');
}

function toggleBusy(value) {
  events.emit('set/busy', { value });
}

function formatSource() {
  events.emit('set/source-format');
}

function hideSource(value) {
  events.emit('set/source-hide', { value });
}

function getSource({ panel, callback }) {
  events.emit(`get/source`, { panel }, callback);
}

function createNew() {
  events.emit(`set/input`, { value: '' });
  events.emit(`set/source`, { value: newFile });
  events.emit('set/filename', { base: false });
  events.emit('run/exec');
}

function load(source, input, settings) {
  events.emit(`set/input`, { value: input });
  events.emit(`set/source`, { value: source.toString() });
  events.emit('set/filename', { base: false });

  if (BrowserWindow.getFocusedWindow()) {
    const s = store.get('settings');
    BrowserWindow.getFocusedWindow().settings = { ...s, ...settings };
  }
  events.emit('set/config', settings);
  events.emit('run/exec');
}

function openFiles(files) {
  toggleBusy(true);
  let haveJQ = false;
  let haveJSON = false;

  let name = false;

  let workingFiles = files.filter(filename => {
    if (!haveJQ && filename.toLowerCase().endsWith('.jq')) {
      haveJQ = true;
      return true;
    }

    if (!haveJSON && filename.toLowerCase().endsWith('.json')) {
      haveJSON = true;
      name = filename;
      return true;
    }
  });

  if (workingFiles.length === 0) {
    name = files[0];
    workingFiles = [name]; // pick the first one and hope
    haveJSON = true;
  }

  return Promise.all(
    workingFiles.map(filename => {
      let panel = 'source';
      if (filename.toLowerCase().endsWith('.jq')) {
        panel = 'input';
      }

      app.addRecentDocument(filename);

      return readFile(filename, 'utf8').then(value => {
        if (panel === 'source') {
          try {
            value = JSON.stringify(json5.parse(value), '', 2);
          } catch (e) {}
        }
        events.emit(`set/${panel}`, { value });
      });
    })
  )
    .then(() => {
      if (haveJSON) {
        events.emit('set/filename', { base: basename(name), filename: name });
      }
      return events.emit('run/exec');
    })
    .catch(error => {
      console.log(error.stack);
    })
    .then(() => toggleBusy(false));
}

const checkOpenWindow = fn => (...args) => {
  if (windows.size === 0) {
    return makeNewWindow().then(() => {
      fn.apply(null, args);
    });
  }
  fn(...args);
};

module.exports = {
  configChange: checkOpenWindow(configChange),
  getSource: checkOpenWindow(getSource),
  createNew: checkOpenWindow(createNew),
  hideSource: checkOpenWindow(hideSource),
  openFiles: checkOpenWindow(openFiles),
  toggleBusy: checkOpenWindow(toggleBusy),
  setTheme: checkOpenWindow(setTheme),
  load: checkOpenWindow(load),
  formatSource: checkOpenWindow(formatSource),
};
