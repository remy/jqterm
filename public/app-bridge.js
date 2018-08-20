const electron = require('electron');
const lib = require('../lib');
const json5 = require('json5');
const path = require('path');
const fs = require('fs');
const parse = require('url').parse;
const qs = require('querystring');
const cwd = (electron.app || electron.remote.app).getPath('userData');
const filename = path.resolve(cwd, 'last.json');
const writeFileAtomic = require('write-file-atomic');
const makeDir = require('make-dir');
const Store = require('electron-store');
const events = require('./events');
const store = new Store();

require('../app/handler');

const theme = store.get('theme');
document.documentElement.classList.remove('theme-light');
document.documentElement.classList.add(`theme-${theme}`);

let useFile = false;

window.titlePrefix = `jqTerm`;
document.title = `jqTerm`;

events.on('set/filename', filename => {
  if (!filename) {
    window.titlePrefix = `jqTerm`;
    return;
  }
  window.titlePrefix = `jqTerm — ${filename}`;
});

let json = null;
try {
  json = fs.readFileSync(filename, 'utf8');
  if (json.length === 0) {
    throw new Error();
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    makeDir.sync(path.dirname(filename));
  }

  json = JSON.stringify(require('../lib/template'), '', 2);
  writeFileAtomic(filename, json, () => {});
}

window.last = json;

function Put({ jq, query }) {
  let input = useFile ? filename : json;

  if (!useFile && input.length === 0) {
    input = '""';
  }

  const options = {
    slurp: query.slurp === 'true',
    output: 'pretty',
    input: useFile ? 'file' : 'string',
  };

  if (query['raw-input'] === 'true') {
    options.input = 'string';
    input = json;

    if (options.slurp) {
      // input = input;
      options.input = 'json';
    } else {
      // correct as per command lines
      input = input.split('\n').map(_ => `"${_}"`);
    }
  }

  return lib
    .run({
      input: input.length ? input : '',
      query: jq.trim() || '.',
      options,
    })
    .then(({ result, status }) => {
      let title = null;
      if (result.error) {
        if (result.error === 'spawn E2BIG') {
          useFile = true;
          console.log('switching to file based query');
          return Put({ jq, query });
        }
        title = `error`;
      }

      let canParse = false;
      if (!title) {
        try {
          const res = JSON.parse(result);
          canParse = true;
          if (Array.isArray(res)) {
            title = `array [${res.length}]`;
          } else if (typeof res === 'string') {
            title = 'string';
          } else if (typeof res === 'number') {
            title = 'number';
          } else if (typeof res === 'object') {
            title = `object { props: ${Object.keys(res).length} }`;
          } else if (res.includes('\n')) {
            title = `strings (${res.split('\n').length})`;
          } else {
            title = 'non JSON';
          }
          // result = res;
        } catch (e) {
          console.log(e);
          title = 'non JSON';
        }
      }

      let opts = [];
      if (store.get('settings.slurp')) {
        opts.push('s');
      }
      if (store.get('settings.rawInput')) {
        opts.push('R');
      }
      if (store.get('settings.raw')) {
        opts.push('r');
      }

      document.title = `${window.titlePrefix}${
        opts.length ? ' -' + opts.join('') : ''
      } — ${title}`;
      useFile = true;
      return {
        status,
        json: () => {
          if (result.error || query.raw !== 'true' || canParse === false)
            return Promise.resolve(result);
          return Promise.resolve(JSON.parse(result));
        },
      };
    });
}

function Get() {
  return {
    json: () => Promise.resolve(json),
    status: 200,
  };
}

function Post(data) {
  json = data;
  try {
    data = json = JSON.stringify(json5.parse(json), '', 2);
  } catch (e) {
    //ignore
  }
  useFile = false;

  // async to avoid racing
  writeFileAtomic(filename, data, () => {});
}

window.fetch = (url, options) => {
  const method = (options || { method: 'get' }).method.toLowerCase();
  if (method === 'post') {
    // write
    Post(options.body);
    return Promise.resolve(Get());
  }

  if (method === 'get') {
    return Promise.resolve(Get());
  }

  if (method === 'put') {
    return Promise.resolve(
      Put({ query: qs.parse(parse(url).query), jq: options.body })
    );
  }
};
