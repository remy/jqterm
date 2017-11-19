/* global CodeMirror */
const $ = s => document.querySelector(s);
const API = 'https://jace.glitch.me';

let dirty = false;
let id = null;

function getHash() {
  const query = encodeURIComponent(input.getValue());
  return `/#!/${id}?query=${query}`;
}

function readHash() {
  const url = new URL(
    window.location.origin + window.location.hash.split('#!')[1]
  );
  const query = url.searchParams.get('query');
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
});

const result = CodeMirror.fromTextArea($('#result textarea'), {
  lineNumbers: true,
  mode: 'application/ld+json',
  readOnly: true,
});

const input = CodeMirror.fromTextArea($('#input textarea'), {
  mode: 'text',
  autofocus: true,
});

input.on('change', cm => {
  exec(cm.getValue());
});

source.on('change', cm => {
  updateData(cm.getValue());
  dirty = true;
});

async function updateData(body) {
  const res = await fetch(`${API}/${id || ''}`, {
    method: 'post',
    body,
  });
  const json = await res.json();
  if (json.id) {
    id = json.id;
    window.history.replaceState(null, id, getHash());
  }
  dirty = false;
}

async function exec(body) {
  if (dirty) await updateData(source.getValue());
  window.history.replaceState(null, id, getHash());
  const res = await fetch(`${API}/${id}`, {
    method: 'put',
    body,
  });
  if (res.status !== 200) {
    const json = await res.json();
    result.setValue(json.error);
    return;
  }
  const json = await res.json();
  result.setValue(json);
}

if (window.location.hash.indexOf('#!/') === 0) {
  readHash();
  fetch(`${API}/${id}.json`)
    .then(res => res.text())
    .then(res => {
      source.setValue(res);
      exec(input.getValue());
    });
}
