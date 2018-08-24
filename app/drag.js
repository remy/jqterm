const events = require('../public/events');
const holder = document.documentElement;

// override codemirror's functionality
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

    events.emit('open-files', files);
  },
  true
);
