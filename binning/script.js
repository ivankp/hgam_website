let state = { }, fields = { };
let main_table, form_table;
let main_table_ncols;
let vars_names;

const dummy_a = document.createElement('a');

const round = x => x.toFixed(4).replace(/\.?0*$/,'');

const split_index = (k,xs,f) => {
  const nn = xs.length;
  if (nn > 1) {
    const ii = [ f(xs[0]) ];
    for (let i=1; i<nn-1; ++i)
      ii.push(ii[i-1]*f(xs[i]));
    ii.push(k);
    for (let i=nn; --i; ) {
      k = ii[i];
      ii[i] = k / ii[i-1] >> 0;
      ii[i-1] = k % ii[i-1];
    }
    return ii;
  } else return [ k ];
};

const prod_loop = (f, ...aa) => {
  const na = aa.length;
  const nn = aa.map(x => x[1].length-1);
  const ii = nn.map(x => 0);
  big_loop: for (let j=0;;++j) {
    f(ii,j);
    for (let i=0;;) {
      if (++ii[i] < nn[i]) break;
      ii[i] = 0;
      if (++i === na) break big_loop;
    }
  }
};

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
        tds[i+nvars].style.display = display;
  }
  $id('note').style.maxWidth = main_table.getBoundingClientRect().width+'px';
  move_pane();
}

function toggle_row_click(t) {
  $(main_table,[(t.checked?'':'-')+'click']);
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

  // collect selected variables or use default
  xi = Object.entries(xi);
  state.vars = (
    xi.length > 0
    ? xi.map(x => [x[1][0],x[0],x[1][1]])
        .sort()
        .map((x,i) => [x[1],x[2]])
    : [[
      'pT_yy' in binning ? 'pT_yy' : vars_names[0],
      []
    ]]
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

  let lumi = parseFloat(fields.lumi.value);
  if (Number.isNaN(lumi)) lumi = '';

  state.vars = state_vars;
  state.lumi = lumi;
}

function search_from_state(req=false) {
  let search = '';
  const d = () => search.length===0 ? '?' : '&';

  const lumi = state.lumi;
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
function url_from_state(push=false) {
  const search = search_from_state();
  const url = location.origin + location.pathname + search;
  if (push) history.pushState(state,'',url);
  else history.replaceState(state,'',url);
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

function add_var_events(select,edges,datalist,buttons) {
  select.addEventListener('change', function(e){
    clear(datalist);
    let first = true;
    for (const [label,value] of binning[this.value]) {
      $(datalist,'option',{label,value});
      if (first) {
        first = false;
        edges.value = value;
      }
    }
  });
  buttons[0].addEventListener('click', function(e){
    e.preventDefault();
    if (form_table.childElementCount <= 1) return;
    const tr = this.closest('tr');
    const next = tr.nextElementSibling;
    tr.remove();
    if (next) fix_form_var_names(next,-1);
  });
  buttons[1].addEventListener('click', function(e){
    e.preventDefault();
    if (form_table.childElementCount >= 9) return;
    const tr = this.closest('tr');
    let next = tr.cloneNode(true);
    next.firstElementChild.firstElementChild.selectedIndex =
      tr.firstElementChild.firstElementChild.selectedIndex;
    add_var_events(
      next.getElementsByTagName('select')[0],
      next.getElementsByTagName('input')[0],
      next.getElementsByTagName('datalist')[0],
      next.getElementsByTagName('button')
    );
    tr.after(next);
    fix_form_var_names(next,1);
  });
  buttons[2].addEventListener('click', function(e){
    e.preventDefault();
    const tr = this.closest('tr');
    const next = tr.nextElementSibling;
    if (next) {
      next.after(tr);
      fix_form_var_names(next,-1);
    }
  });
  buttons[3].addEventListener('click', function(e){
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
    fields[x].checked = x in state;

  for (const x of ['lumi'])
    fields[x].value = state[x];

  clear(form_table);
  for (let i=0; i<state.vars.length; ++i) {
    const v = state.vars[i];
    const tr = $(form_table,'tr');
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
    const datalist = $(td,'datalist',{id:name+'_list'});
    const buttons = ['−','+','↓','↑'].map(x => {
      const b = $(tr,'td','button');
      b.textContent = x;
      return b;
    });
    add_var_events(select,edges,datalist,buttons);
    if (state.vars[i][1].length === 0) // try to set default value
      // TODO: the check prevents options from populating the datalist on load
      select.dispatchEvent(new CustomEvent('change'));
  }
}

function process_resp() {
  const rows = main_table.children;
  while (rows.length > 2)
    rows[rows.length-1].remove();
  for (let i=0; i<2; ++i) {
    const row = rows[i].children;
    let n = row.length - main_table_ncols;
    for (; n > 0; --n)
      row[0].remove();
  }

  console.log(state.resp);
  const { vars, migration: mig, lumi, bkg, sig, sig_sys } = state.resp;

  if (vars === undefined || vars.length === 0) {
    console.log(state.resp);
    throw Error('no variables in response');
  }
  const nvars = vars.length;
  const nbins = sig.length;

  for (let i=nvars; i--; ) {
    const v = vars[i];
    rows[0].prepend($(null,'td'));
    let td = $(null,'td',{style:{'font-size':'small'}});
    td.textContent = v[0];
    rows[1].prepend(td);
  }

  prod_loop((ii,j) => {
    const tr = $(main_table,'tr');
    for (let i=0; i<nvars; ++i) {
      $(tr,'td').textContent = '['
        + numfmt2(vars[i][1][ii[i]  ]) + ','
        + numfmt2(vars[i][1][ii[i]+1]) + ')';
    }

    const s = sig[j];
    $(tr,'td').textContent = s.toFixed(2);
    $(tr,'td').textContent = s === 0 ? '—' :
      (100*sig_sys[j]/s).toFixed(2)+'%';
    $(tr,'td').textContent = s === 0 ? '—' :
      (100/Math.sqrt(s)).toFixed(2)+'%'; // √n/n = 1/√n

    let b = bkg[j];
    const prec = lumi.length === 2 ? 2 : 0;
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

    const purity = mig[j*nbins+j] / s;
    finite = Number.isFinite(purity);
    $(tr,'td',{style:{
      color: !finite ? null
           : purity < 0.4  ? '#CC0000'
           : purity < 0.5  ? '#FF6600'
           : purity < 0.75 ? '#000099'
           : '#006600'
    }}).textContent = finite ? (100*purity).toFixed(2)+'%' : '—';
  },...vars);

  fields.lumi.value = lumi[0];

  $id('data_lumi').textContent =
    lumi.length < 2 ? '' : `(scaled from ${lumi[1]} ifb)`;

  toggle_unc_cols();

  $id('run_time').textContent = state.resp.time + ' ms';

  draw_migration(state.resp);

  move_pane();
}

function draw_migration({migration:mig,vars,sig}) {
  const nbins = sig.length;
  const Len = 2**4 * 3**2 * 5, len = Len/nbins;
  let div = $id('mig');

  const last = div.lastElementChild;
  const empty = div.childElementCount < 2;
  const hide = !empty && last.style.display;
  if (!empty) last.remove();

  div = $(div,'div');
  const svg = $(div,'svg');

  const axis_w = 4;

  const style = { fill: '#000', 'font-size': '36px' };
  let text = $(svg,'g','text',{ style });
  text.textContent = 'Truth';
  let g = text.parentElement;
  let bbox = g.getBBox();
  $(g,{
    transform: `translate(${Len-bbox.width-2},${Len+bbox.height+2})`
  });
  const y_margin = bbox.height + axis_w + 2;

  text = $(svg,'g','text',{ style, transform: 'rotate(-90)' });
  text.textContent = 'Reco';
  g = text.parentElement;
  bbox = g.getBBox();
  $(g,{
    transform: `translate(${-axis_w-6},${bbox.height+2})`
  });
  const x_margin = bbox.width + axis_w + 2;

  $(svg,{
    viewBox:`${-x_margin} 0 ${Len+x_margin} ${Len+y_margin}`,
    style: { width: '300px' }
  });

  let k = 0;
  prod_loop((ii,i) => { // reco
    prod_loop((jj,j) => { // truth
      const m = mig[k]/sig[i];

      if (m > 0) $(svg,'rect',{
        x: len*j, y: Len-len*(i+1), width: len, height: len,
        fill: d3.interpolateGreens(1/-Math.log(mig[k]/sig[i]))
      });

      ++k;
    },...vars);
  },...vars);

  $(svg,'path',{ // axes
    d: `M ${-axis_w/2} 0 V ${Len+axis_w/2} H ${Len+axis_w/2}`,
    'stroke-width': axis_w,
    stroke: '#000',
    fill: 'none'
  });

  // hover
  const info = $(div,'div',['info']);
  const over = $(svg,'rect',{
    x: 0, y: 0, width: len-4, height: len-4,
    fill: 'none', stroke: '#C00', 'stroke-width': 4
  },['hide']);
  const pt = svg.createSVGPoint();
  let r1, t1;
  $(svg,{ events: {
    mousemove: e => {
      pt.x = e.clientX;
      pt.y = e.clientY;
      const {x,y} = pt.matrixTransform(svg.getScreenCTM().inverse());
      const t = Math.floor(x/len), r = Math.floor((Len-y)/len);
      if (t < 0 || r < 0 || t >= nbins || r >= nbins) {
        [over,info].forEach(x => $(x,['hide']));
        t1 = undefined;
        r1 = undefined;
      } else if (t !== t1 || r !== r1) {
        t1 = t;
        r1 = r;
        $(over,{ x: len*t+2, y: Len-len*(r+1)+2 });
        [over,info].forEach(x => $(x,['-hide']));

        const nvars = vars.length;
        const tt = split_index(t,vars,x => x[1].length-1);
        const rr = split_index(r,vars,x => x[1].length-1);

        clear(info);
        const table = $(info,'table');
        let tr = $(table,'tr');
        $(tr,'td');
        for (let i=0; i<nvars; ++i) {
          $(tr,'td').textContent = vars[i][0];
        }
        tr = $(table,'tr');
        $(tr,'td').textContent = 'Truth';
        for (let i=0; i<nvars; ++i) {
          $(tr,'td').textContent = '['
            + numfmt2(vars[i][1][tt[i]  ]) + ','
            + numfmt2(vars[i][1][tt[i]+1]) + ')';
        }
        tr = $(table,'tr');
        $(tr,'td').textContent = 'Reco';
        for (let i=0; i<nvars; ++i) {
          $(tr,'td').textContent = '['
            + numfmt2(vars[i][1][rr[i]  ]) + ','
            + numfmt2(vars[i][1][rr[i]+1]) + ')';
        }

        $(info,'p').textContent = `${mig[r*nbins+t]} MC events`;
      }
    },
    mouseleave: e => { [over,info].forEach(x => $(x,['hide'])); }
  }});

  if (hide) svg.style.display = 'none';

  // context menu
  { let menu = $id('mig_context');
    if (menu) menu.remove();
    menu = $(document.body,'div',{
      id: 'mig_context',
      style: { 'display': 'none' }
    },['context']);
    $(menu,'div',{ events: {
      click: e => {
        e.preventDefault();
        save_svg(svg);
      }
    }}).textContent = 'Save figure';

    svg.addEventListener('contextmenu', e => {
      e.preventDefault();
      $(menu,{ style: {
        top: `${e.clientY}px`, left: `${e.clientX}px`, display: null
      }});
    });
  }
}

function draw_myy_plot(bin_i) {
  // const hist = state.resp.hist;
  // console.log(hist);
  const div = clear($id('fit_plot'));
  const div_plot = $(div,'div');
  const div_info = $(div,'div');

  console.log(bin_i);

  move_pane();
}

function move_pane() {
  const left = $id('left');
  const pane = $id('pane');

  const mid_width = $id('mid').getBoundingClientRect().width;
  const pane_width = pane.getBoundingClientRect().width;
  const left_width = left.getBoundingClientRect().width;

  const to = $id(
    left_width + pane_width <= mid_width
    ? 'right' : 'mid-left'
  );
  const from = pane.parentElement;
  if (to !== from) to.appendChild(pane);
}

function save_svg(svg) {
  svg = svg.cloneNode(true);
  for (const x of svg.querySelectorAll('.hide')) x.remove();
  dummy_a.href = URL.createObjectURL(new Blob(
    [ '<?xml version="1.0" encoding="UTF-8"?>\n',
      svg.outerHTML
      // add xml namespace
      .replace(/^<svg\s*(?=[^>]*>)/,'<svg xmlns="'+svg.namespaceURI+'" ')
      // self-closing tags
      .replace(/<([^ <>\t]+)([^>]*)>\s*<\/\1>/g,'<$1$2/>')
      // terse style
      .replace(/(?<=style=")([^"]+)/g, (m,_1) => _1.replace(/\s*:\s*/g,':'))
      // hex colors
      .replace(/(?<=[:"])rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
        (m,_1,_2,_3) => [_1,_2,_3].reduce( (a,x) =>
          a+Math.round(parseFloat(x)).toString(16).padStart(2,'0'), '#')
      )
      // round translations
      .replace(/(?<=translate)\(([0-9.]+),([0-9.]+)\)/g,
        (m,_1,_2) => `(${round(parseFloat(_1))},${round(parseFloat(_2))})`
      )
    ],
    { type:"image/svg+xml;charset=utf-8" }
  ));
  dummy_a.download = 'migration_' +
    decodeURIComponent(window.location.search.match(/(?<=\?)[^&]+/))
    .replaceAll('/',' ') + '.svg';
  dummy_a.click();
}

function main() {
  const hide_contexts = () => {
    $q('body > .context', x => { x.style.display = 'none'; });
  };
  window.addEventListener('keydown', e => {
    switch (e.which || e.keyCode) {
      case 27:
        hide_contexts();
        break;
    }
  });
  window.addEventListener('click', hide_contexts);

  vars_names = Object.keys(binning).sort((a,b) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a < b ? -1 : (a > b ? 1 : 0);
  });

  window.addEventListener('popstate', (e) => {
    state = e.state;
    form_from_state();
    if ('resp' in state) process_resp();
  });

  // collect named form elements
  $q('form [name]', x => { fields[x.name] = x; });

  submit_on_enter(fields.lumi);

  form_table = $id('form_table');
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
  toggle_row_click(fields.click);

  // MxAODs
  const mxaods_div = $id('mxaods');
  mxaods_div.querySelector('.show').addEventListener('click', e => {
    let ul = mxaods_div.lastElementChild;
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
      }(mxaods_div,mxaods));
      ul.style.display = 'none';
    }
    if (ul.style.display) { // hidden, need to show
      ul.style.display = null;
      e.target.textContent = '[hide]';
    } else { // shown, need to hide
      ul.style.display = 'none';
      e.target.textContent = '[show]';
    }
    move_pane();
  });

  // migration
  const mig_div = $id('mig');
  mig_div.querySelector('.show').addEventListener('click', e => {
    const empty = mig_div.childElementCount < 2;
    if (empty) return;
    const style = mig_div.lastElementChild.style;
    if (style.display) { // hidden, need to show
      style.display = null;
      e.target.textContent = '[hide]';
    } else { // shown, need to hide
      style.display = 'none';
      e.target.textContent = '[show]';
    }
    move_pane();
  });

  // events
  for (const [name,f] of [
    ['unc', toggle_unc_cols],
    ['click', toggle_row_click]
  ]) {
    fields[name].addEventListener('change', e => {
      if (e.target.checked) state[name] = null;
      else delete state[name];
      f(e.target);
      url_from_state();
    });
  }

  main_table.addEventListener('click', e => {
    if (fields.click.checked && e.target.nodeName=='TD') {
      const i = e.target.parentElement.rowIndex;
      if (i >= 2) draw_myy_plot(i-2);
    }
  });

  const form = $q('form')[0];
  form.addEventListener('submit', function(e){
    e.preventDefault();
    try {
      const prev_state = Object.assign({},state);
      state_from_form();
      form_from_state();

      const form_elements = this.querySelectorAll('input,select,button');
      for (const x of form_elements) x.disabled = true;
      const loading = $id('loading');
      loading.style.removeProperty('display');
      $id('run_time').textContent = '';

      const enable = () => {
        for (const x of form_elements) x.disabled = false;
        loading.style.display = 'none';
      };

      fetch('req.php'+search_from_state(true),{
        referrer: location.origin + location.pathname
      })
      .then(resp => resp.json())
      .then(resp => {
        if ('error' in resp) {
          alert(resp.error);
        } else {
          state.resp = resp;
          url_from_state( // push if true, replace if false
            ( ('resp' in prev_state) &&
              (!!prev_state.lumi && state.lumi !== prev_state.lumi)
            ) || (
              JSON.stringify(     state.vars) !==
              JSON.stringify(prev_state.vars)
            )
          );
          process_resp();
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

  // Submit form when page is loaded
  if (vars_names.length) {
    form.dispatchEvent(
      new CustomEvent('submit', {cancelable: true})
    );
  } else {
    alert('No variables available');
  }
}
