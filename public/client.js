/* global CodeMirror */
const $ = s => document.querySelector(s);
const API = 'https://jace.glitch.me';
// const API = 'http://localhost:3009';

let id = '';

/* all jq keywords based on following from docs page
   Array.from( // cast to array
     new Set( // using a Set to remove dupes
       $$('h3 code') // method selector
        .map(_ => _.innerText.replace(/\(.*$/, '')) // strip func args
        .filter(_ => !_.includes(' ')) // ignore with spaces
        .filter(_ => /^[a-z]/i.test(_)) // ignore non-alpha funcs
      )
    )
   */
const keywords = [
  'length',
  'utf8bytelength',
  'keys',
  'keys_unsorted',
  'has',
  'in',
  'map',
  'map_values',
  'path',
  'del',
  'getpath',
  'setpath',
  'delpaths',
  'to_entries',
  'from_entries',
  'with_entries',
  'select',
  'arrays',
  'objects',
  'iterables',
  'booleans',
  'numbers',
  'normals',
  'finites',
  'strings',
  'nulls',
  'values',
  'scalars',
  'empty',
  'error',
  'halt',
  'halt_error',
  'paths',
  'leaf_paths',
  'add',
  'any',
  'all',
  'flatten',
  'range',
  'floor',
  'sqrt',
  'tonumber',
  'tostring',
  'type',
  'infinite',
  'nan',
  'isinfinite',
  'isnan',
  'isfinite',
  'isnormal',
  'group_by',
  'min',
  'max',
  'min_by',
  'max_by',
  'unique',
  'unique_by',
  'reverse',
  'contains',
  'indices',
  'index',
  'rindex',
  'inside',
  'startswith',
  'endswith',
  'combinations',
  'ltrimstr',
  'rtrimstr',
  'explode',
  'implode',
  'split',
  'join',
  'ascii_downcase',
  'ascii_upcase',
  'while',
  'until',
  'recurse',
  'recurse_down',
  'walk',
  'env',
  'transpose',
  'bsearch',
  'builtins',
  'test',
  'match',
  'capture',
  'scan',
  'splits',
  'sub',
  'gsub',
  'limit',
  'first',
  'last',
  'nth',
  'foreach',
  'input',
  'inputs',
  'debug',
  'stderr',
  'input_filename',
  'input_line_number',
  'truncate_stream',
  'fromstream',
  'tostream',
  'modulemeta',
];

function getKeys(object) {
  return Object.keys(object).reduce((acc, curr) => {
    acc.push(curr);
    if (typeof object[curr] === 'object') {
      acc = acc.concat(getKeys(object[curr]));
    }

    return acc;
  }, []);
}

const guid = (() => {
  function generate() {
    const s4 = () =>
      Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);

    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
  }

  let guid = localStorage.guid;

  if (!guid) {
    guid = localStorage.guid = generate();
  }

  return guid;
})();

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

function getHash() {
  const query = escape(input.getValue());
  return `/#!/${id}?query=${query}`;
}

function readHash() {
  const url = new URL(
    window.location.origin + window.location.hash.split('#!')[1]
  );
  const query = url.searchParams.get('query') || '.';
  id = url.pathname.substr(1);
  input.setValue(query);
}

$('body').addEventListener('keydown', e => {
  if (id && e.keyCode === 83 && (e.metaKey || e.ctrlKey)) {
    // save
    const blob = new Blob([result.getValue() || ''], {
      type: 'application/json',
    });
    const anchor = document.createElement('a');
    anchor.download = `${id}.json`;
    anchor.href = URL.createObjectURL(blob);
    anchor.click();
    e.preventDefault();
  }
});

const source = CodeMirror.fromTextArea($('#source textarea'), {
  lineNumbers: true,
  mode: 'application/ld+json',
  scrollPastEnd: true,
});

const result = CodeMirror.fromTextArea($('#result textarea'), {
  lineNumbers: true,
  mode: 'application/ld+json',
  scrollPastEnd: true,
  readOnly: true,
});

const input = CodeMirror.fromTextArea($('#input textarea'), {
  mode: 'text',
  autocomplete: true,
  keywords,
  autofocus: true,
});

input.on(
  'change',
  debounce(cm => {
    exec(cm.getValue());
  }),
  500
);

source.on(
  'change',
  debounce(async (cm, event) => {
    try {
      const value = getKeys(JSON.parse(cm.getValue()));
      input.addKeywordsFromString(value.join(' '));
    } catch (e) {}

    if (event.origin !== 'setValue') {
      await updateData(cm.getValue());
    }
    await exec(input.getValue());
  }, 1000)
);

const updateData = async body => {
  const res = await fetch(`${API}/${id || ''}?guid=${guid}`, {
    method: 'post',
    body,
  });
  // FIXME deal with 404
  const json = await res.json();
  if (json.id && id !== json.id) {
    id = json.id;
    window.history.replaceState(null, id, getHash());
  }
};

async function exec(body, reRequest = false) {
  if (!id) return;
  window.history.replaceState(null, id, getHash());
  const res = await fetch(`${API}/${id}?guid=${guid}&_method=PUT`, {
    method: 'post',
    body,
  });
  if (res.status !== 200) {
    const json = await res.json();

    if (res.status === 404) {
      result.setValue('Record not found: resubmitting');
      if (!reRequest) {
        // exec(body, true);
      }
      return;
    }
    result.setValue(json.error);
    return;
  }
  const json = await res.json();
  result.setValue(json);
}

if (window.location.hash.indexOf('#!/') === 0) {
  readHash();
  fetch(`${API}/${id}.json`)
    .then(res => res.json())
    .then(json => {
      if (json.id !== id) {
        id = json.id;
        window.history.replaceState(null, id, getHash());
      }
      source.setValue(JSON.stringify(json.payload, '', 2));
      exec(input.getValue());
    });
}

input.setCursor({ line: 0, ch: input.getValue().length });

// const widget = source.addLineWidget(source.lastLine(), $('#config'));
