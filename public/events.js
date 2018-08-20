(window => {
  const isApp = typeof process !== 'undefined';

  function getRoot() {
    if (isApp) {
      const electron = require('electron');
      return electron.app || electron.remote.app;
    }

    return document.documentElement;
  }

  function emit(root, event) {
    if (isApp) {
      root.emit(...event);
    } else {
      root.dispatchEvent(new CustomEvent(event[0], event[1]));
    }
  }

  const on = isApp ? 'on' : 'addEventListener';

  class Events {
    constructor(namespace = '@events') {
      this.root = getRoot();
      this.namespace = namespace;
    }

    on(name, callback) {
      if (typeof callback !== 'function') {
        throw new Error('.on requires a callback');
      }
      this.root[on](`${this.namespace}/${name}`, event => {
        const res = callback(event.detail.data);
        if (event.detail.callback) {
          event.detail.callback(res);
        }
      });
    }

    emit(name, data, callback) {
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
