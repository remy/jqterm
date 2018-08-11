const LRU = require('lru-cache');
const fs = require('fs');
const jq = require('node-jq');
const { promisify } = require('util');
const VERSION = require('../package.json').version;
const readFile = promisify(fs.readFile);
const tmpdir = require('os').tmpdir();

const options = {
  max: 500,
  maxAge: 1000 * 60 * 60,
};
const cache = LRU(options);

const makeGistBody = ({ body, guid }) => ({
  description: guid,
  public: false,
  files: {
    'jace.json': {
      content: body.toString(),
    },
  },
});

const run = ({ query, input, options }) => {
  return jq
    .run(query, input, options)
    .then(result => ({
      status: 200,
      result,
    }))
    .catch(e => {
      if (e.message.includes('Could not open file')) {
        return { status: 404, result: { error: e.message } };
      }
      const error = e.message.replace(/^.*:\d+\):\s/, '').trim();
      // console.log('jq fail', error);
      return { status: 500, result: { error } };
    });
};

const writeToFile = ({ id, files, description }) => {
  const filename = Object.keys(files).find(_ => _.endsWith('.json'));

  if (!files[filename]) {
    console.log('fail - no files found', files);
    const e = new Error('could not create back end data');
    e.code = 500;
    throw e;
  }

  let payload = files[filename].content;

  // async and ignore
  fs.writeFile(`${tmpdir}/${id}.json`, payload, 'utf8', error => {
    if (error) console.log(error);
  });

  // body.description is the user guid
  cache.set(id, description);

  return { id, payload };
};

const getFilename = id => `${tmpdir}/${id}`;

module.exports = {
  makeGistBody,
  writeToFile,
  getFilename,
  cache,
  VERSION,
  readFile,
  run,
};
