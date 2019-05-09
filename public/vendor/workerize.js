(() => {
  const worker = new Worker('/vendor/jq/jq.worker.js');

  let counter = 0;
  const callbacks = {};
  const RPC = 'RPC';

  window.jq = async (...params) => {
    let id = `rpc${++counter}`;
    return new Promise((resolve, reject) => {
      callbacks[id] = [
        res => {
          if (res.stdout) {
            return resolve(res.stdout);
          }

          resolve(res.stderr);
        },
        reject,
      ];
      worker.postMessage({ type: RPC, id, method: 'jq', params });
    });
  };

  worker.addEventListener('message', ({ data }) => {
    let id = data.id;
    if (data.type === 'INIT') jq.onInitialized();
    if (data.type !== 'RPC' || id == null) return;

    let callback = callbacks[id];
    if (callback == null) throw Error(`Unknown callback ${id}`);
    delete callbacks[id];
    if (data.error) callback[1](Error(data.error));
    else callback[0](data.result);
  });
})();
