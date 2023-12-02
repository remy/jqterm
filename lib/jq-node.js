const fs = require('fs');
const vm = require('vm'); // vm must be in the global context to work properly
const tmpdir = require('os').tmpdir();

function include(filename) {
  var code = fs.readFileSync(filename, 'utf-8');
  vm.runInThisContext(
    `(({ require, process, Module, __dirname }) => { ${code} })`,
    filename
  )({
    require,
    process: {
      exit(status) {
        // console.log('exit', status);
      },
      platform: process.platform,
      binding: process.binding,
      on(event) {
        // console.log('on', event);
      },
      argv: [],
    },
    Module,
    __dirname,
  });
}

// via http://www.levelupwasm.com/sample-jq.pdf
let STDOUT = [];
let STDERR = [];
let FILE_DATA = '/tmp/data.json';

var Module = {
  // Don't run main on page load
  noInitialRun: true,
  // noExitRuntime: true,
  // Print functions
  print: (stdout) => STDOUT.push(stdout),
  printErr: (stderr) => STDERR.push(stderr),
  wasmBinary: fs.readFileSync('./public/vendor/jq/jq.wasm'),
  // When the module is ready
  onRuntimeInitialized: function () {
    // console.log('ready');
  },
};

// Utility function to run jq
function jq(jsonStr, query, options) {
  // Custom jq options.

  // Default = -M = disable colors
  var mainOptions = ['-M'];
  if (options != null && options.length > 0)
    mainOptions = mainOptions.concat(options);

  Module.FS.writeFile(FILE_DATA, jsonStr);

  // Clear previous stdout/stderr before launching jq
  STDOUT = [];
  STDERR = [];

  // Launch jq's main() function
  mainOptions = mainOptions.concat([query, FILE_DATA]);
  console.log(mainOptions, FILE_DATA, jsonStr, query);
  Module.callMain(mainOptions);

  const res = {
    stdout: STDOUT.join('\n'),
    stderr: STDERR.join('\n'),
  };

  if (res.stderr.length > 0) {
    return { status: 400, result: { error: res.stderr } };
  }

  let result = res.stdout;

  return {
    status: 200,
    result,
  };
}

include('./public/vendor/jq/jq.js');

exports.jq = jq;
