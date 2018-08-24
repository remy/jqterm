const yaml = require('js-yaml');
const fs = require('fs');

// Get document, or throw exception on error
try {
  var doc = yaml.safeLoad(fs.readFileSync('./manual.yml', 'utf8'));
  console.log(JSON.stringify(doc));
} catch (e) {
  console.log(e);
}
