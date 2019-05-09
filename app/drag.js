const { ipcRenderer } = require('electron');
const holder = document.documentElement;

// override CodeMirror's functionality
holder.addEventListener('dragover', () => false, true);
holder.addEventListener('dragleave', () => false, true);
holder.addEventListener('dragend', () => false, true);

holder.addEventListener(
  'drop',
  e => {
    e.preventDefault();

    const files = [];
    for (let f of e.dataTransfer.files) {
      files.push(f.path);
    }

    ipcRenderer.send('open-file', files);
  },
  true
);
