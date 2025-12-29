const LRU = require('lru-cache');
const fs = require('fs');
const { jq } = require('./jq-node-netlify');

const { promisify } = require('util');
const VERSION = require('../package.json').version;
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const tmpdir = require('os').tmpdir();

const options = {
  max: 500,
  maxAge: 1000 * 60 * 60,
};
const cache = new LRU(options);

const makeGistBody = ({ body, guid }) => ({
  description: guid,
  public: false,
  files: {
    'jace.json': {
      content: body.toString(),
    },
  },
});

const run = ({ query, input, options = {}, id }) => {
  const args = [];
  if (options.slurp) args.push('-s');
  if (options.rawInput) args.push('-R');
  if (options.nullInput) args.push('-n');

  return new Promise((resolve, reject) => {
    try {
      const result = jq(input, query, args);
      return resolve(result);
    } catch (e) {
      if (e.message.includes('Could not open file')) {
        return resolve({ status: 404, result: { error: e.message } });
      }

      console.log(e, input, options);

      const error = e.message.replace(/^.*:\d+\):\s/, '').trim();
      return resolve({ status: 500, result: { error: e.message } });
    }
  });
};

const writeToFile = ({ id, files, description }) => {
  const filename = Object.keys(files).find((_) => _.endsWith('.json'));

  if (!files[filename]) {
    console.log('fail - no files found', files);
    const e = new Error('could not create back end data');
    e.code = 500;
    throw e;
  }

  let payload = files[filename].content;

  // Write to /tmp for serverless environment
  const filepath = `${tmpdir}/${id}.json`;
  writeFile(filepath, payload, 'utf8').catch((error) => {
    if (error) console.log(error);
  });

  // body.description is the user guid
  cache.set(id, description);

  return { id, payload };
};

const getFilename = (id) => `${tmpdir}/${id}`;

module.exports = {
  makeGistBody,
  writeToFile,
  getFilename,
  cache,
  VERSION,
  readFile,
  run,
};
