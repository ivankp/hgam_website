const state = { }, form = { };
let table;

function numfmt(x) {
  const a = Math.abs(x);
  return (a <= 1e-3 || 1e4 <= a)
    ? x.toExponential().replace(/\+/g,'').replace(/\.?0*e/,'e')
    : x.toString();
}

function fix_edges(edges) {
  return edges
    .reduce((a,x) => {
      const neg = x[0] === '-';
      if (neg) x = x.slice(1);
      if (x.match(/^(-)?inf(?:(?:ini)?ty)?$/i) || x === '∞') x = Infinity;
      else x = parseFloat(x);
      if (!isNaN(x)) a.push(numfmt(neg ? -x : x));
      return a;
    },[])
    .sort((a,b) => a-b)
    .filter((x, i, a) => !i || x != a[i-1]); // unique
}

function join_num(xs,delim) {
  return xs.map(x =>
    Math.abs(x) === Infinity ? (x < 0 ? '-' : '') + 'inf' : x.toString()
  ).join(delim);
}

function state_from_url() {
  { let s = location.search;
    if (s.startsWith('?')) s = s.slice(1);
    if (s.length) for (let x of s.split('&')) {
      const i = x.indexOf('=');
      x = i === -1 ? [ x, null ] : [ x.slice(0,i), x.slice(i+1) ];
      if (x[0] in form) state[x[0]] = x[1];
    }
  }

  let lumi = parseFloat(state['lumi']);
  if (isNaN(lumi)) lumi = lumi_default;
  state['lumi'] = lumi;

  if (!('var' in state) || !vars.includes(state['var']))
    state['var'] = vars[0];

  let edges = state['edges'];
  edges = edges == null || edges.length === 0
    ? [ ] : fix_edges(edges.split('+'));
  state['edges'] = edges;
}

function state_from_form() {
  let lumi = parseFloat(form['lumi'].value);
  if (isNaN(lumi)) {
    lumi = lumi_default;
  }
  state['lumi'] = lumi;

  let v = form['var'].value;
  if (!vars.includes(v)) {
    v = vars[0];
  }
  state['var'] = v;

  let edges = fix_edges(form['edges'].value.split(' '));
  state['edges'] = edges;
}

function search_from_state(...keys) {
  let search = '';
  for (let [k,v] of ( m =>
    keys.length === 0 ? m : m.filter( ([key]) => keys.includes(key) )
  )(Object.entries(state)) ) {
    search += (search ? '&' : '?') + k;
    if (v !== null) {
      if (v.constructor === Array) v = join_num(v,'+');
      search += '=' + v;
    }
  }
  return search;
}
function url_from_state() {
  history.replaceState(
    state,
    '',
    location.origin + location.pathname + search_from_state()
  );
}

function form_from_state() {
  for (const [name,x] of Object.entries(form)) {
    if (x.type === 'checkbox') {
      x.checked = name in state;
    } else {
      let v = state[name];
      if (v == null) v = '';
      else if (v.constructor === Array) v = join_num(v,' ');
      x.value = v;
    }
  }
}

function toggle_unc_cols() {
  const display = ('unc' in state) ? 'table-cell' : 'none';
  for (const tr of table.children) {
    const tds = tr.children;
    for (let i=0; i<tds.length; ++i) {
      if ([2,3,7,8].includes(i))
        tds[i].style['display'] = display;
    }
  }
}

function main() {
  // collect named form elements
  $q('form [name]', x => { form[x.name] = x; });
  for (const v of vars)
    $(form['var'],'option').textContent = v;

  // get state from url
  state_from_url();
  url_from_state();
  form_from_state();

  // create table columns
  table = $($id('table'),'table');
  for (row of [
    [ '','[121,129]','syst. unc.','stat. unc.',
     '[105,121]','[129,160]','[121,129]','syst. unc.','stat. unc.',
     'signif','signif','','reco'],
    ['bin','sig','\u221a\u2211w\u00B2','\u221asig',
     'L bkg','R bkg','bkg','from fit','\u221abkg',
     's/\u221a(s+b)','Cowan','s/(s+b)','purity']
  ]) {
    const tr = $(table,'tr');
    for (col of row)
      $(tr,'td').textContent = col;
  }
  { const tds = table.firstChild.children;
    for (let i=0; i<9; ++i)
      tds[i].style['font-size'] = 'small';
  }
  toggle_unc_cols();

  // events
  for (const [name,f] of [
    ['unc', toggle_unc_cols],
    ['click', () => { /* TODO */ }]
  ]) {
    form[name].addEventListener('change', e => {
      if (e.target.checked) state[name] = null;
      else delete state[name];
      f();
      url_from_state();
    });
  }

  $q('form')[0].addEventListener('submit', e => {
    e.preventDefault();
    state_from_form();
    url_from_state();
    form_from_state();

    fetch('req.php'+search_from_state('lumi','var','edges'),{
      referrer: location.origin + location.pathname
    })
    .then(r => r.json())
    .then(d => {
      console.log(d);
    });
  });
}
