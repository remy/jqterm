/* global debounce */

const tooltipText = `${
  window.navigator.platform.includes('Mac') ? 'Option' : 'Alt'
} + click to follow link`;

function hoverWidgetOnOverlay(cm, overlayClass, widget) {
  cm.addWidget({ line: 0, ch: 0 }, widget, true);
  widget.style.position = 'fixed';
  widget.style.zIndex = 100000;
  widget.style.top = widget.style.left = '-1000px'; // hide it
  widget.dataset.token = null;

  let altDown = false;

  const hideWidget = () => {
    widget.style.top = widget.style.left = '-1000px'; // hide it
    delete widget.dataset.token;
    widget.dataset.entered = 'false';
  };

  cm.getWrapperElement().addEventListener('click', e => {
    let onToken = e.target.classList.contains('cm-' + overlayClass);

    if (onToken && e.altKey === true && widget.dataset.token) {
      let link = widget.dataset.token;
      if (!new RegExp('^(?:(?:https?|ftp)://)', 'i').test(link))
        link = 'http://' + link;
      window.open(link, '_blank');
    } else {
      hideWidget();
    }
  });

  document.body.addEventListener('keydown', e => {
    altDown = e.altKey;
  });

  document.body.addEventListener('keyup', () => {
    altDown = false;
    if (!altDown && widget.target) {
      widget.target.classList.remove('hover');
    }
  });

  cm.getWrapperElement().addEventListener(
    'mousemove',
    debounce(e => {
      let onToken = e.target.classList.contains('cm-' + overlayClass);

      if (!altDown && widget.target) {
        widget.target.classList.remove('hover');
      }
      if (onToken && e.target.innerText !== widget.dataset.token) {
        // entered token, show widget
        var rect = e.target.getBoundingClientRect();
        widget.style.left = rect.left + 'px';
        widget.style.top = rect.top - rect.height + 'px';
        widget.target = e.target;

        widget.dataset.token = e.target.innerText;

        if (altDown) widget.target.classList.add('hover');
      } else if (e.target === widget || widget.contains(e.target)) {
        widget.dataset.entered = 'true';
      } else if (!onToken && widget.style.left !== '-1000px') {
        // we stepped outside
        hideWidget();
      }

      return true;
    }, 200)
  );
}

window.hyperlinkOverlay = cm => {
  if (!cm) return;

  const rx_word = '" '; // Define what separates a word

  function isUrl(s) {
    if (!isUrl.rx_url) {
      // taken from https://gist.github.com/dperini/729294
      isUrl.rx_url = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i;

      // valid prefixes
      isUrl.prefixes = ['http://', 'https://', 'ftp://', 'www.'];
      // taken from https://w3techs.com/technologies/overview/top_level_domain/all
      isUrl.domains = [
        'com',
        'ru',
        'net',
        'org',
        'de',
        'jp',
        'uk',
        'br',
        'pl',
        'in',
        'it',
        'fr',
        'au',
        'info',
        'nl',
        'ir',
        'cn',
        'es',
        'cz',
        'kr',
        'ua',
        'ca',
        'eu',
        'biz',
        'za',
        'gr',
        'co',
        'ro',
        'se',
        'tw',
        'mx',
        'vn',
        'tr',
        'ch',
        'hu',
        'at',
        'be',
        'dk',
        'tv',
        'me',
        'ar',
        'no',
        'us',
        'sk',
        'xyz',
        'fi',
        'id',
        'cl',
        'by',
        'nz',
        'il',
        'ie',
        'pt',
        'kz',
        'io',
        'my',
        'lt',
        'hk',
        'cc',
        'sg',
        'edu',
        'pk',
        'su',
        'bg',
        'th',
        'top',
        'lv',
        'hr',
        'pe',
        'club',
        'rs',
        'ae',
        'az',
        'si',
        'ph',
        'pro',
        'ng',
        'tk',
        'ee',
        'asia',
        'mobi',
      ];
    }

    if (!isUrl.rx_url.test(s)) return false;
    for (let i = 0; i < isUrl.prefixes.length; i++)
      if (s.startsWith(isUrl.prefixes[i])) return true;
    for (let i = 0; i < isUrl.domains.length; i++)
      if (
        s.endsWith('.' + isUrl.domains[i]) ||
        s.includes('.' + isUrl.domains[i] + '/') ||
        s.includes('.' + isUrl.domains[i] + '?')
      )
        return true;
    return false;
  }

  cm.addOverlay(
    {
      token: function(stream) {
        let ch = stream.peek();
        let word = '';

        if (rx_word.includes(ch) || ch === '\uE000' || ch === '\uE001') {
          stream.next();
          return null;
        }

        while ((ch = stream.peek()) && !rx_word.includes(ch)) {
          word += ch;
          stream.next();
        }

        if (isUrl(word)) return 'string url'; // CSS class: cm-url
      },
    },
    { opaque: true } // opaque will remove any spelling overlay etc
  );

  let widget = document.createElement('div');
  widget.className = 'cm-tooltip';
  widget.innerHTML = tooltipText;
  hoverWidgetOnOverlay(cm, 'url', widget);
};
