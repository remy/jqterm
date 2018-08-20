(() => {
  /* all jq keywords based on following from docs page
   Array.from( // cast to array
     new Set( // using a Set to remove dupes
       $$('h3 code') // method selector
        .map(_ => _.innerText.replace(/\(.*$/, '')) // strip func args
        .filter(_ => !_.includes(' ')) // ignore with spaces
        .filter(_ => /^[a-z]/i.test(_)) // ignore non-alpha funcs
      )
    )
   */
  const keywords = [
    'add',
    'all',
    'any',
    'arrays',
    'ascii_downcase',
    'ascii_upcase',
    'booleans',
    'bsearch',
    'builtins',
    'capture',
    'combinations',
    'contains',
    'debug',
    'del',
    'delpaths',
    'empty',
    'endswith',
    'env',
    'error',
    'explode',
    'finites',
    'first',
    'flatten',
    'floor',
    'foreach',
    'from_entries',
    'fromstream',
    'getpath',
    'group_by',
    'gsub',
    'halt_error',
    'halt',
    'has',
    'if',
    'then',
    'else',
    'elif',
    'end',
    'implode',
    'in',
    'index',
    'indices',
    'infinite',
    'input_filename',
    'input_line_number',
    'input',
    'inputs',
    'inside',
    'isfinite',
    'isinfinite',
    'isnan',
    'isnormal',
    'iterables',
    'join',
    'keys_unsorted',
    'keys',
    'last',
    'leaf_paths',
    'length',
    'limit',
    'ltrimstr',
    'map_values',
    'map',
    'match',
    'max_by',
    'max',
    'min_by',
    'min',
    'modulemeta',
    'nan',
    'normals',
    'nth',
    'nulls',
    'numbers',
    'objects',
    'path',
    'paths',
    'range',
    'recurse_down',
    'reduce',
    'recurse',
    'reverse',
    'rindex',
    'rtrimstr',
    'scalars',
    'sort',
    'sort_by',
    'scan',
    'select',
    'setpath',
    'split',
    'splits',
    'sqrt',
    'startswith',
    'stderr',
    'strings',
    'sub',
    'test',
    'to_entries',
    'tonumber',
    'tostream',
    'tostring',
    'transpose',
    'truncate_stream',
    'type',
    'unique_by',
    'unique',
    'until',
    'utf8bytelength',
    'values',
    'walk',
    'while',
    'with_entries',
  ];

  const jqMode = {
    // The start state contains the rules that are intially used
    start: [
      // The regex matches the token, the token property contains the type
      { regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: 'string' },
      // You can match multiple tokens at once. Note that the captured
      // groups must span the whole string in this case
      {
        regex: /(def)(\s+)([a-z$][\w$]*)/,
        token: ['keyword', null, 'variable-2'],
      },
      // Rules are matched in the order in which they appear, so there is
      // no ambiguity between this one and the one above
      {
        regex: new RegExp(
          `[^_](?:${keywords
            .concat('def', 'if', 'elif', 'else', 'end', 'then', 'as')
            .join('|')})\\b`
        ),
        token: 'keyword',
      },
      { regex: /true|false|null/, token: 'atom' },
      {
        regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i,
        token: 'number',
      },
      { regex: /#.*/, token: 'comment' },
      { regex: /\/(?:[^\\]|\\.)*?\//, token: 'variable-3' },
      // A next property will cause the mode to move to a different state
      // { regex: /\/\*/, token: 'comment', next: 'comment' },
      { regex: /[-+\/*=<>!\[\]\|]+/, token: 'operator' },
      // indent and dedent properties guide autoindentation
      { regex: /[\{\[\(]/, indent: true },
      { regex: /[\}\]\)]/, dedent: true },
      { regex: /\$[a-z$][\w$]*/, token: 'variable' },
    ],
    // The meta property contains global information about the mode. It
    // can contain properties like lineComment, which are supported by
    // all modes, and also directives like dontIndentStates, which are
    // specific to simple modes.
    meta: {
      dontIndentStates: ['comment'],
      lineComment: '#',
    },
  };

  const sourceChange = async (cm, input) => {
    try {
      const value = getKeys(JSON.parse(cm.getValue()));
      input.addKeywordsFromString(value.join(' '));
    } catch (e) {}
  };

  function getKeys(object) {
    return Object.keys(object).reduce((acc, curr) => {
      acc.push(curr);
      if (typeof object[curr] === 'object') {
        acc = acc.concat(getKeys(object[curr]));
      }

      return acc;
    }, []);
  }

  window.jq = {
    jqMode,
    sourceChange,
    keywords,
  };
})();
