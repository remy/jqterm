const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const app = express();
const request = require('request');
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
  const id = req.params.id;
  const path = `${getFilename(id)}.json`;
  fs.stat(path, error => {
    console.log(`https://api.github.com/gists/${id}`);
    if (error) {
      // try from gist
      request(
        `https://api.github.com/gists/${id}`,
        {
          json: true,
          headers: { 'user-agent': 'x-jace' },
        },
        (error, response, body) => {
          console.log(error, response.statusCode, body);
          if (error || response.statusCode !== 200) {
            return res.json({ error: `no such record: "${req.params.id}"` });
          }

          res.json(body);
        }
      );
      return;
    }

    res.sendFile(path, {
      headers: { 'content-type': 'application/json' },
    });
  });
});

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
  const query = req.body.toString();
  jq
    .run(query, path, {})
    .then(result => res.json(result))
    .catch(e => {
      if (e.message.includes('Could not open file')) {
        return res.status(404).json({ error: e.message });
      }
      res.status(500).json({ error: e.message });
    });
});

app.use('/', express.static('public'));

// listen for requests :)
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
