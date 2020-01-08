// reminder: http://www.levelupwasm.com/sample-jq.pdf

self.importScripts('/vendor/jq/jq.js');

self.addEventListener('message', ({ data }) => {
  const id = data.id;
  if (data.type !== 'RPC' || id == null) return;

  Promise.resolve()
    .then(() => jq.raw.apply(null, data.params))
    .then(result => {
      if (result.stderr == '') result.stderr = null;
      self.postMessage({ type: 'RPC', id, result });
    })
    .catch(err => {
      self.postMessage({ type: 'RPC', id, error: '' + err });
    });
});

self.postMessage({ type: 'INIT' });
