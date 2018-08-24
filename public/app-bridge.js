const electron = require('electron');
const lib = require('../lib');
const json5 = require('json5');
const path = require('path');
const fs = require('fs');
const parse = require('url').parse;
const qs = require('querystring');
const Store = require('electron-store');
const store = new Store();
const cwd = (electron.app || electron.remote.app).getPath('userData');
const lastFilename = path.resolve(cwd, 'last.json');
let filename = store.has('filename') ? store.get('filename') : lastFilename;
const writeFileAtomic = require('write-file-atomic');
const makeDir = require('make-dir');
const events = require('./events');

require('../app/drag');

const theme = store.get('theme');
document.documentElement.classList.remove('theme-light');
document.documentElement.classList.add(`theme-${theme || 'light'}`);

if (store.has('query')) {
  document.querySelector('#input textarea').value = store.get('query');
}

let json = null;
try {
  json = fs.readFileSync(filename, 'utf8');
  if (json.length === 0) {
    throw new Error();
  }
} catch (error) {
  try {
    json = fs.readFileSync(lastFilename, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      makeDir.sync(path.dirname(lastFilename));
    }

    writeFileAtomic(lastFilename, json, () => {});
  }
}

let useFile = false;

window.titlePrefix = store.get('filename')
  ? path.basename(store.get('filename'))
  : `Untitled`;
document.title = `jqTerm`;
window.last = json;

window.onbeforeunload = () => events.teardown();

events.on('set/filename', ({ base, filename: _filename = null }) => {
  store.set({ filename: _filename });
  if (!base) {
    window.titlePrefix = `Untitled`;
    useFile = false;
    filename = null;
    return;
  }
  window.titlePrefix = base;
  filename = _filename;
});

events.on(`set/source`, ({ value }) => {
  Post(value);
});

function Put({ jq, query }) {
  const fromFile = useFile && filename;
  let input = fromFile ? filename : json;

  if (!useFile && input.length === 0) {
    input = '""';
  }

  const options = {
    slurp: query.slurp === 'true',
    output: 'pretty',
    input: fromFile ? 'file' : 'string',
  };

  if (!fromFile && options.slurp) {
    options.input = 'file';
    input = lastFilename;
  }

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

  store.set('query', jq.trim() || '.');

  return lib
    .run({
      input: input.length ? input : '',
      query: jq.trim() || '.',
      options,
    })
    .then(({ result, status }) => {
      if (result.error && result.error === 'spawn E2BIG') {
        useFile = true;
        console.log('switching to file based query');
        return Put({ jq, query });
      }

      let canParse = false;
      try {
        JSON.parse(result);
        canParse = true;
      } catch (e) {}

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
  writeFileAtomic(lastFilename, data, () => {});
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
