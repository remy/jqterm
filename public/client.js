/* global CodeMirror, jq, events */
const $ = s => document.querySelector(s);
const isApp = typeof process !== 'undefined';

window.titlePrefix = 'jqTerm';

let API;
let VERSION;

if (!this.process) {
  API = process.env.API;
  VERSION = process.env.VERSION;
} else {
  VERSION = 'local';
  API = 'http://localhost:3100';
}

const root = document.documentElement;

const config = {
  raw: false,
  rawInput: false,
  slurp: false,
};

let id = '';

const setTitle = config => {
  let title = null;
  if (window.last.error) {
    title = `error`;
  }

  if (!title) {
    try {
      const res = JSON.parse(window.last);
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
      // window.last = res;
    } catch (e) {
      console.log(e);
      title = 'non JSON';
    }
  }

  let opts = [];
  if (config.slurp) {
    opts.push('s');
  }
  if (config.rawInput) {
    opts.push('R');
  }
  if (config.raw) {
    opts.push('r');
  }

  document.title = `${window.titlePrefix}${
    opts.length ? ' -' + opts.join('') : ''
  } — ${title}`;
};

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

  let url = `/${id}?query=${query}`;

  if (config.slurp) {
    url += '&slurp=true';
  }

  if (config.rawInput) {
    url += '&raw-input=true';
  }

  if (config.raw) {
    url += '&raw=true';
  }

  return url;
}

function readHash() {
  const url = new URL(window.location);
  const query = url.searchParams.get('query') || '.';
  id = url.pathname.substr(1);
  input.setValue(query);

  if (url.searchParams.get('raw') === 'true') {
    config.raw = true;
    $('#raw').checked = true;
    result.setOption('mode', config.raw ? 'text/plain' : 'application/ld+json');
  }

  if (url.searchParams.get('slurp') === 'true') {
    config.slurp = true;
    $('#slurp').checked = true;
  }

  if (url.searchParams.get('raw-input') === 'true') {
    config.rawInput = true;
    $('#raw-input').checked = true;
  }
}

CodeMirror.defineSimpleMode('jq', jq.jqMode);

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

const resultError = () => {
  result.setOption('mode', 'plain/text');
  result.setOption('lineWrapping', true);
};

const resultReset = () => {
  result.setOption('mode', 'application/ld+json');
  result.setOption('lineWrapping', false);
};

const input = CodeMirror.fromTextArea($('#input textarea'), {
  mode: 'jq',
  autoCloseBrackets: true,
  autocomplete: true,
  keywords: jq.keywords,
  autofocus: true,
  lineWrapping: true,
});

const mirrors = {
  input,
  result,
  source,
};

!isApp &&
  root.addEventListener(
    'keydown',
    event => {
      if (id && event.keyCode === 83 && (event.metaKey || event.ctrlKey)) {
        // save
        const blob = new Blob([result.getValue() || ''], {
          type: 'application/json',
        });
        const anchor = document.createElement('a');
        anchor.download = `${id}.json`;
        anchor.href = URL.createObjectURL(blob);
        anchor.click();
        event.preventDefault();
        return;
      }

      if (
        event.shiftKey &&
        (event.metaKey || event.ctrlKey) &&
        event.keyCode == 84
      ) {
        events.emit('set/source-hide', {
          value: !root.classList.contains('hidden-source'),
        });
        event.preventDefault();
      }

      if (
        event.shiftKey &&
        (event.metaKey || event.ctrlKey) &&
        event.keyCode == 191
      ) {
        // show help
        root.classList.add('help');
        event.preventDefault();
        $('#help').addEventListener('click', () => root.classList.remove('help'))
      }

      if (event.keyCode === 27) {
        root.classList.remove('help');
      }
    },
    true
  );

const inputChange = (cm, event) => {
  if (event.origin !== 'setValue') {
    exec(cm.getValue());
  }
};
input.on('change', isApp ? inputChange : debounce(inputChange, 500));

$('#slurp').onchange = function() {
  config.slurp = !!this.checked;
  exec(input.getValue());
};

$('#raw-input').onchange = function() {
  config.rawInput = !!this.checked;
  exec(input.getValue());
};

$('#raw').onchange = function() {
  config.raw = !!this.checked;
  result.setOption('mode', config.raw ? 'text/plain' : 'application/ld+json');
  exec(input.getValue());
};

source.on('drop', cm => {
  cm.setValue('');
});

const sourceChange = async (cm, event) => {
  jq.sourceChange(cm, input); // update autocomplete keywords

  if (event.origin !== 'setValue') {
    await updateData(cm.getValue());
    await exec(input.getValue());
  }
};

source.on('change', isApp ? sourceChange : debounce(sourceChange, 1000));

const updateData = async (body, skipExec = false) => {
  root.classList.add('loading');
  const res = await fetch(`${API}/${id || ''}?guid=${guid}`, {
    method: 'post',
    body,
  });

  // FIXME deal with 404
  const json = await res.json();
  if (json.id && id !== json.id) {
    id = json.id;
    window.history.pushState(null, id, getHash());
  }
  root.classList.remove('loading');
  if (!skipExec) exec(input.getValue());
};

async function exec(body, reRequest = false) {
  // if (!id) return;
  window.history.replaceState(null, id, getHash());

  const res = await fetch(
    `${API}/${id}?guid=${guid}&slurp=${config.slurp}&raw=${
      config.raw
    }&raw-input=${config.rawInput}&_method=PUT`,
    {
      method: 'put',
      body,
      headers: {
        'content-type': 'text/plain',
      },
    }
  );

  if (res.status !== 200) {
    const json = await res.json();

    if (res.status === 404) {
      result.setValue('Record not found: resubmitting');
      if (!reRequest) {
        // exec(body, true);
      }
      return;
    }
    resultError();
    window.last = json;
    result.setValue(json.error);
    setTitle(config);
    return;
  }

  resultReset();

  const json = await res.json();
  let output = json;
  window.last = json;
  setTitle(config);
  if (config.raw) {
    try {
      output = json
        .split('\n')
        .map(_ => _.replace(/^"(.*)"$/, '$1'))
        .join('\n');
    } catch (error) {
      console.log(error);
      output = json;
    }
  }

  result.setValue(output);
}

if (window.location.hash.indexOf('#!/') === 0) {
  window.history.replaceState(null, id, window.location.hash.slice(2));
}

if (!isApp && window.location.pathname !== '/') {
  readHash();
  fetch(`${API}/${id}.json`)
    .then(res => res.json())
    .then(json => {
      if (json.id !== id) {
        id = json.id;
        window.history.replaceState(null, id, getHash());
      }
      try {
        source.setValue(JSON.stringify(JSON.parse(json.payload), '', 2));
      } catch (e) {
        console.log(e);
        source.setValue(json.payload);
      }
      exec(input.getValue());
    });
} else {
  input.setValue('.');
  source.setValue(
    window.last ||
      JSON.stringify(
        {
          version: VERSION,
          help: 'ctrl + shift + ?',
          source: 'https://github.com/remy/jace',
          credit: 'Remy Sharp / @rem',
          tip: ['Drag and drop .json files', 'in this panel to start querying'],
        },
        '',
        2
      )
  );
  exec(input.getValue());
}

input.setCursor({ line: 0, ch: input.getValue().length });

// setup event handling
events.on('set/config', data => {
  Object.keys(config).forEach(key => {
    if (data.hasOwnProperty(key)) {
      config[key] = data[key];
    }
  });
});

events.on('set/focus', ({ panel }) => mirrors[panel].focus());

events.on('set/theme', ({ value }) => {
  if (root.classList.contains('theme-dark')) {
    root.classList.remove('theme-dark');
  } else {
    root.classList.remove('theme-light');
  }
  root.classList.add(`theme-${value}`);
});

events.on('set/input', ({ value }) => input.setValue(value));
events.on('set/source', ({ value }) => {
  source.setValue(value);
  jq.sourceChange(source, input);
  return updateData(value, true);
});

events.on('set/source-hide', ({ value }) => {
  if (value) {
    root.classList.add('hidden-source');
  } else {
    root.classList.remove('hidden-source');
  }
  result.refresh();
});

events.on('run/exec', () => exec(input.getValue()));
events.on('get/source', ({ panel }) => mirrors[panel].getValue());
events.on('set/busy', ({ value }) => {
  if (value) {
    root.classList.add('busy');
  } else {
    root.classList.remove('busy');
  }
});
