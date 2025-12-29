const {
  makeGistBody,
  run,
  getFilename,
  cache,
  VERSION,
  readFile,
  writeToFile,
} = require('../../lib/index-netlify');

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

const syncToFile = ({ body, statusCode }) => {
  if (statusCode > 201) {
    console.log('fail', statusCode);
    const e = new Error('could not create back end data');
    e.code = statusCode;
    throw e;
  }

  return writeToFile(body);
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/api', '');
    let method = event.httpMethod;
    const queryParams = event.queryStringParameters || {};
    
    // Handle method override for PUT requests sent as POST
    if (method === 'POST' && queryParams._method === 'PUT') {
      method = 'PUT';
    }

    // Route: GET /:id.json
    if (method === 'GET' && path.match(/^\/[^/]+\.json$/)) {
      const id = path.replace('/', '').replace('.json', '');
      const filepath = `${getFilename(id)}.json`;

      try {
        const payload = await readFile(filepath, 'utf8');

        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            payload: payload || {},
          }),
        };
      } catch (error) {
        // Try from gist
        try {
          const response = await request(`/${id}`);
          const result = syncToFile(response);
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
          };
        } catch (e) {
          return {
            statusCode: 404,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Not found' }),
          };
        }
      }
    }

    // Route: POST / (create gist)
    if (method === 'POST' && (path === '/' || path === '')) {
      const response = await request('', {
        method: 'post',
        body: makeGistBody({ body: event.body, guid: queryParams.guid }),
      });

      const result = syncToFile(response);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // Route: POST /:id (update gist) - must check this is not a PUT override
    if (method === 'POST' && path.match(/^\/[^/]+$/)) {
      const id = path.replace('/', '');
      let url = `/${id}`;
      let requestMethod = 'patch';
      const owner = cache.get(id);

      if (owner !== queryParams.guid) {
        url = '';
        requestMethod = 'post';
      }

      const response = await request(url, {
        method: requestMethod,
        body: makeGistBody({ body: event.body, guid: queryParams.guid }),
      });

      const result = syncToFile(response);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // Route: PUT /:id? (run jq query)
    if (method === 'PUT') {
      const id = (path === '/' || path === '') ? null : path.replace('/', '');
      const filepath = id ? `${getFilename(id)}.json` : null;
      const query = event.body.toString();

      let input;

      if (filepath) {
        try {
          input = await readFile(filepath, 'utf-8');
        } catch (e) {
          input = '';
        }
      }

      const options = {
        slurp: queryParams.slurp === 'true',
        output: 'pretty',
        nullInput: queryParams['null-input'] === 'true',
        rawInput: queryParams['raw-input'] === 'true',
      };

      // emulate --raw-input
      if (queryParams['raw-input'] === 'true') {
        options.input = 'string';

        if (options.slurp) {
          options.input = 'json';
        }
      }

      if (!id) {
        input = {
          version: VERSION,
          jqVersion: '1.6',
          help: 'ctrl + shift + ?',
          macApp: 'https://gum.co/jqterm',
          credit: 'Remy Sharp / @rem',
          tip: ['Drag and drop .json files', 'in this panel to start querying'],
        };
        options.input = 'json';
      }

      const { status, result } = await run({ query, input, options, id });
      return {
        statusCode: status,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // Route: GET /config.js
    if (method === 'GET' && path === '/config.js') {
      const config = `const VERSION="${VERSION}"; const API="${process.env.API || ''}"`;
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/javascript' },
        body: config,
      };
    }

    return {
      statusCode: 404,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
