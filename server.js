const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const methodOverride = require('method-override');
const {
  makeGistBody,
  run,
  getFilename,
  cache,
  VERSION,
  readFile,
  writeToFile,
} = require('./lib/');

require('@remy/envy');

const config = `const VERSION="${VERSION}"; const API="${process.env.API}"`;

const request = require('request-promise-native').defaults({
  baseUrl: 'https://api.github.com/gists',
  json: true,
  resolveWithFullResponse: true,
  headers: {
    'user-agent': 'x-jace',
  },
  auth: {
    user: process.env.USER,
    pass: process.env.TOKEN,
  },
});

// override with POST having ?_method=DELETE to attempt to avoid OPTIONS
app.use(methodOverride('_method'));
app.use(cors());
app.use(bodyParser.text({ type: '*/*', limit: '50mb' }));
app.set('json spaces', 2);

app.get('/:id.json', async (req, res, next) => {
  const { id } = req.params;
  const path = `${getFilename(id)}.json`;

  try {
    const payload = await readFile(path, 'utf8');

    try {
      res.json({
        id,
        payload: payload || {},
      });
    } catch (e) {
      next(e);
    }
  } catch (error) {
    // try from gist
    request(`/${id}`)
      .then(syncToFile(req, res))
      .catch(next);
    return;
  }
});

const syncToFile = (req, res) => ({ body, statusCode }) => {
  if (statusCode > 201) {
    console.log('fail', error, statusCode);
    const e = new Error('could not create back end data');
    e.code = statusCode;
    throw e;
  }

  res.json(writeToFile(body));
};

app.post('/', (req, res, next) => {
  // create gist needs to be on /gists - not gists/
  request('', {
    method: 'post',
    body: makeGistBody({ body: req.body, guid: req.query.guid }),
  })
    .then(syncToFile(req, res))
    .catch(next);
});

// POST = update gist, or create if no ownership
app.post('/:id', (req, res, next) => {
  const { id } = req.params;

  let url = `/${id}`;
  let method = 'patch';
  const owner = cache.get(id);

  if (owner !== req.query.guid) {
    // create a new gist, don't patch
    url = '';
    method = 'post';
  }

  request(url, {
    method,
    body: makeGistBody({ body: req.body, guid: req.query.guid }),
  })
    .then(syncToFile(req, res))
    .catch(next);
});

// PUT is running the jq query
app.put('/:id?', async (req, res) => {
  const { id } = req.params;
  const path = `${getFilename(id)}.json`;
  const query = req.body.toString();

  let input = path;

  const options = {
    slurp: req.query.slurp === 'true',
    output: 'pretty',
  };

  // emulate --raw-input
  if (req.query['raw-input'] === 'true') {
    options.input = 'string';
    input = await readFile(path, 'utf-8');

    if (options.slurp) {
      // input = input;
      options.input = 'json';
    } else {
      // correct as per command lines
      input = input.split('\n').map(_ => `"${_}"`);
    }
  }

  if (!id) {
    input = {
      version: VERSION,
      help: 'ctrl + shift + ?',
      macApp: 'https://gum.co/jqterm',
      credit: 'Remy Sharp / @rem',
      tip: ['Drag and drop .json files', 'in this panel to start querying'],
    };
    options.input = 'json';
  }

  run({ query, input, options }).then(({ status, result }) => {
    res.status(status).json(result);
  });
});

app.use('/config.js', (req, res) => {
  res.writeHeader(200, { 'content-type': 'application/javascript' });
  res.end(config);
});

app.use('/', express.static('public'));

app.get('/*', (req, res) => res.sendFile(__dirname + '/public/index.html'));

app.use(require('./error'));

// listen for requests :)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('running', port);
  process.env = {};
});
