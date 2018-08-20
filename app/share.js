const { shell } = require('electron');
const request = require('request');
const handler = require('./handler');
const { machineIdSync } = require('node-machine-id');

const guid = machineIdSync();

function share(config) {
  handler.toggleBusy(true);
  return new Promise(resolve => {
    handler.getSource({
      panel: 'source',
      callback: body => {
        request(
          {
            url: 'https://jqterm.now.sh',
            headers: {
              'content-type': 'text/plain',
            },
            method: 'post',
            query: {
              guid,
            },
            body,
          },
          (err, res, text) => {
            const body = JSON.parse(text);
            console.log(err, body);
            if (body.id) {
              const id = body.id;
              handler.getSource({
                panel: 'input',
                callback: input => {
                  const query = encodeURIComponent(input).replace(
                    /[()]/g,
                    c => ({ '(': '%28', ')': '%29' }[c])
                  );

                  let url = `https://jqterm.com/${id}?query=${query}`;

                  if (config.slurp) {
                    url += '&slurp=true';
                  }

                  if (config.rawInput) {
                    url += '&raw-input=true';
                  }

                  if (config.raw) {
                    url += '&raw=true';
                  }

                  shell.openExternal(url);
                  resolve();
                },
              });

              return;
            }
            resolve();
          }
        );
      },
    });
  }).then(() => {
    handler.toggleBusy(false);
  });
}

module.exports = share;
