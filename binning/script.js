let state = { }, fields = { };
let main_table, form_table;
let main_table_ncols;
let vars_names;
let data_dict, binning;

const dummy_a = document.createElement('a');

const round = (x,n) => x.toFixed(n).replace(/\.?0*$/,'');

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

const hide_contexts = () => {
  $$('.context', x => { x.style.display = 'none'; });
};

function state_from_url() {
  let xi = { };
  let q = location.search;
  if (q.startsWith('?')) q = q.slice(1);
  if (q.length) {
    for (const x of q.split('&')) {
      let i = x.indexOf('=');
      const [k,v] = i === -1 ? [ x, '' ] : [ x.slice(0,i), x.slice(i+1) ];
      if (['lumi','data','wd','wm'].includes(k)) {
        state[k] = v;
      } else if (['fitmc','unc','click'].includes(k)) {
        state[k] = null;
      } else if (k.match(/x[1-9]/)) {
        if (v==null || v.length==0) continue;
        const edges = v.split('+');
        if (!(edges[0] in xi))
          xi[edges[0]] = [
            parseInt(k.slice(1)),
            fix_edges(edges.slice(1)).map(numfmt)
          ];
      }
    }
  }

  for (const name of ['lumi','wd','wm']) {
    const x = parseFloat(state[name]);
    state[name] = Number.isNaN(x) ? '' : x;
  }

  if (!(state.data in data_dict))
    state.data = data[0][0];
  binning = data_dict[state.data];

  // collect selected variables or use default
  xi = Object.entries(xi);
  state.vars = (
    xi.length > 0
    ? xi.filter(x => x[0] in binning)
        .map(x => [x[1][0],x[0],x[1][1]])
        .sort()
        .map((x,i) => [x[1],x[2]])
    : [[
      'pT_yy' in binning ? 'pT_yy' : vars_names[0],
      []
    ]]
  );
}

function state_from_form() {
  const unique_vars = { };
  const form_vars = $$('form [name^="x"]');
  form_vars.sort((a,b) => {
    a = a.name;
    b = b.name;
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  const state_vars = [ ];
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
  state.vars = state_vars;

  for (const name of ['lumi','wd','wm']) {
    const x = parseFloat(fields[name].value);
    state[name] = Number.isNaN(x) ? '' : x;
  }
}

function search_from_state(req=false) {
  let search = '';
  const d = () => search.length===0 ? '?' : '&';

  for (const k of ['data','lumi','wd','wm']) {
    const v = state[k];
    if (v) search += d() + k + '=' + v;
  }

  for (let i=0; i<state.vars.length; ++i) {
    const [name,edges] = state.vars[i];
    search += d() + 'x' + (i+1) + '=' + name;
    for (const e of edges) search += '+' + e;
  }

  if (!req)
    for (const k of ['fitmc','unc','click'])
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
  for (const x of ['fitmc','unc','click'])
    fields[x].checked = x in state;

  for (const x of ['lumi','wd','wm'])
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

  const {
    vars, lumi, bkg, bkg_sys, sig, sig_sys, m_yy, migration: mig
  } = state.resp;

  if (vars === undefined || vars.length === 0) {
    console.log(state.resp);
    throw Error('no variables in response');
  }
  const nvars = vars.length;
  const nbins = sig.length;

  const mig_frac = [...mig];
  for (let r=0, k=0; r<nbins; ++r) {
    let sum = 0;
    for (let t=0; t<nbins; ++t, ++k)
      sum += mig_frac[k];
    for (let t=1; t<=nbins; ++t)
      mig_frac[k-t] /= sum;
  }

  for (let i=nvars; i--; ) {
    const v = vars[i];
    rows[0].prepend($(null,'td'));
    const td = $(null,'td',{style:{'font-size':'small'}});
    td.textContent = v[0];
    rows[1].prepend(td);
  }
  { rows[0].prepend($(null,'td'));
    const td = $(null,'td');
    td.textContent = 'Bin';
    rows[1].prepend(td);
  }

  prod_loop((ii,j) => {
    const tr = $(main_table,'tr');
    $(tr,'td').textContent = j+1;

    for (let i=0; i<nvars; ++i) {
      $(tr,'td',['left']).textContent = '['
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

    $(tr,'td').textContent = (100*bkg_sys[j]/b).toFixed(2)+'%';
    $(tr,'td').textContent = b === 0 ? '—' :
      (100/Math.sqrt(b)).toFixed(2)+'%'; // √n/n = 1/√n

    // significance
    let signif = s/Math.sqrt(s+b);
    let finite = Number.isFinite(signif);
    $(tr,'td',{style:{
      'font-weight': 'bold',
      color: !finite      ? null
           : signif < 1   ? '#CC0000'
           : signif < 2   ? '#FF6600'
           : signif < 2.3 ? '#000099'
           : '#006600'
    }}).textContent = signif.toFixed(2);

    signif = Math.sqrt(2*((s+b)*Math.log(1+s/b)-s));
    finite = Number.isFinite(signif);
    $(tr,'td',{style:{
      'font-weight': 'bold',
      color: !finite      ? null
           : signif < 1   ? '#CC0000'
           : signif < 2   ? '#FF6600'
           : signif < 2.3 ? '#000099'
           : '#006600'
    }}).textContent = finite ? signif.toFixed(2) : '—';

    $(tr,'td').textContent = (100*s/(s+b)).toFixed(2)+'%';

    const purity = mig_frac[j*nbins+j];
    finite = Number.isFinite(purity);
    $(tr,'td',{style:{
      color: !finite       ? null
           : purity < 0.4  ? '#CC0000'
           : purity < 0.5  ? '#FF6600'
           : purity < 0.75 ? '#000099'
           : '#006600'
    }}).textContent = finite ? (100*purity).toFixed(2)+'%' : '—';
  },...vars);

  fields.lumi.value = lumi[0];
  fields.wd.value = m_yy.bin_width.data;
  fields.wm.value = m_yy.bin_width.mc;

  $id('data_lumi').textContent =
    lumi.length < 2 ? '' : `(scaled from ${lumi[1]} ifb)`;

  toggle_unc_cols();

  $id('run_time').textContent = state.resp.time + ' ms';

  draw_migration(state.resp,mig_frac);

  move_pane();
}

function draw_migration({migration:mig,vars,sig},mig_frac) {
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

  const scale_n = 60;
  const scale_w = 50;
  const scale_h = Len/scale_n;
  const scale_l = 12;
  const scale_r = 71;

  { const g = $(svg,'g');
    const step = 1/(scale_n-1);
    for (let i=0; i<scale_n; ++i) {
      $(g,'rect',{
        x: Len+scale_l, y: scale_h*i,
        width: scale_w, height: scale_h+(scale_n-i===1 ? 0 : 2),
        fill: d3.interpolateGreens( (1-i*step) )
      });
    }
  }

  const width = Len + x_margin + scale_l + scale_w + scale_r;

  { const g = $(svg,'g',{ style: { 'font-size': '25px' } });
    const x = Len+scale_l+scale_w;
    for (const v of [1,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0.05,0.01,0.001]) {
      const y = (1-v**(1/Math.E))*Len;
      $(g,'line',{
        x1: x, x2: x+12, y1: y+1, y2: y+1,
        stroke: '#000', 'stroke-width': 2
      });
      const t = $(g,'text',{ x: x+5 });
      t.textContent = `${v*100}%`;
      $(t,{ y: y + 25 });
    }
  }

  $(div,{ style: { 'min-width': `${width/2.5}px` } });
  $(svg,{
    viewBox: `${-x_margin} 0 ${width} ${Len+y_margin}`,
    style: { 'font-family': 'Helvetica, Arial, sans-serif' }
  });

  { let k = 0;
    const g = $(svg,'g');
    prod_loop((rr,r) => { // reco
      prod_loop((tt,t) => { // truth
        const m = mig_frac[k];
        if (m > 0) $(g,'rect',{
          x: len*t, y: Len-len*(r+1), width: len, height: len,
          fill: d3.interpolateGreens( m**(1/Math.E) )
        });
        ++k;
      },...vars);
    },...vars);
  }

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
        $([over,info],['hide']);
        t1 = undefined;
        r1 = undefined;
      } else if (t !== t1 || r !== r1) {
        t1 = t;
        r1 = r;
        $(over,{ x: len*t+2, y: Len-len*(r+1)+2 });
        $([over,info],['-hide']);

        const nvars = vars.length;
        const tt = split_index(t,vars,x => x[1].length-1);
        const rr = split_index(r,vars,x => x[1].length-1);

        clear(info);
        const table = $(info,'table');
        let tr = $(table,'tr');
        $(tr,'td');
        $(tr,'td').textContent = 'Bin';
        for (let i=0; i<nvars; ++i) {
          $(tr,'td').textContent = vars[i][0];
        }
        tr = $(table,'tr');
        $(tr,'td').textContent = 'Truth';
        $(tr,'td').textContent = t+1;
        for (let i=0; i<nvars; ++i) {
          $(tr,'td').textContent = '['
            + numfmt2(vars[i][1][tt[i]  ]) + ','
            + numfmt2(vars[i][1][tt[i]+1]) + ')';
        }
        tr = $(table,'tr');
        $(tr,'td').textContent = 'Reco';
        $(tr,'td').textContent = r+1;
        for (let i=0; i<nvars; ++i) {
          $(tr,'td').textContent = '['
            + numfmt2(vars[i][1][rr[i]  ]) + ','
            + numfmt2(vars[i][1][rr[i]+1]) + ')';
        }

        $(info,'p').textContent = `Monte Carlo events: ${round(mig[r*nbins+t],3)}`;
        $(info,'p').textContent = 'Reco %: ' + (
          sig[r] !== 0 ? `${round(100*mig_frac[r*nbins+t],3)}%` : '—'
        );
      }
    },
    mouseleave: e => { $([over,info],['hide']); }
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
        save_svg(svg,'migration');
      }
    }}).textContent = 'Save figure';

    svg.addEventListener('contextmenu', e => {
      e.preventDefault();
      hide_contexts();
      $(menu,{ style: {
        top: `${e.clientY}px`, left: `${e.clientX}px`, display: null
      }});
    });
  }
}

function draw_myy_mc_plot(bin_i) {
  const div = clear($id('mc_plot'));

  const resp = state.resp;
  const bin = resp.hist_mc[bin_i];
  const plot = new Plot('#mc_plot',400,250,'white');
  const svg = plot.svg.node();

  const {fiducial,signal,bin_width:{mc:wm}} = resp.m_yy;

  plot.axes(
    { range: fiducial, padding: [33,10], label: 'm_yy [GeV]' },
    { range: [0,d3.max(bin.map(x => x[0]))*1.05], padding: [45,5], nice: true }
    // { range: plot.hist_yrange(bin.map(x => x[0]),true),
    //   padding: [45,5]
    // }
  );

  const hist_bin =
    x0 => ([w,w2],i) => [ x0+i*wm, x0+(i+1)*wm, w, Math.sqrt(w2) ];

  plot.hist(
    bin.map( hist_bin(fiducial[0]) )
  ).attrs({
    stroke: '#000099',
    'stroke-width': 2
  });

  // context menu
  { let menu = $id('mc_plot_context');
    if (menu) menu.remove();
    menu = $(document.body,'div',{
      id: 'mc_plot_context',
      style: { 'display': 'none' }
    },['context']);
    $(menu,'div',{ events: {
      click: e => {
        e.preventDefault();
        save_svg(svg,`myy_fit_bin${bin_i+1}`);
      }
    }}).textContent = 'Save figure';

    svg.addEventListener('contextmenu', e => {
      e.preventDefault();
      hide_contexts();
      $(menu,{ style: {
        top: `${e.clientY}px`, left: `${e.clientX}px`, display: null
      }});
    });
  }
}

function draw_myy_data_plot(bin_i) {
  const div = clear($id('data_plot'));

  const resp = state.resp;
  const bin = resp.hist[bin_i];
  const plot = new Plot('#data_plot',400,250,'white');
  const svg = plot.svg.node();

  const {fiducial,signal,bin_width:{data:wd}} = resp.m_yy;

  plot.axes(
    { range: fiducial, padding: [33,10], label: 'm_yy [GeV]' },
    { range: [0,d3.max(bin[0].concat(bin[1]))*1.05], padding: [45,5], nice: true }
  );

  const hist_bin = x0 => (x,i) => [ x0+i*wd, x0+(i+1)*wd, x, Math.sqrt(x) ];

  plot.hist(
    bin[0].map(
      hist_bin(fiducial[0])
    ).concat( bin[1].map(
      hist_bin(signal[1])
    ))
  ).attrs({
    stroke: '#000099',
    'stroke-width': 2
  });

  const fit = resp.fit[bin_i];

  plot.fcurve({
    f: x => {
      x -= 125;
      return Math.exp( fit.reduce((a,p,i) => a + p*x**i) );
    },
    a: fiducial[0], b: fiducial[1], n: 100
  }).attrs({
    stroke: 'red',
    fill: 'none',
    'stroke-width': 2,
    'stroke-opacity': 0.65
  });

  { let y = 20;
    const bb = split_index(bin_i,resp.vars,x => x[1].length-1);
    for (let i=0; i<bb.length; ++i) {
      const [name,edges] = resp.vars[i];
      const b = bb[i];
      $(svg,'text',{
        x: plot.scales[0](121), y,
        fill: '#000', 'font-family': 'sans-serif', 'font-size': '12px'
      }).textContent = name + ' \u2208 ['
        + numfmt2(edges[b  ]) + ','
        + numfmt2(edges[b+1]) + ')';
      y += 16;
    }
  }

  const info = $(div,'div',['info']);
  const num_fmt = x => x.toExponential(3)
    .replace(/^([^-])/,'&nbsp;$1')
    .replace(/(e[+-])([0-9])$/,'$10$2');

  const  params = resp.fit[bin_i];
  const nparams = params.length;

  $(info,'p',['bold']).textContent = `Bin ${bin_i+1}`;
  $(info,'p').textContent = 'x = m_yy - 125';
  { let eq = 'y = exp( ';
    for (let i=0; i<nparams; ++i) {
      if (i>0) eq += ' + ';
      eq += `c<sub>${i}</sub>`;
      if (i>0) eq += 'x';
      if (i>1) eq += `<sup>${i}</sup>`;
    }
    eq += ' )';
    $(info,'p').innerHTML = eq;
  }
  $(info,'p').innerHTML =
    'params: [&nbsp;' + resp.fit[bin_i].map(num_fmt).join(', ') + '&nbsp;]';

  { $(info,'p').textContent = 'covariance:';
    const cov = resp.cov[bin_i];
    const table = $(info,'table',{style:{'border-spacing':'1ch 1px'}});
    for (let i=0; i<nparams; ++i) {
      const tr = $(table,'tr');
      for (let j=0; j<nparams; ++j)
        $(tr,'td').innerHTML =
          num_fmt(cov[i < j ? j*(j+1)/2+i : i*(i+1)/2+j]);
    }
  }

  $(info,'p').innerHTML = `χ<sup>2</sup> = ${resp.chi2[bin_i]}`;

  move_pane();

  // context menu
  { let menu = $id('data_plot_context');
    if (menu) menu.remove();
    menu = $(document.body,'div',{
      id: 'data_plot_context',
      style: { 'display': 'none' }
    },['context']);
    $(menu,'div',{ events: {
      click: e => {
        e.preventDefault();
        save_svg(svg,`myy_fit_bin${bin_i+1}`);
      }
    }}).textContent = 'Save figure';

    svg.addEventListener('contextmenu', e => {
      e.preventDefault();
      hide_contexts();
      $(menu,{ style: {
        top: `${e.clientY}px`, left: `${e.clientX}px`, display: null
      }});
    });
  }
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

function save_svg(svg,prefix) {
  svg = svg.cloneNode(true);
  $$(svg,'.hide',x => x.remove());
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
        (m,_1,_2) => `(${round(parseFloat(_1),4)},${round(parseFloat(_2),4)})`
      )
    ],
    { type:"image/svg+xml;charset=utf-8" }
  ));
  dummy_a.download = prefix + search_from_state(true) + '.svg';
  dummy_a.click();
}

function main() {
  $(window,{ events: {
    keydown: e => {
      switch (e.which || e.keyCode) {
        case 27: // Esc
          hide_contexts();
          break;
      }
    },
    click: hide_contexts,
    popstate: e => {
      state = e.state;
      form_from_state();
      if ('resp' in state) process_resp();
    }
  }});

  // collect named form elements
  const form = $('form');
  $$(form,'[name]', x => { fields[x.name] = x; });

  submit_on_enter(fields.lumi);
  submit_on_enter(fields.wd);
  submit_on_enter(fields.wm);

  form_table = $id('form_table');
  main_table = $($id('main_table'),'table');

  data_dict = Object.fromEntries(data);

  // get state from url
  state_from_url();

  vars_names = Object.keys(binning).sort((a,b) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a < b ? -1 : (a > b ? 1 : 0);
  });

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
  $('.show',mxaods_div,{ events: { click: e => {
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
  }}});

  // migration
  const mig_div = $id('mig');
  $('.show',mig_div,{ events: { click: e => {
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
  }}});

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
  for (const name of ['fitmc']) {
    fields[name].addEventListener('change', e => {
      if (e.target.checked) state[name] = null;
      else delete state[name];
    });
  }

  main_table.addEventListener('click', e => {
    if (fields.click.checked && e.target.nodeName=='TD') {
      const i = e.target.parentElement.rowIndex;
      if (i >= 2) {
        draw_myy_data_plot(i-2);
        draw_myy_mc_plot(i-2);
      }
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    try {
      const prev_state = Object.assign({},state);
      state_from_form();
      form_from_state();

      const form_elements = form.querySelectorAll('input,select,button');
      for (const x of form_elements) x.disabled = true;
      const loading = $id('loading');
      loading.style.removeProperty('display');
      $id('run_time').textContent = '';

      clear($id('data_plot'));
      clear($id('mc_plot'));

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
              (!!prev_state.lumi && state.lumi !== prev_state.lumi) &&
              (!!prev_state.wd && state.wd !== prev_state.wd) &&
              (!!prev_state.wm && state.wm !== prev_state.wm)
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
