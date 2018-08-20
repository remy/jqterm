const { promisify } = require('util');
const { basename } = require('path');
const json5 = require('json5');
const readFile = promisify(require('fs').readFile);
const events = require('../public/events');

function setTheme(value) {
  events.emit('set/theme', { value });
}

function configChange(data) {
  events.emit('set/config', data);
  events.emit('run/exec');
}

function toggleBusy(value) {
  events.emit('set/busy', { value });
}

function hideSource(value) {
  events.emit('set/source-hide', { value });
}

function getSource({ panel, callback }) {
  events.emit(`get/source`, { panel }, callback);
}

function createNew() {
  events.emit(`set/source`, { value: '' });
  events.emit(`set/input`, { value: '.' });
  events.emit('set/filename', false);
  events.emit('run/exec');
}

function openFiles(files) {
  let haveJQ = false;
  let haveJSON = false;

  let name = false;

  return Promise.all(
    files
      .filter(filename => {
        if (!haveJQ && filename.toLowerCase().endsWith('.jq')) {
          haveJQ = true;
          if (!name) name = basename(filename);
          return true;
        }

        if (!haveJSON && filename.toLowerCase().endsWith('.json')) {
          haveJSON = true;
          name = basename(filename);
          return true;
        }
      })
      .map(filename => {
        let panel = 'source';
        if (filename.toLowerCase().endsWith('.jq')) {
          panel = 'input';
        }

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
      events.emit('set/filename', name);
      events.emit('run/exec');
    })
    .catch(error => {
      console.log(error.stack);
    });
}

module.exports = {
  configChange,
  getSource,
  createNew,
  hideSource,
  openFiles,
  toggleBusy,
  setTheme,
};
