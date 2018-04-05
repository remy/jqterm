/* global CodeMirror */
const $ = s => document.querySelector(s);
if (!this.process) {
  this.process = { env: { VERSION: 'local', API: 'http://localhost:3100' } };
}
const API = process.env.API;
const VERSION = process.env.VERSION;

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
  'add',
  'all',
  'any',
  'arrays',
  'ascii_downcase',
  'ascii_upcase',
  'booleans',
  'bsearch',
  'builtins',
  'capture',
  'combinations',
  'contains',
  'debug',
  'del',
  'delpaths',
  'empty',
  'endswith',
  'env',
  'error',
  'explode',
  'finites',
  'first',
  'flatten',
  'floor',
  'foreach',
  'from_entries',
  'fromstream',
  'getpath',
  'group_by',
  'gsub',
  'halt_error',
  'halt',
  'has',
  'if',
  'then',
  'else',
  'elif',
  'end',
  'implode',
  'in',
  'index',
  'indices',
  'infinite',
  'input_filename',
  'input_line_number',
  'input',
  'inputs',
  'inside',
  'isfinite',
  'isinfinite',
  'isnan',
  'isnormal',
  'iterables',
  'join',
  'keys_unsorted',
  'keys',
  'last',
  'leaf_paths',
  'length',
  'limit',
  'ltrimstr',
  'map_values',
  'map',
  'match',
  'max_by',
  'max',
  'min_by',
  'min',
  'modulemeta',
  'nan',
  'normals',
  'nth',
  'nulls',
  'numbers',
  'objects',
  'path',
  'paths',
  'range',
  'recurse_down',
  'recurse',
  'reverse',
  'rindex',
  'rtrimstr',
  'scalars',
  'sort',
  'sort_by',
  'scan',
  'select',
  'setpath',
  'split',
  'splits',
  'sqrt',
  'startswith',
  'stderr',
  'strings',
  'sub',
  'test',
  'to_entries',
  'tonumber',
  'tostream',
  'tostring',
  'transpose',
  'truncate_stream',
  'type',
  'unique_by',
  'unique',
  'until',
  'utf8bytelength',
  'values',
  'walk',
  'while',
  'with_entries',
];

const jqMode = {
  // The start state contains the rules that are intially used
  start: [
    // The regex matches the token, the token property contains the type
    { regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: 'string' },
    // You can match multiple tokens at once. Note that the captured
    // groups must span the whole string in this case
    {
      regex: /(def)(\s+)([a-z$][\w$]*)/,
      token: ['keyword', null, 'variable-2'],
    },
    // Rules are matched in the order in which they appear, so there is
    // no ambiguity between this one and the one above
    {
      regex: new RegExp(
        `[^_](?:${keywords
          .concat('def', 'if', 'elif', 'else', 'end', 'then', 'as')
          .join('|')})\\b`
      ),
      token: 'keyword',
    },
    { regex: /true|false|null/, token: 'atom' },
    {
      regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i,
      token: 'number',
    },
    { regex: /#.*/, token: 'comment' },
    { regex: /\/(?:[^\\]|\\.)*?\//, token: 'variable-3' },
    // A next property will cause the mode to move to a different state
    // { regex: /\/\*/, token: 'comment', next: 'comment' },
    { regex: /[-+\/*=<>!\[\]\|]+/, token: 'operator' },
    // indent and dedent properties guide autoindentation
    { regex: /[\{\[\(]/, indent: true },
    { regex: /[\}\]\)]/, dedent: true },
    { regex: /\$[a-z$][\w$]*/, token: 'variable' },
  ],
  // The meta property contains global information about the mode. It
  // can contain properties like lineComment, which are supported by
  // all modes, and also directives like dontIndentStates, which are
  // specific to simple modes.
  meta: {
    dontIndentStates: ['comment'],
    lineComment: '#',
  },
};

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
  const query = encodeURIComponent(input.getValue()).replace(
    /[()]/g,
    c => ({ '(': '%28', ')': '%29' }[c])
  );
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
  autoCloseBrackets: true,
  foldGutter: true,
  foldOptions: { widget: '\u00AB\u00BB' },
  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
});

const result = CodeMirror.fromTextArea($('#result textarea'), {
  lineNumbers: true,
  mode: 'application/ld+json',
  scrollPastEnd: true,
  readOnly: true,
  foldGutter: true,
  foldOptions: { widget: '\u00AB\u00BB' },
  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
});

CodeMirror.defineSimpleMode('jq', jqMode);

const input = CodeMirror.fromTextArea($('#input textarea'), {
  mode: 'jq',
  autoCloseBrackets: true,
  autocomplete: true,
  keywords,
  autofocus: true,
  lineWrapping: true,
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
} else {
  source.setValue(JSON.stringify({ version: VERSION }, '', 2));
}

input.setCursor({ line: 0, ch: input.getValue().length });

// const widget = source.addLineWidget(source.lastLine(), $('#config'));
