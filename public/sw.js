/* eslint-env serviceworker */

// we'll version our cache (and learn how to delete caches in
// some other post)
const cacheName = 'v4.6';

self.addEventListener('install', (e) => {
  // once the SW is installed, go ahead and fetch the resources
  // to make this work offline
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache
        .addAll([
          '/',
          '/vendor/codemirror/5.48.2/codemirror.min.js',
          '/vendor/codemirror/5.48.2/mode/javascript/javascript.min.js',
          '/vendor/codemirror/5.48.2/addon/edit/closebrackets.min.js',
          '/vendor/codemirror/5.48.2/addon/scroll/scrollpastend.min.js',
          '/vendor/codemirror/5.48.2/addon/mode/simple.min.js',
          '/vendor/codemirror/5.48.2/addon/fold/foldcode.min.js',
          '/vendor/codemirror/5.48.2/addon/fold/foldgutter.min.js',
          '/vendor/codemirror/5.48.2/addon/fold/brace-fold.min.js',
          '/vendor/codemirror/5.48.2/addon/display/placeholder.min.js',
          '/hyperlink.js',
          '/events.js',
          '/jq.js',
          '/autocomplete.js',
          '/vendor/jq/jq.wasm',
          '/vendor/jq/jq.js',
          '/vendor/jq/jq.worker.js',
          '/vendor/workerize.js',
          '/config.js',
          '/client.js',
          '/favicon-32x32.png',
          '/favicon-16x16.png',
          '/vendor/codemirror/5.48.2/codemirror.css',
          '/vendor/codemirror/5.48.2/addon/fold/foldgutter.css',
          '/style.css',
          '/theme.css',
          '/manifest.json',
        ])
        .then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== cacheName)
            .map((cache) => caches.delete(cache))
        )
      )
  );
});

// when the browser fetches a url, either response with
// the cached object or go ahead and fetch the actual url
self.addEventListener('fetch', (event) => {
  var res = event.request;
  var url = new URL(res.url);
  event.respondWith(
    // ensure we check the *right* cache to match against
    caches.open(cacheName).then((cache) => {
      return cache.match(res).then((res) => {
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
