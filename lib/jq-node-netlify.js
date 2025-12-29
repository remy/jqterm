const fs = require('fs');
const path = require('path');
const vm = require('vm');

let Module;
let isInitialized = false;
let initPromise = null;

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

function initializeModule() {
  if (isInitialized) {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve) => {
    const wasmPath = path.join(__dirname, '../public/vendor/jq/jq.wasm');
    const jqJsPath = path.join(__dirname, '../public/vendor/jq/jq.js');

    Module = {
      // Don't run main on page load
      noInitialRun: true,
      // Print functions
      print: (stdout) => STDOUT.push(stdout),
      printErr: (stderr) => STDERR.push(stderr),
      wasmBinary: fs.readFileSync(wasmPath),
      // When the module is ready
      onRuntimeInitialized: function () {
        isInitialized = true;
        resolve();
      },
    };

    include(jqJsPath);
  });

  return initPromise;
}

// Utility function to run jq
async function jq(jsonStr, query, options) {
  // Ensure module is initialized
  await initializeModule();

  // Custom jq options.
  // Default = -M = disable colors
  var mainOptions = ['-M'];
  if (options != null && options.length > 0)
    mainOptions = mainOptions.concat(options);

  // Use WASM virtual filesystem (in-memory)
  Module.FS.writeFile(FILE_DATA, jsonStr);

  // Clear previous stdout/stderr before launching jq
  STDOUT = [];
  STDERR = [];

  // Launch jq's main() function
  mainOptions = mainOptions.concat([query, FILE_DATA]);
  console.log(mainOptions, FILE_DATA, jsonStr.substring(0, 50), query);
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

exports.jq = jq;
