(window => {
  const isApp = typeof process !== 'undefined';

  function getSelf() {
    if (isApp) {
      const electron = require('electron');
      return electron.app || electron.remote.getCurrentWindow();
    }
    return document.documentElement;
  }

  function getRoot() {
    if (isApp) {
      const electron = require('electron');
      return electron.app || electron.remote.app;
    }

    return document.documentElement;
  }

  function emit(root, event) {
    if (isApp) {
      const electron = require('electron');

      let self;
      if (electron.BrowserWindow) {
        self = electron.BrowserWindow.getFocusedWindow();
      }

      if (!self) {
        if (electron.remote) {
          self = electron.remote.getCurrentWindow();
        } else {
          // app.currentWindow is a horrible hack
          self =
            electron.app.currentWindow || electron.app || electron.remote.app;
        }
      }

      self.emit(...event);
    } else {
      root.dispatchEvent(new CustomEvent(event[0], event[1]));
    }
  }

  const on = isApp ? 'on' : 'addEventListener';
  const off = isApp ? 'removeListener' : 'removeEventListener';
  let id = 0;

  class Events {
    constructor(namespace = '@events') {
      this.root = getRoot();
      this.self = getSelf();
      this.id = id++;
      this.tracker = [];
      this.namespace = namespace;
    }

    teardown() {
      for (let [name, callback] of this.tracker) {
        this.root[off](name, callback);
      }
    }

    on(name, callback) {
      console.log('on(%s)', name);

      if (typeof callback !== 'function') {
        throw new Error('.on requires a callback');
      }

      const handler = event => {
        const res = callback(event.detail.data);
        if (event.detail.callback) {
          event.detail.callback(res);
        }
      };

      this.tracker.push([`${this.namespace}/${name}`, handler]);
      this.self[on](`${this.namespace}/${name}`, handler);
    }

    emit(name, data, callback) {
      console.log('emit(%s)', name);

      return new Promise(resolve => {
        if (!callback) {
          callback = value => resolve(value);
        }
        const event = [
          `${this.namespace}/${name}`,
          {
            detail: {
              data,
              callback: value => {
                if (callback) callback(value);
                resolve(value);
              },
            },
          },
        ];

        emit(this.root, event);
      });
    }
  }

  const events = new Events('@jqterm');

  if (isApp) {
    module.exports = events;
  }
  window.events = events;
})(typeof window !== 'undefined' ? window : this);
