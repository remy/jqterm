const { ipcRenderer, shell } = require('electron');
const docReady = require('doc-ready');
const $ = s => document.querySelector(s);

let id = null;

const promptError = e => {
  if (e instanceof Error) {
    e = e.message;
  }
  ipcRenderer.sendSync('about-error:' + id, e);
};

docReady(() => {
  id = document.location.hash.replace('#', '');
  let options = null;

  try {
    options = JSON.parse(ipcRenderer.sendSync('about-get-options:' + id));
  } catch (e) {
    return promptError(e);
  }

  console.log(options);

  const bugLink = $('#bug a');

  bugLink.addEventListener('click', e => {
    e.preventDefault();
    shell.openExternal(bugLink.href);
  });

  $('h1').innerHTML = options.title;
  $('h2').innerHTML = options.version;

  $('#img').src = options.icon;
});
