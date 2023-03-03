const state = { }, form = { };
let main_table, vars_table;
let main_table_ncols;
let vars_names, default_var;

function numfmt(x) {
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a === Infinity) return x < 0 ? '-inf' : 'inf';
  if (1e-3 < a && a < 1e4) return x.toString();
  return x.toExponential().replace(/\+/g,'').replace(/\.?0*e/,'e');
}
function numfmt2(x) {
  if (x === 0) return '0';
  if (x.constructor === String) {
    if (x==='-inf') return '-∞';
    if (x=== 'inf') return  '∞';
    return x;
  }
  const a = Math.abs(x);
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
    const nvars = tds.length - main_table_ncols;
    if (nvars >= 0)
      for (const i of [1,2,6,7])
        tds[i+nvars].style['display'] = display;
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
        if (!(edges[0] in binning)) continue;
        if (!(edges[0] in xi))
          xi[edges[0]] = [
            parseInt(k.slice(1)),
            fix_edges(edges.slice(1)).map(numfmt)
          ];
      }
    }
  }

  // number variables in url sequentially starting from 1
  xi = Object.entries(xi);
  state.vars = (
    xi.length > 0
    ? xi.map(x => [x[1][0],x[0],x[1][1]])
        .sort()
        .map((x,i) => [x[1],x[2]])
    : [[default_var,[]]]
  );

  let lumi = parseFloat(state.lumi);
  state.lumi = isNaN(lumi) ? '' : lumi;
}

function state_from_form() {
  const unique_vars = { };
  const form_vars = [ ];
  $q('form [name^="x"]', x => { form_vars.push(x); });
  form_vars.sort((a,b) => {
    a = a.name;
    b = b.name;
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  state_vars = [ ];
  for (let i=0; i<form_vars.length; i+=2) {
    const name = form_vars[i].value;
    if (name in unique_vars)
      throw new Error(name+' selected multiple times');
    else unique_vars[name] = null;
    const edges = fix_edges(form_vars[i+1].value.split(' ')).map(numfmt);
    if (edges.length < 2) {
      form_vars[i+1].value = edges.join(' ');
      throw new Error('fewer than 2 edges for '+name);
    }
    state_vars.push([ name, edges ]);
  }

  let lumi = parseFloat(form.lumi.value);
  if (Number.isNaN(lumi)) lumi = '';

  state.vars = state_vars;
  state.lumi = lumi;
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

function submit_on_enter(field) {
  field.addEventListener('keypress', function(e){
    if (event.key !== 'Enter') return;
    e.preventDefault();
    this.closest('form').dispatchEvent(
      new CustomEvent('submit', {cancelable: true})
    );
  });
}

function add_var_events(b,edges) {
  b[0].addEventListener('click', function(e){
    e.preventDefault();
    if (vars_table.childElementCount <= 1) return;
    const tr = this.closest('tr');
    const next = tr.nextElementSibling;
    tr.remove();
    if (next) fix_form_var_names(next,-1);
  });
  b[1].addEventListener('click', function(e){
    e.preventDefault();
    if (vars_table.childElementCount >= 9) return;
    const tr = this.closest('tr');
    let next = tr.cloneNode(true);
    next.firstElementChild.firstElementChild.selectedIndex =
      tr.firstElementChild.firstElementChild.selectedIndex;
    add_var_events(
      next.getElementsByTagName('button'),
      next.getElementsByTagName('input')[0],
    );
    tr.after(next);
    fix_form_var_names(next,1);
  });
  b[2].addEventListener('click', function(e){
    e.preventDefault();
    const tr = this.closest('tr');
    const next = tr.nextElementSibling;
    if (next) {
      next.after(tr);
      fix_form_var_names(next,-1);
    }
  });
  b[3].addEventListener('click', function(e){
    e.preventDefault();
    const tr = this.closest('tr');
    const prev = tr.previousElementSibling;
    if (prev) {
      tr.after(prev);
      fix_form_var_names(tr,-1);
    }
  });
  // For some reason, button events prevent Enter on input field
  // from triggering the form submit event
  submit_on_enter(edges);
}
function fix_form_var_names(tr,d) {
  let i = 0;
  while (tr) {
    for (let td = tr.firstElementChild; td; td = td.nextElementSibling) {
      const x = td.firstElementChild;
      let name = x.name;
      if (!name) continue;
      if (i===0) i = parseInt(name[1])+d;
      x.name = 'x'+i+name.slice(2);
      name = x.getAttribute('list');
      if (!name) continue;
      name = 'x'+i+name.slice(2);
      x.setAttribute('list',name);
      x.nextElementSibling.id = name;
    }
    ++i;
    tr = tr.nextElementSibling;
  }
}

function form_from_state() {
  for (const x of ['unc','click'])
    form[x].checked = x in state;

  for (const x of ['lumi'])
    form[x].value = state[x];

  clear(vars_table);
  for (let i=0; i<state.vars.length; ++i) {
    const v = state.vars[i];
    const tr = $(vars_table,'tr');
    const select = $(tr,'td','select',{name:'x'+(i+1)});
    for (const x of vars_names) {
      const opt = $(select,'option');
      opt.textContent = x;
      if (x === v[0]) opt.selected = true;
    }
    let td = $(tr,'td');
    const name = 'x'+(i+1)+'_edges';
    const edges = $(td,'input',{
      name,
      list: name+'_list',
      type: 'text',
      size: 30,
      autocomplete: 'off'
    });
    edges.value = v[1].join(' ');
    $(td,'datalist',{id:name+'_list'});
    const b = ['−','+','↓','↑'].map(x => {
      const b = $(tr,'td','button');
      b.textContent = x;
      return b;
    });
    add_var_events(b,edges);
  }
}

// function state_from_resp(resp) {
//   state['lumi'] = resp['lumi'];
//   state['var'] = resp['var'];
//   state['edges'] = fix_edges(resp['var_bins'].map(String));
// }

function table_from_resp(resp) {
  console.log(resp);

  const rows = main_table.children;
  while (rows.length > 2)
    rows[rows.length-1].remove();
  for (let i=0; i<2; ++i) {
    const row = rows[i].children;
    let n = row.length - main_table_ncols;
    for (; n > 0; --n)
      row[0].remove();
  }

  if (!('vars' in resp) || resp['vars'].length===0) {
    console.log(resp);
    throw Error('no variables in response');
  }
  const nvars = resp.vars.length;

  for (let i=nvars; i--; ) {
    const v = resp.vars[i];
    rows[0].prepend($(null,'td'));
    let td = $(null,'td',{style:{'font-size':'small'}});
    td.textContent = v[0];
    rows[1].prepend(td);
  }

  const nn = resp.vars.map(x => x[1].length-1);
  const ii = nn.map(x => 0);
  row_loop: for (let j=0;;) {
    const tr = $(main_table,'tr');
    for (let i=0; i<nvars; ++i, ++j) {
      $(tr,'td').textContent = '['
        + numfmt2(resp.vars[i][1][ii[i]  ]) + ','
        + numfmt2(resp.vars[i][1][ii[i]+1]) + ')';

      const s = resp.sig[j];
      $(tr,'td').textContent = s.toFixed(2);
      $(tr,'td').textContent = s === 0 ? '—' :
        (100*resp.sig_sys[j]/s).toFixed(2)+'%';
      $(tr,'td').textContent = s === 0 ? '—' :
        (100/Math.sqrt(s)).toFixed(2)+'%'; // √n/n = 1/√n

      let b = resp.bkg[j];
      const prec = resp.lumi.length === 2 ? 2 : 0;
      $(tr,'td').textContent = b[0].toFixed(prec);
      $(tr,'td').textContent = b[2].toFixed(prec);
      b = b[1];
      $(tr,'td').textContent = b.toFixed(2);

      $(tr,'td').textContent = 'TODO';
      $(tr,'td').textContent = b === 0 ? '—' :
        (100/Math.sqrt(b)).toFixed(2)+'%'; // √n/n = 1/√n

      // significance
      let signif = s/Math.sqrt(s+b);
      let finite = Number.isFinite(signif);
      $(tr,'td',{style:{
        'font-weight': 'bold',
        color: !finite ? null
             : signif < 1   ? '#CC0000'
             : signif < 2   ? '#FF6600'
             : signif < 2.3 ? '#000099'
             : '#006600'
      }}).textContent = signif.toFixed(2);

      signif = Math.sqrt(2*((s+b)*Math.log(1+s/b)-s));
      finite = Number.isFinite(signif);
      $(tr,'td',{style:{
        'font-weight': 'bold',
        color: !finite ? null
             : signif < 1   ? '#CC0000'
             : signif < 2   ? '#FF6600'
             : signif < 2.3 ? '#000099'
             : '#006600'
      }}).textContent = finite ? signif.toFixed(2) : '—';

      $(tr,'td').textContent = (100*s/(s+b)).toFixed(2)+'%';

      const purity = /* */NaN;
      finite = Number.isFinite(purity);
      $(tr,'td',{style:{
        color: !finite ? null
             : purity < 0.4  ? '#CC0000'
             : purity < 0.5  ? '#FF6600'
             : purity < 0.75 ? '#000099'
             : '#006600'
      }}).textContent = finite ? (100*purity).toFixed(2)+'%' : '—';
    }
    for (let i=0;;) {
      if (++ii[i] < nn[i]) break;
      ii[i] = 0;
      if (++i === nvars) break row_loop;
    }
  }

  form.lumi.value = resp.lumi[0];

  $id('data_lumi').textContent =
    resp.lumi.length === 2 ? `(scaled from ${resp.lumi[1]} ifb)` : '';

  toggle_unc_cols();
}

function main() {
  vars_names = Object.keys(binning).sort((a,b) => {
    a = a.name.toLowerCase();
    b = b.name.toLowerCase();
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  default_var = 'pT_yy' in binning ? 'pT_yy' : vars_names[0];

  // collect named form elements
  $q('form [name]', x => { form[x.name] = x; });

  submit_on_enter(form['lumi']);

  vars_table = $id('vars_table');
  main_table = $($id('main_table'),'table');

  // get state from url
  state_from_url();
  url_from_state();
  form_from_state();

  // create table columns
  for (row of [
    ['[121,129]','syst. unc.','stat. unc.',
     '[105,121)','(129,160]','[121,129]','syst. unc.','stat. unc.',
     'signif','signif','','reco'],
    ['sig','\u221a\u2211w\u00B2','\u221asig',
     'L bkg','R bkg','bkg','from fit','\u221abkg',
     's/\u221a(s+b)','Cowan','s/(s+b)','purity']
  ]) {
    const tr = $(main_table,'tr');
    for (col of row)
      $(tr,'td').textContent = col;
  }
  { const tds = main_table.firstChild.children;
    main_table_ncols = tds.length;
    for (let i=0; i<8; ++i)
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

  $q('form')[0].addEventListener('submit', function(e){
    e.preventDefault();
    try {
      state_from_form();
      url_from_state();
      form_from_state();

      const form_elements = this.querySelectorAll('input,select,button');
      for (const x of form_elements) x.disabled = true;
      const loading = $id('loading');
      loading.style.removeProperty('display');
      const run_time = $id('run_time');
      run_time.textContent = '';

      const enable = () => {
        for (const x of form_elements) x.disabled = false;
        loading.style['display'] = 'none';
      };

      fetch('req.php'+search_from_state(true),{
        referrer: location.origin + location.pathname
      })
      .then(resp => resp.json())
      .then(resp => {
        if ('error' in resp) {
          alert(resp.error);
        } else {
          // state_from_resp(resp);
          // url_from_state();
          // form_from_state();
          table_from_resp(resp);

          run_time.textContent = resp.time + ' ms';
        }
        enable();
      })
      .catch(e => {
        alert('Request failed');
        throw e;
        enable();
      });
    } catch(e) {
      alert(e.message);
    }
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
