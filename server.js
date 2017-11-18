const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const app = express();
const jq = require('node-jq');
const fs = require('fs');
const cors = require('cors');
const tmpdir = require('os').tmpdir();

app.use(cors());
app.use(bodyParser.raw({ type: '*/*', limit: '50mb' }));

function getFilename(id) {
  if (id === 'example') {
    return `${__dirname}/package`;
  }
  return `${tmpdir}/${id}`;
}

app.get('/:id.json', (req, res) => {
  const path = `${getFilename(req.params.id)}.json`;
  res.sendFile(path, {
    headers: { 'content-type': 'application/json' },
  });
});

app.get(['/:id', '/'], (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.use('/static', express.static('public'));

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post(['/', '/:id'], (req, res) => {
  const id = req.params.id || uuid.v4();
  fs.writeFile(`${tmpdir}/${id}.json`, req.body, 'utf8', error => {
    if (error) console.log(error);
  });
  res.json({ id });
});

app.put('/:id', (req, res) => {
  const path = `${getFilename(req.params.id)}.json`;
  const query = req.query.query;
  jq
    .run(query, path, {})
    .then(result => res.json(result))
    .catch(e => res.status(500).json({ error: e.message }));
});

// listen for requests :)
var listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
