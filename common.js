const $id = id => document.getElementById(id);

const $ = (p,...args) => {
  if (p===null) {
    const x = args.shift();
    if (x.constructor !== String) throw new Error('expected tag name');
    p = x==='svg'
      ? document.createElementNS('http://www.w3.org/2000/svg',x)
      : document.createElement(x);
  } else if (p.constructor === String) {
    p = (
      args[0] instanceof Element ? args.shift() : document.body
    ).querySelector(p);
  } else if (p.constructor === Array) {
    return p.map(x => $(x,...args));
  }
  for (let x of args) {
    if (x.constructor === String) {
      p = p.appendChild( (p instanceof SVGElement || x==='svg')
        ? document.createElementNS('http://www.w3.org/2000/svg',x)
        : document.createElement(x)
      );
    } else if (x.constructor === Array) {
      for (let c of x) {
        const rm = c[0] === '-';
        if (rm) c = c.substr(1);
        if (!!c) {
          if (rm) p.classList.remove(c);
          else p.classList.add(c);
        }
      }
    } else if (x.constructor === Object) {
      for (const [key,val] of Object.entries(x)) {
        if (key==='style') {
          for (const [skey,sval] of Object.entries(val)) {
            if (sval!==null)
              p.style[skey] = sval;
            else
              p.style.removeProperty(skey);
          }
        } else if (key==='events') {
          for (const [k,v] of Object.entries(val)) {
            if (v!==null)
              p.addEventListener(k,v);
            else
              p.removeEventListener(k);
          }
        } else {
          if (p instanceof SVGElement) {
            if (val!==null)
              p.setAttributeNS(null,key,val);
            else
              p.removeAttributeNS(null,key);
          } else {
            if (val!==null)
              p.setAttribute(key,val);
            else
              p.removeAttribute(key);
          }
        }
      }
    }
  }
  return p;
};

const $$ = (...args) => {
  const p = ( args[0] instanceof Element ? args.shift() : document.body );
  const q = args.shift();
  const f = args.shift();

  const xs = [ ...p.querySelectorAll(q) ];
  return f ? xs.map(f) : xs;
};

const clear = (x,n=0) => {
  while (x.childElementCount > n) x.lastChild.remove();
  return x;
};

document.addEventListener('DOMContentLoaded', () => {
  for (const a of document.querySelectorAll("nav a")) {
    if (page == a.pathname.replace(/^\/+|\/+$/g,'')) {
      a.parentElement.classList.add('active');
      break;
    }
  }
  if (typeof main === "function") main();
});
