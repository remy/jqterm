// via http://www.levelupwasm.com/sample-jq.pdf
var STDOUT = [],
  STDERR = [],
  FILE_DATA = '/tmp/data.json';

var Module = {
  // Don't run main on page load
  noInitialRun: true,
  // Print functions
  print: stdout => STDOUT.push(stdout),
  printErr: stderr => STDERR.push(stderr),
  // When the module is ready
  onRuntimeInitialized: function() {
    console.log('ready');
  },
};

self.importScripts('/vendor/jq/jq.js');

// Utility function to run jq
function jq(jsonStr, query, options) {
  // Custom jq options.
  // Default = -M = disable colors
  var mainOptions = ['-M'];
  if (options != null && options.length > 0)
    mainOptions = mainOptions.concat(options);
  // Create file from object
  FS.writeFile(FILE_DATA, jsonStr);

  // Clear previous stdout/stderr before launching jq
  STDOUT = [];
  STDERR = [];
  // Launch jq's main() function
  mainOptions = mainOptions.concat([query, FILE_DATA]);
  Module.callMain(mainOptions);
  // Re-open stdout/stderr after jq closes them
  FS.streams[1] = FS.open('/dev/stdout', 'w');
  FS.streams[2] = FS.open('/dev/stderr', 'w');

  return {
    stdout: STDOUT.join('\n'),
    stderr: STDERR[0] + '\n' + STDERR[1],
  };
}

self.addEventListener('message', ({ data }) => {
  const id = data.id;
  if (data.type !== 'RPC' || id == null) return;

  Promise.resolve()
    .then(() => jq.apply(null, data.params))
    .then(result => {
      self.postMessage({ type: 'RPC', id, result });
    })
    .catch(err => {
      self.postMessage({ type: 'RPC', id, error: '' + err });
    });
});

self.postMessage({ type: 'INIT' });
