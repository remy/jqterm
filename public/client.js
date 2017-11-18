/* global CodeMirror, $ */
let source = null;
let result = null;
let dirty = false;

$('.cm-target').each(function(i) {
  const res = CodeMirror.fromTextArea(this, {
    lineNumbers: true,
    mode: 'application/ld+json',
    readOnly: i === 1,
  });
  if (this.parentNode.id === 'source') source = res;
  else result = res;
});

const query = CodeMirror.fromTextArea($('#input textarea')[0], {
  mode: 'text',
  autofocus: true,
});

query.on('change', cm => {
  exec(cm.getValue());
});

source.on('change', cm => {
  updateData(cm.getValue());
  dirty = true;
});

async function updateData(source) {
  const res = await fetch(window.location.pathname, {
    method: 'post',
    body: JSON.stringify({ source }),
  });
  const json = await res.json();
  if (json.id) {
    window.history.replaceState(null, json.id, `/${json.id}`);
  }
  dirty = false;
}

async function exec(query) {
  if (dirty) await updateData(source.getValue());
  const params = new URLSearchParams();
  params.append('query', query);
  const res = await fetch(`${window.location.pathname}?${params.toString()}`, {
    method: 'put',
  });
  if (res.status !== 200) {
    const json = await res.json();
    result.setValue(json.error);
    return;
  }
  const json = await res.json();
  result.setValue(json);
}

if (window.location.pathname !== '/') {
  fetch(`${window.location.pathname}.json`)
    .then(res => res.text())
    .then(res => {
      source.setValue(res);
      exec(query.getValue());
    });
}
