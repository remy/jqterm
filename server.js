const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const jq = require('node-jq');
const fs = require('fs');
const { promisify } = require('util');
const cors = require('cors');
const tmpdir = require('os').tmpdir();
const methodOverride = require('method-override');
const LRU = require('lru-cache');
const readFile = promisify(fs.readFile);
const options = {
  max: 500,
  maxAge: 1000 * 60 * 60,
};
const cache = LRU(options);

require('@remy/envy');

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
app.use(bodyParser.raw({ type: '*/*', limit: '50mb' }));
app.set('json spaces', 2);

function getFilename(id) {
  if (id === 'example') {
    return `${__dirname}/package`;
  }
  return `${tmpdir}/${id}`;
}

app.get('/:id.json', (req, res, next) => {
  const { id } = req.params;
  const path = `${getFilename(id)}.json`;

  fs.readFile(path, 'utf8', (error, payload) => {
    if (error) {
      // try from gist
      request(`/${id}`)
        .then(syncToFile(req, res))
        .catch(next);
      return;
    }

    try {
      res.json({
        id,
        payload: JSON.parse(payload || '{}'),
      });
    } catch (e) {
      next(e);
    }
  });
});

const syncToFile = (req, res) => ({ body, statusCode }) => {
  if (statusCode > 201) {
    console.log('fail', error, statusCode);
    const e = new Error('could not create back end data');
    e.code = statusCode;
    throw e;
  }

  const id = body.id;
  const filename = Object.keys(body.files).find(_ => _.endsWith('.json'));
  const payload = body.files[filename].content;

  // async and ignore
  fs.writeFile(`${tmpdir}/${id}.json`, payload, 'utf8', error => {
    if (error) console.log(error);
  });

  cache.set(id, body.description);

  res.json({ id, payload: JSON.parse(payload) });
};

const makeGistBody = req => ({
  description: req.query.guid,
  public: false,
  files: {
    'jace.json': {
      content: req.body.toString(),
    },
  },
});

app.post('/', (req, res, next) => {
  // create gist needs to be on /gists - not gists/
  request('', {
    method: 'post',
    body: makeGistBody(req),
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
    body: makeGistBody(req),
  })
    .then(syncToFile(req, res))
    .catch(next);
});

// PUT is running the jq query
app.put('/:id', (req, res) => {
  const { id } = req.params;
  const path = `${getFilename(id)}.json`;
  const query = req.body.toString();
  //console.log('QUERY: %s [%s] > %s', id, path, query);
  jq
    .run(query, path, {})
    .then(result => res.json(result))
    .catch(e => {
      if (e.message.includes('Could not open file')) {
        return res.status(404).json({ error: e.message });
      }
      res
        .status(500)
        .json({ error: e.message.replace(/^.*:\d+\):\s/, '').trim() });
    });
});

app.use('/', express.static('public'));

app.use(require('./error'));

// listen for requests :)
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
  process.env = {};
});
