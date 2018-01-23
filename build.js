const fs = require('fs');
const { stringified } = require('@remy/envy')();

const filename = __dirname + '/public/client.js';
let string = fs.readFileSync(filename, 'utf8');

const peKey = 'process.env';
Object.keys(stringified[peKey]).forEach(key => {
  if (string.includes(`${peKey}.${key}`)) {
    string = string.replace(
      new RegExp(`${peKey}.${key}`, 'g'),
      stringified[peKey][key]
    );
  }
});

fs.writeFileSync(filename, string);
