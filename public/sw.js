// we'll version our cache (and learn how to delete caches in
// some other post)
const cacheName = 'v2';

self.addEventListener('install', e => {
  // once the SW is installed, go ahead and fetch the resources
  // to make this work offline
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache
        .addAll([
          '/',
          '/vendor/codemirror/5.43.0/codemirror.min.js',
          '/vendor/codemirror/5.43.0/mode/javascript/javascript.min.js',
          '/vendor/codemirror/5.43.0/addon/edit/closebrackets.min.js',
          '/vendor/codemirror/5.43.0/addon/scroll/scrollpastend.min.js',
          '/vendor/codemirror/5.43.0/addon/mode/simple.min.js',
          '/vendor/codemirror/5.43.0/addon/fold/foldcode.min.js',
          '/vendor/codemirror/5.43.0/addon/fold/foldgutter.min.js',
          '/vendor/codemirror/5.43.0/addon/fold/brace-fold.min.js',
          '/vendor/codemirror/5.43.0/addon/display/placeholder.min.js',
          '/hyperlink.js',
          '/events.js',
          '/jq.js',
          '/autocomplete.js',
          '/vendor/jq/jq.wasm.wasm',
          '/vendor/jq/jq.wasm.js',
          '/config.js',
          '/client.js',
          '/favicon-32x32.png',
          '/favicon-16x16.png',
          '/vendor/codemirror/5.43.0/codemirror.css',
          '/vendor/codemirror/5.43.0/addon/fold/foldgutter.css',
          '/style.css',
          '/theme.css',
        ])
        .then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(
          names
            .filter(name => name !== cacheName)
            .map(cache => caches.delete(cache))
        )
      )
  );
});

// when the browser fetches a url, either response with
// the cached object or go ahead and fetch the actual url
self.addEventListener('fetch', event => {
  var res = event.request;
  var url = new URL(res.url);
  event.respondWith(
    // ensure we check the *right* cache to match against
    caches.open(cacheName).then(cache => {
      return cache.match(res).then(res => {
        if (res) {
          return res;
        }

        if (url.origin === location.origin) {
          console.log('returing SPA');

          // strip the query string
          url.search = '';
          url.pathname = '/';
          res = url;
          return cache.match(res);
        }

        return fetch(event.request);
      });
    })
  );
});
