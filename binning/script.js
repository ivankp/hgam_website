const state = { }, form = { };
let main_table, vars_table;

function numfmt(x) {
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a === Infinity) return x < 0 ? '-inf' : 'inf';
  if (1e-3 < a && a < 1e4) return x.toString();
  return x.toExponential().replace(/\+/g,'').replace(/\.?0*e/,'e');
}

function fix_edges(edges) {
  if (edges.constructor !== Array || edges.length === 0) return [ ];
  return edges
    .reduce((a,x) => {
      let f = parseFloat(x);
      if (Number.isNaN(f)) {
        if (x.match(/^-?(?:inf(?:(?:ini)?ty)?|∞)$/i)) f = Infinity;
        if (x[0]==='-') f = -f;
      }
      if (!Number.isNaN(f)) a.push(f);
      return a;
    },[])
    .sort((a,b) => a-b)
    .filter((x, i, a) => !i || x != a[i-1]); // unique
}

function toggle_unc_cols() {
  const display = ('unc' in state) ? 'table-cell' : 'none';
  for (const tr of main_table.children) {
    const tds = tr.children;
    for (let i=0; i<tds.length; ++i) {
      if ([2,3,7,8].includes(i))
        tds[i].style['display'] = display;
    }
  }
}

function state_from_url() {
  let xi = { };
  let q = location.search;
  if (q.startsWith('?')) q = q.slice(1);
  if (q.length) {
    for (const x of q.split('&')) {
      let i = x.indexOf('=');
      const [k,v] = i === -1 ? [ x, '' ] : [ x.slice(0,i), x.slice(i+1) ];
      if (['lumi'].includes(k)) {
        state[k] = v;
      } else if (['unc','click'].includes(k)) {
        state[k] = null;
      } else if (k.match(/x[1-9]/)) {
        if (v==null || v.length==0) continue;
        const edges = v.split('+');
        if (!vars.includes(edges[0])) continue;
        if (!(edges[0] in xi))
          xi[edges[0]] = [
            parseInt(k.slice(1)),
            fix_edges(edges.slice(1)).map(numfmt)
          ];
      }
    }
  }

  xi = Object.entries(xi);
  state.vars = (
    xi.length > 0
    ? xi.map(x => [x[1][0],x[0],x[1][1]])
        .sort()
        .map((x,i) => [x[1],x[2]])
    : [[vars[0],[]]]
  );

  let lumi = parseFloat(state.lumi);
  state.lumi = isNaN(lumi) ? '' : lumi;
}

function state_from_form() {
  let lumi = parseFloat(form['lumi'].value);
  if (isNaN(lumi)) lumi = '';
  state['lumi'] = lumi;

  let v = form['var'].value;
  if (!vars.includes(v)) {
    v = vars[0];
  }
  state['var'] = v;

  let edges = fix_edges(form['edges'].value.split(' '));
  state['edges'] = edges;
}

function search_from_state(req=false) {
  let search = '';
  const d = () => search.length===0 ? '?' : '&';

  const lumi = state['lumi'];
  if (lumi) search += d() + 'lumi=' + lumi;

  for (let i=0; i<state.vars.length; ++i) {
    const [name,edges] = state.vars[i];
    search += d() + 'x' + (i+1) + '=' + name;
    for (const e of edges) search += '+' + e;
  }

  if (!req)
    for (const k of ['unc','click'])
      if (k in state) search += d() + k;

  return search;
}
function url_from_state() {
  history.replaceState(
    state,
    '',
    location.origin + location.pathname + search_from_state()
  );
}

function add_var_row(i) {
  const v = state.vars[i];
  const tr = $(vars_table,'tr');
  const select = $(tr,'td','select',{'name':'x'+(i+1)});
  for (const x of vars) {
    const opt = $(select,'option');
    opt.textContent = x;
    if (x === v[0]) opt.selected = true;
  }
  let td = $(tr,'td');
  const name = 'x'+(i+1)+'edges';
  $(td,'input',{
    name,
    list: name+'_list',
    type: 'text',
    size: 30,
    autocomplete: 'off'
  }).value = v[1].join(' ');
  $(td,'datalist',{id:name+'_list'});
  for (const x of ['−','+','↓','↑'])
    $(tr,'td','button').textContent = x;
  return tr;
}

function form_from_state() {
  for (const x of ['unc','click'])
    form[x].checked = x in state;

  for (const x of ['lumi'])
    form[x].value = state[x];

  clear(vars_table);
  for (let i=0; i<state.vars.length; ++i) {
    const tr = add_var_row(i);
    if (i===0) {
      $(tr,'td','input',{type:'submit',value:'Rebin'});
      $(tr,'td','img',{
        id: 'loading',
        src: '../img/loading.gif',
        alt: 'loading',
        style: { display: 'none' }
      });
      $(tr,'td','span',{id:'run_time'});
    }
  }
}

function state_from_resp(resp) {
  state['lumi'] = resp['lumi'];
  state['var'] = resp['var'];
  state['edges'] = fix_edges(resp['var_bins'].map(String));
}

function table_from_resp(resp) {
  while (main_table.children.length > 2)
    main_table.lastElementChild.remove();
  const n = resp.var_bins.length - 1;
  for (let i=0; i<n; ++i) {
    const tr = $(main_table,'tr');
    $(tr,'td').textContent = '['+resp.var_bins[i]+','+resp.var_bins[i+1]+')';
    const sig = resp.sig[i];
    $(tr,'td').textContent = sig;
    $(tr,'td').textContent = sig === 0 ? '—' :
      (100*resp.sig_sys[i]/sig).toFixed(2)+'%';
    $(tr,'td').textContent = sig === 0 ? '—' :
      (100/Math.sqrt(sig)).toFixed(2)+'%';
  }
  toggle_unc_cols();
}

function main() {
  // collect named form elements
  $q('form [name]', x => { form[x.name] = x; });

  vars_table = $id('vars_table');
  main_table = $($id('main_table'),'table');

  // get state from url
  state_from_url();
  url_from_state();
  form_from_state();

  // create table columns
  for (row of [
    [ '','[121,129]','syst. unc.','stat. unc.',
     '[105,121)','(129,160]','[121,129]','syst. unc.','stat. unc.',
     'signif','signif','','reco'],
    ['bin','sig','\u221a\u2211w\u00B2','\u221asig',
     'L bkg','R bkg','bkg','from fit','\u221abkg',
     's/\u221a(s+b)','Cowan','s/(s+b)','purity']
  ]) {
    const tr = $(main_table,'tr');
    for (col of row)
      $(tr,'td').textContent = col;
  }
  { const tds = main_table.firstChild.children;
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
    console.log(e);
    // state_from_form();
    // url_from_state();
    // form_from_state();
    //
    // fetch('req.php'+search_from_state(true),{
    //   referrer: location.origin + location.pathname
    // })
    // .then(resp => resp.json())
    // .then(resp => {
    //   if ('error' in resp) {
    //     alert(resp.error);
    //   } else {
    //     state_from_resp(resp);
    //     url_from_state();
    //     form_from_state();
    //     table_from_resp(resp);
    //   }
    // });
  });

  // MxAODs
  $q('#mxaods .show', q => { q.addEventListener('click', e => {
    const p = q.parentElement;
    let ul = p.lastElementChild;
    if (ul.tagName !== 'UL') {
      ul = (function level(li,xs) {
        const ul = $(li,'ul');
        for (const x of xs) {
          const li = $(ul,'li');
          if (Array.isArray(x)) {
            $(li,'span',['dir']).textContent = x[0];
            level(li,x[1]);
          } else {
            li.textContent = x;
          }
        }
        return ul;
      }(p,mxaods));
      ul.style.display = 'none';
    }
    if (ul.style.display) { // hidden, need to show
      ul.style.display = null;
      e.target.textContent = '[hide]';
    } else { // shown, need to hide
      ul.style.display = 'none';
      e.target.textContent = '[show]';
    }
  })});

}
