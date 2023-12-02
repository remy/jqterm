(() => {
  const worker = new Worker('/vendor/jq/jq.worker.js');

  let counter = 0;
  const callbacks = {};
  const RPC = 'RPC';

  window.jq = async (...params) => {
    let id = `rpc${++counter}`;
    return new Promise((resolve, reject) => {
      callbacks[id] = [
        (res) => {
          const err = (res.stderr || '')
            .trim()
            .split('\n')
            .filter((_) => !_.startsWith('exit(0)') && _ != 'undefined');

          if (res.stdout) {
            if (err.length) {
              // yes a string…
              return resolve(err.toString() + '\n' + res.stdout);
            }
            return resolve(res.stdout);
          }

          resolve(res.stderr);
        },
        reject,
      ];
      worker.postMessage({ type: RPC, id, method: 'jq', params });
    });
  };

  jq.onInitialized = () => {
    jqInit = true;
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
