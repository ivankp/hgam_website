const $id = id => document.getElementById(id);

const $ = (p,...args) => {
  if (p===null) {
    if (args[0].constructor !== String) throw new Error('expected tag name');
    p = document.createElement(args.shift());
  }
  for (let x of args) {
    if (x.constructor === String) {
      p = p.appendChild( (p instanceof SVGElement || x==='svg')
        ? document.createElementNS('http://www.w3.org/2000/svg',x)
        : document.createElement(x)
      );
    } else if (x.constructor === Array) {
      x = x.filter(x=>!!x);
      if (x.length) p.classList.add(...x);
    } else if (x.constructor === Object) {
      for (const [key,val] of Object.entries(x)) {
        if (key==='style') {
          for (const [skey,sval] of Object.entries(val)) {
            if (sval!==null)
              p.style[skey] = sval;
            else
              p.style.removeProperty(skey);
          }
        } else {
          if (p instanceof SVGElement)
            p.setAttributeNS(null,key,val);
          else
            p.setAttribute(key,val);
        }
      }
    }
  }
  return p;
};

const $q = (q,f=null) => {
  const xs = document.querySelectorAll(q);
  if (f!==null) for (const x of xs) f(x);
  return xs;
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
