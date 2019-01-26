const fs = require('fs');
const { stringified } = require('@remy/envy')();

const source = __dirname + '/lib/config-template.js';
const result = __dirname + '/public/config.js';
let string = fs.readFileSync(source, 'utf8');

const peKey = 'process.env';
Object.keys(stringified[peKey]).forEach(key => {
  if (string.includes(`${peKey}.${key}`)) {
    string = string.replace(
      new RegExp(`${peKey}.${key}`, 'g'),
      stringified[peKey][key]
    );
  }
});

fs.writeFileSync(result, string);
