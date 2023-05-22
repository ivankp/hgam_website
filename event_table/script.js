let state = { };

function main() {
  data.sort(
    (a,b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );
  for (const [name,vars] of data)
    vars.sort(
      (a,b) => a.toLowerCase().localeCompare(b.toLowerCase())
    );

  const form_dataset = $id('dataset');
  for (const [name] of data)
    $(form_dataset,'option').textContent = name;
  form_dataset.addEventListener('change', e => {
    state.ds = form_dataset.selectedIndex;
  });
  const dataset_vars = () => data[state.ds][1];

  const vars_table = clear($id('vars'));
  const add_var = (v=null) => {
    const tr = $(vars_table,'tr');
    const select = $(tr,'td','select');
    for (const name of dataset_vars()) {
      $(select,'option').textContent = name;
    }
    if (v!==null) select.selectedIndex = v;
    $(tr,'td','button',{events:{
      click: e => {
        e.preventDefault();
        tr.remove();
      }
    }}).textContent = '−';
  };
  $id('add_var').addEventListener('click',e => {
    e.preventDefault();
    add_var();
  });

  const cuts_table = $id('cuts');
  const add_cut = (c=null) => {
    const tr = $(cuts_table,'tr');
    const select = $(tr,'td','select');
    for (const name of dataset_vars()) {
      $(select,'option').textContent = name;
    }
    const cmp = $(tr,'td','button',{events:{
      click: e => {
        e.preventDefault();
        const button = e.target;
        button.textContent = button.textContent==='>' ? '<' : '>';
      }
    }});

    const val = $(tr,'td','input',{type:'text',size:5});

    $(tr,'td','button',{events:{
      click: e => {
        e.preventDefault();
        tr.remove();
      }
    }}).textContent = '−';

    if (c!==null) {
      select.selectedIndex = c[0];
      cmp.textContent = c[1] ? '>' : '<';
      val.value = c[2];
    } else cmp.textContent = '>';
  };
  $id('add_cut').addEventListener('click',e => {
    e.preventDefault();
    add_cut();
  });

  const state_from_url = () => {
    let q = location.search;
    if (q.startsWith('?')) q = q.slice(1);
    if (q.length) {
      for (const x of q.split('&')) {
        const i = x.indexOf('=');
        let [k,v] = i === -1 ? [ x, '' ] : [ x.slice(0,i), x.slice(i+1) ];
        if (k === 'ds') {
          const i = data.findIndex(x => x[0] === v);
          if (i!==-1) state[k] = i;
        } else if (['vars','cuts'].includes(k)) {
          if (v==null || v.length===0) continue;
          v = v.split('+').filter(x => x.length > 0);
          if (v.length > 0) state[k] = v;
        }
      }
    }
    if (!('ds' in state)) state.ds = 0;
    if (!('vars' in state))
      state.vars = ['m_yy','pT_yy','N_j_30','pT_j1_30'];
    if (!('cuts' in state)) {
      state.cuts = [['m_yy',1,121],['m_yy',0,129],['pT_yy',1,300]];
    } else {
      const n = 3, N = Math.floor(state.cuts.length/n);
      const cuts = new Array(N);
      for (let i=0, j=0; j<N; i+=n, ++j) {
        const cut = cuts[j] = state.cuts.slice(i,i+n);
        cut[1] = cut[1] === '0' ? 0 : 1;
        // const val = parseFloat(cut[2]);
        // cut[2] = Number.isNaN(val) ? '' : val;
      }
      state.cuts = cuts;
    }
  };
  const search_from_state = () => {
    return '?ds=' + data[state.ds][0]
         + '&vars=' + state.vars.join('+')
         + '&cuts=' + state.cuts.map(x => x.join('+')).join('+');
  };
  const url_from_state = (push=false) => {
    const url = location.origin + location.pathname + search_from_state();
    if (push) history.pushState(state,'',url);
    else history.replaceState(state,'',url);
  };
  const form_from_state = () => {
    form_dataset.selectedIndex = state.ds;
    for (const name of state.vars) {
      const i = dataset_vars().indexOf(name);
      if (i!==-1) add_var(i);
    }
    for (const [name,...x] of state.cuts) {
      const i = dataset_vars().indexOf(name);
      if (i!==-1) add_cut([i,...x]);
    }
  };
  const state_from_form = () => {
    const vars = dataset_vars();

    state.vars = $$(
      '#vars select',
      s => vars.indexOf(s.value)!==-1 ? s.value : null
    ).filter(x => x!==null);

    state.cuts = $$(
      '#cuts tr',
      tr => {
        const td = tr.children;
        const name = td[0].firstChild.value;
        if (vars.indexOf(name)===-1) return null;
        const val = parseFloat(td[2].firstChild.value);
        if (Number.isNaN(val))
          throw Error('invalid cut value for '+name);
        const gt = td[1].firstChild.textContent != '<' ? 1 : 0;
        return [ name, gt, val ];
      }
    ).filter(x => x!==null);

    { const name = form_dataset.value;
      let i = data.findIndex(x => x[0] === name);
      if (i===-1) i = 0;
      state.ds = i;
    }
  };

  const form = form_dataset.closest('form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    try {
      const prev_state = Object.assign({},state);
      state_from_form();

      const form_elements = form.querySelectorAll('input,select,button');
      for (const x of form_elements) x.disabled = true;
      const loading = $id('loading');
      loading.style.removeProperty('display');
      $id('run_time').textContent = '';

      clear($id('event_table'));

      const enable = () => {
        for (const x of form_elements) x.disabled = false;
        loading.style.display = 'none';
      };

      fetch('req.php'+search_from_state(),{
        referrer: location.origin + location.pathname
      })
      .then(resp => resp.json())
      .then(resp => {
        if ('error' in resp) {
          alert(resp.error);
        } else {
          state = Object.assign({},resp.selection);
          state.ds = data.findIndex(x => x[0] === state.ds);
          state.resp = resp;
          url_from_state( // push if true, replace if false
            JSON.stringify(     state.vars) !==
            JSON.stringify(prev_state.vars)
          );

          const events = resp.events;
          if (events.length) {
            const n = events[0].length;
            const has_float = events[0].map(x => false);
            for (const e of events) {
              let all_float = true;
              for (let i=0; i<n; ++i) {
                const x = has_float[i] ||= ( e[i] % 1 !== 0 );
                all_float &&= x;
              }
              if (all_float) break;
            }
            state.has_float = has_float;
          }

          $id('run_time').textContent = state.resp.time + ' ms';
          make_table_head();
          make_table();
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
      throw e;
    }
  });

  const table = $id('event_table');

  function sort_col(e) {
    const tds = this.parentElement.children;
    const i = Array.prototype.indexOf.call(tds, this);
    const is_asc = this.firstChild.classList.contains('asc');
    const events = state.resp.events;
    for (const td of tds) {
      const child = td.firstChild;
      if (['asc','desc'].some(x => child.classList.contains(x)))
        child.remove();
    }
    if (is_asc) {
      const svg = $(null,'svg',{viewBox:'0 0 6 6'},['desc']);
      $(svg,'path',{ d: 'M0 5H6L3 1Z', stroke: 'none', fill: 'black' });
      this.prepend(svg);
      events.sort((a,b) => b[i] - a[i]);
    } else {
      const svg = $(null,'svg',{viewBox:'0 0 6 6'},['asc']);
      $(svg,'path',{ d: 'M0 1H6L3 5Z', stroke: 'none', fill: 'black' })
      this.prepend(svg);
      events.sort((a,b) => a[i] - b[i]);
    }
    while (table.children.length > 1) table.lastChild.remove();
    make_table();
  }

  const make_table_head = () => {
    clear(table);
    let tr = $(table,'tr');
    let td = $(tr,'td',{events:{click:sort_col}});
    $(td,'svg',{viewBox:'0 0 6 6'},['asc'],'path',{
      d: 'M0 1H6L3 5Z', stroke: 'none', fill: 'black'
    });
    $(td,'span').textContent = 'Event #';
    for (let i=0; i<state.vars.length; ++i) {
      td = $(tr,'td',{events:{click:sort_col}});
      $(td,'span').textContent = state.vars[i];
    }
  };

  const make_table = () => {
    const events = state.resp.events;
    $id('event_count').textContent = `${events.length} events`;
    if (events.length) {
      const n = events[0].length;
      const has_float = state.has_float;
      for (const e of events) {
        const tr = $(table,'tr');
        for (let i=0; i<n; ++i) {
          const v = e[i];
          $(tr,'td').textContent = v === null
            ? '—'
            : has_float[i] ? v.toFixed(3) : v;
        }
      }
    }
  };

  state_from_url();
  url_from_state();
  form_from_state();
}
