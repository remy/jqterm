const lib = require('../lib');
const { v4 } = require('uuid');
const parse = require('url').parse;
const qs = require('querystring');
const Store = require('electron-store');
const store = new Store();

document.title = 'jqterm';

let json =
  store.get('last') || JSON.stringify(require('../lib/template'), '', 2);
window.last = json;

function Put({ query, options }) {
  options.input = 'text';
  return {
    json: () => {
      return lib
        .run({
          input: json,
          query,
          options,
        })
        .then(({ result }) => {
          return result;
        });
    },
    status: 200,
  };
}

function Get() {
  return {
    json: () => Promise.resolve(json),
    status: 200,
  };
}

window.fetch = (url, options) => {
  console.log(options);
  const method = (options || { method: 'get' }).method.toLowerCase();
  if (method === 'post') {
    // write
    const body = lib.makeGistBody({
      body: options.body,
      guid: process.env.USER,
    });
    // lib.writeToFile({ ...body, id: v4() });
    json = options.body;
    try {
      json = JSON.stringify(JSON.parse(json), '', 2);
    } catch (e) {
      //ignore
    }
    store.set('last', json);
    return Promise.resolve(Get());
  }

  if (method === 'get') {
    return Promise.resolve(Get());
  }

  if (method === 'put') {
    return Promise.resolve(
      Put({ options: qs.parse(parse(url).query), query: options.body })
    );
  }
};
