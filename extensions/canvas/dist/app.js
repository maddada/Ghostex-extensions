"use strict";
(() => {
  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n4, l7) {
    for (var u6 in l7) n4[u6] = l7[u6];
    return n4;
  }
  function b(n4) {
    n4 && n4.parentNode && n4.parentNode.removeChild(n4);
  }
  function k(l7, u6, t5) {
    var i5, r5, o5, e5 = {};
    for (o5 in u6) "key" == o5 ? i5 = u6[o5] : "ref" == o5 ? r5 = u6[o5] : e5[o5] = u6[o5];
    if (arguments.length > 2 && (e5.children = arguments.length > 3 ? n.call(arguments, 2) : t5), "function" == typeof l7 && null != l7.defaultProps) for (o5 in l7.defaultProps) void 0 === e5[o5] && (e5[o5] = l7.defaultProps[o5]);
    return x(l7, e5, i5, r5, null);
  }
  function x(n4, t5, i5, r5, o5) {
    var e5 = { type: n4, props: t5, key: i5, ref: r5, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o5 ? ++u : o5, __i: -1, __u: 0 };
    return null == o5 && null != l.vnode && l.vnode(e5), e5;
  }
  function S(n4) {
    return n4.children;
  }
  function C(n4, l7) {
    this.props = n4, this.context = l7;
  }
  function $(n4, l7) {
    if (null == l7) return n4.__ ? $(n4.__, n4.__i + 1) : null;
    for (var u6; l7 < n4.__k.length; l7++) if (null != (u6 = n4.__k[l7]) && null != u6.__e) return u6.__e;
    return "function" == typeof n4.type ? $(n4) : null;
  }
  function I(n4) {
    if (n4.__P && n4.__d) {
      var u6 = n4.__v, t5 = u6.__e, i5 = [], r5 = [], o5 = m({}, u6);
      o5.__v = u6.__v + 1, l.vnode && l.vnode(o5), q(n4.__P, o5, u6, n4.__n, n4.__P.namespaceURI, 32 & u6.__u ? [t5] : null, i5, null == t5 ? $(u6) : t5, !!(32 & u6.__u), r5), o5.__v = u6.__v, o5.__.__k[o5.__i] = o5, D(i5, o5, r5), u6.__e = u6.__ = null, o5.__e != t5 && P(o5);
    }
  }
  function P(n4) {
    if (null != (n4 = n4.__) && null != n4.__c) return n4.__e = n4.__c.base = null, n4.__k.some(function(l7) {
      if (null != l7 && null != l7.__e) return n4.__e = n4.__c.base = l7.__e;
    }), P(n4);
  }
  function A(n4) {
    (!n4.__d && (n4.__d = true) && i.push(n4) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n4, l7 = 1; i.length; ) i.length > l7 && i.sort(e), n4 = i.shift(), l7 = i.length, I(n4);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n4, l7, u6, t5, i5, r5, o5, e5, f7, c5, a5) {
    var s5, h5, p5, v6, y6, _6, g4 = t5 && t5.__k || w, m6 = l7.length;
    for (f7 = T(u6, l7, g4, f7, m6), s5 = 0; s5 < m6; s5++) null != (p5 = u6.__k[s5]) && (h5 = -1 != p5.__i && g4[p5.__i] || d, p5.__i = s5, _6 = q(n4, p5, h5, i5, r5, o5, e5, f7, c5, a5), v6 = p5.__e, p5.ref && h5.ref != p5.ref && (h5.ref && J(h5.ref, null, p5), a5.push(p5.ref, p5.__c || v6, p5)), null == y6 && null != v6 && (y6 = v6), 4 & p5.__u ? (f7 = j(p5, f7, n4), h5.__e && (h5.__e = null)) : "function" == typeof p5.type && void 0 !== _6 ? f7 = _6 : v6 && (f7 = v6.nextSibling), p5.__u &= -7);
    return u6.__e = y6, f7;
  }
  function T(n4, l7, u6, t5, i5) {
    var r5, o5, e5, f7, c5, a5 = u6.length, s5 = a5, h5 = 0;
    for (n4.__k = new Array(i5), r5 = 0; r5 < i5; r5++) null != (o5 = l7[r5]) && "boolean" != typeof o5 && "function" != typeof o5 ? ("string" == typeof o5 || "number" == typeof o5 || "bigint" == typeof o5 || o5.constructor == String ? o5 = n4.__k[r5] = x(null, o5, null, null, null) : g(o5) ? o5 = n4.__k[r5] = x(S, { children: o5 }, null, null, null) : void 0 === o5.constructor && o5.__b > 0 ? o5 = n4.__k[r5] = x(o5.type, o5.props, o5.key, o5.ref ? o5.ref : null, o5.__v) : n4.__k[r5] = o5, f7 = r5 + h5, o5.__ = n4, o5.__b = n4.__b + 1, e5 = null, -1 != (c5 = o5.__i = O(o5, u6, f7, s5)) && (s5--, (e5 = u6[c5]) && (e5.__u |= 2)), null == e5 || null == e5.__v ? (-1 == c5 && (i5 > a5 ? h5-- : i5 < a5 && h5++), "function" != typeof o5.type && (o5.__u |= 4)) : c5 != f7 && (c5 == f7 - 1 ? h5-- : c5 == f7 + 1 ? h5++ : (c5 > f7 ? h5-- : h5++, o5.__u |= 4))) : n4.__k[r5] = null;
    if (s5) for (r5 = 0; r5 < a5; r5++) null != (e5 = u6[r5]) && 0 == (2 & e5.__u) && (e5.__e == t5 && (t5 = $(e5)), K(e5, e5));
    return t5;
  }
  function j(n4, l7, u6) {
    var t5, i5;
    if ("function" == typeof n4.type) {
      for (t5 = n4.__k, i5 = 0; t5 && i5 < t5.length; i5++) t5[i5] && (t5[i5].__ = n4, l7 = j(t5[i5], l7, u6));
      return l7;
    }
    n4.__e != l7 && (l7 && n4.type && !l7.parentNode && (l7 = $(n4)), l7 = u6.insertBefore(n4.__e, l7 || null));
    do {
      l7 = l7 && l7.nextSibling;
    } while (null != l7 && 8 == l7.nodeType);
    return l7;
  }
  function O(n4, l7, u6, t5) {
    var i5, r5, o5, e5 = n4.key, f7 = n4.type, c5 = l7[u6], a5 = null != c5 && 0 == (2 & c5.__u);
    if (null === c5 && null == e5 || a5 && e5 == c5.key && f7 == c5.type) return u6;
    if (t5 > (a5 ? 1 : 0)) {
      for (i5 = u6 - 1, r5 = u6 + 1; i5 >= 0 || r5 < l7.length; ) if (null != (c5 = l7[o5 = i5 >= 0 ? i5-- : r5++]) && 0 == (2 & c5.__u) && e5 == c5.key && f7 == c5.type) return o5;
    }
    return -1;
  }
  function z(n4, l7, u6) {
    "-" == l7[0] ? n4.setProperty(l7, null == u6 ? "" : u6) : n4[l7] = null == u6 ? "" : "number" != typeof u6 || _.test(l7) ? u6 : u6 + "px";
  }
  function N(n4, l7, u6, t5, i5) {
    var r5, o5;
    n: if ("style" == l7) if ("string" == typeof u6) n4.style.cssText = u6;
    else {
      if ("string" == typeof t5 && (n4.style.cssText = t5 = ""), t5) for (l7 in t5) u6 && l7 in u6 || z(n4.style, l7, "");
      if (u6) for (l7 in u6) t5 && u6[l7] == t5[l7] || z(n4.style, l7, u6[l7]);
    }
    else if ("o" == l7[0] && "n" == l7[1]) r5 = l7 != (l7 = l7.replace(s, "$1")), o5 = l7.toLowerCase(), l7 = o5 in n4 || "onFocusOut" == l7 || "onFocusIn" == l7 ? o5.slice(2) : l7.slice(2), n4.l || (n4.l = {}), n4.l[l7 + r5] = u6, u6 ? t5 ? u6[a] = t5[a] : (u6[a] = h, n4.addEventListener(l7, r5 ? v : p, r5)) : n4.removeEventListener(l7, r5 ? v : p, r5);
    else {
      if ("http://www.w3.org/2000/svg" == i5) l7 = l7.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l7 && "height" != l7 && "href" != l7 && "list" != l7 && "form" != l7 && "tabIndex" != l7 && "download" != l7 && "rowSpan" != l7 && "colSpan" != l7 && "role" != l7 && "popover" != l7 && l7 in n4) try {
        n4[l7] = null == u6 ? "" : u6;
        break n;
      } catch (n5) {
      }
      "function" == typeof u6 || (null == u6 || false === u6 && "-" != l7[4] ? n4.removeAttribute(l7) : n4.setAttribute(l7, "popover" == l7 && 1 == u6 ? "" : u6));
    }
  }
  function V(n4) {
    return function(u6) {
      if (this.l) {
        var t5 = this.l[u6.type + n4];
        if (null == u6[c]) u6[c] = h++;
        else if (u6[c] < t5[a]) return;
        return t5(l.event ? l.event(u6) : u6);
      }
    };
  }
  function q(n4, u6, t5, i5, r5, o5, e5, f7, c5, a5) {
    var s5, h5, p5, v6, y6, d5, _6, k6, x5, M4, I5, P5, A6, H4, T6, j6, F4 = u6.type;
    if (void 0 !== u6.constructor) return null;
    128 & t5.__u && (c5 = !!(32 & t5.__u), o5 = [f7 = u6.__e = t5.__e]), (s5 = l.__b) && s5(u6);
    n: if ("function" == typeof F4) {
      h5 = e5.length;
      try {
        if (x5 = u6.props, M4 = F4.prototype && F4.prototype.render, I5 = (s5 = F4.contextType) && i5[s5.__c], P5 = s5 ? I5 ? I5.props.value : s5.__ : i5, t5.__c ? k6 = (p5 = u6.__c = t5.__c).__ = p5.__E : (M4 ? u6.__c = p5 = new F4(x5, P5) : (u6.__c = p5 = new C(x5, P5), p5.constructor = F4, p5.render = Q), I5 && I5.sub(p5), p5.state || (p5.state = {}), p5.__n = i5, v6 = p5.__d = true, p5.__h = [], p5._sb = []), M4 && null == p5.__s && (p5.__s = p5.state), M4 && null != F4.getDerivedStateFromProps && (p5.__s == p5.state && (p5.__s = m({}, p5.__s)), m(p5.__s, F4.getDerivedStateFromProps(x5, p5.__s))), y6 = p5.props, d5 = p5.state, p5.__v = u6, v6) M4 && null == F4.getDerivedStateFromProps && null != p5.componentWillMount && p5.componentWillMount(), M4 && null != p5.componentDidMount && p5.__h.push(p5.componentDidMount);
        else {
          if (M4 && null == F4.getDerivedStateFromProps && x5 !== y6 && null != p5.componentWillReceiveProps && p5.componentWillReceiveProps(x5, P5), u6.__v == t5.__v || !p5.__e && null != p5.shouldComponentUpdate && false === p5.shouldComponentUpdate(x5, p5.__s, P5)) {
            u6.__v != t5.__v && (p5.props = x5, p5.state = p5.__s, p5.__d = false), u6.__e = t5.__e, u6.__k = t5.__k, u6.__k.some(function(n5) {
              n5 && (n5.__ = u6);
            }), w.push.apply(p5.__h, p5._sb), p5._sb = [], p5.__h.length && e5.push(p5), f7 = $(t5);
            break n;
          }
          null != p5.componentWillUpdate && p5.componentWillUpdate(x5, p5.__s, P5), M4 && null != p5.componentDidUpdate && p5.__h.push(function() {
            p5.componentDidUpdate(y6, d5, _6);
          });
        }
        if (p5.context = P5, p5.props = x5, p5.__P = n4, p5.__e = false, A6 = l.__r, H4 = 0, M4) p5.state = p5.__s, p5.__d = false, A6 && A6(u6), s5 = p5.render(p5.props, p5.state, p5.context), w.push.apply(p5.__h, p5._sb), p5._sb = [];
        else do {
          p5.__d = false, A6 && A6(u6), s5 = p5.render(p5.props, p5.state, p5.context), p5.state = p5.__s;
        } while (p5.__d && ++H4 < 25);
        p5.state = p5.__s, null != p5.getChildContext && (i5 = m(m({}, i5), p5.getChildContext())), M4 && !v6 && null != p5.getSnapshotBeforeUpdate && (_6 = p5.getSnapshotBeforeUpdate(y6, d5)), T6 = null != s5 && s5.type === S && null == s5.key ? E(s5.props.children) : s5, f7 = L(n4, g(T6) ? T6 : [T6], u6, t5, i5, r5, o5, e5, f7, c5, a5), p5.base = u6.__e, u6.__u &= -161, p5.__h.length && e5.push(p5), k6 && (p5.__E = p5.__ = null);
      } catch (n5) {
        if (e5.length = h5, u6.__v = null, c5 || null != o5) {
          if (n5.then) {
            for (u6.__u |= c5 ? 160 : 128; f7 && 8 == f7.nodeType && f7.nextSibling; ) f7 = f7.nextSibling;
            null != o5 && (o5[o5.indexOf(f7)] = null), u6.__e = f7;
          } else if (null != o5) for (j6 = o5.length; j6--; ) b(o5[j6]);
        } else u6.__e = t5.__e;
        null == u6.__k && (u6.__k = t5.__k || []), n5.then || B(u6), l.__e(n5, u6, t5);
      }
    } else null == o5 && u6.__v == t5.__v ? (u6.__k = t5.__k, u6.__e = t5.__e) : f7 = u6.__e = G(t5.__e, u6, t5, i5, r5, o5, e5, c5, a5);
    return (s5 = l.diffed) && s5(u6), 128 & u6.__u ? void 0 : f7;
  }
  function B(n4) {
    n4 && (n4.__c && (n4.__c.__e = true), n4.__k && n4.__k.some(B));
  }
  function D(n4, u6, t5) {
    for (var i5 = 0; i5 < t5.length; i5++) J(t5[i5], t5[++i5], t5[++i5]);
    l.__c && l.__c(u6, n4), n4.some(function(u7) {
      try {
        n4 = u7.__h, u7.__h = [], n4.some(function(n5) {
          n5.call(u7);
        });
      } catch (n5) {
        l.__e(n5, u7.__v);
      }
    });
  }
  function E(n4) {
    return "object" != typeof n4 || null == n4 || n4.__b > 0 ? n4 : g(n4) ? n4.map(E) : void 0 !== n4.constructor ? null : m({}, n4);
  }
  function G(u6, t5, i5, r5, o5, e5, f7, c5, a5) {
    var s5, h5, p5, v6, y6, w5, _6, m6 = i5.props || d, k6 = t5.props, x5 = t5.type;
    if ("svg" == x5 ? o5 = "http://www.w3.org/2000/svg" : "math" == x5 ? o5 = "http://www.w3.org/1998/Math/MathML" : o5 || (o5 = "http://www.w3.org/1999/xhtml"), null != e5) {
      for (s5 = 0; s5 < e5.length; s5++) if ((y6 = e5[s5]) && "setAttribute" in y6 == !!x5 && (x5 ? y6.localName == x5 : 3 == y6.nodeType)) {
        u6 = y6, e5[s5] = null;
        break;
      }
    }
    if (null == u6) {
      if (null == x5) return document.createTextNode(k6);
      u6 = document.createElementNS(o5, x5, k6.is && k6), c5 && (l.__m && l.__m(t5, e5), c5 = false), e5 = null;
    }
    if (null == x5) m6 === k6 || c5 && u6.data == k6 || (u6.data = k6);
    else {
      if (e5 = "textarea" == x5 && null != k6.defaultValue ? null : e5 && n.call(u6.childNodes), !c5 && null != e5) for (m6 = {}, s5 = 0; s5 < u6.attributes.length; s5++) m6[(y6 = u6.attributes[s5]).name] = y6.value;
      for (s5 in m6) y6 = m6[s5], "dangerouslySetInnerHTML" == s5 ? p5 = y6 : "children" == s5 || s5 in k6 || "value" == s5 && "defaultValue" in k6 || "checked" == s5 && "defaultChecked" in k6 || N(u6, s5, null, y6, o5);
      for (s5 in k6) y6 = k6[s5], "children" == s5 ? v6 = y6 : "dangerouslySetInnerHTML" == s5 ? h5 = y6 : "value" == s5 ? w5 = y6 : "checked" == s5 ? _6 = y6 : c5 && "function" != typeof y6 || m6[s5] === y6 || N(u6, s5, y6, m6[s5], o5);
      if (h5) c5 || p5 && (h5.__html == p5.__html || h5.__html == u6.innerHTML) || (u6.innerHTML = h5.__html), t5.__k = [];
      else if (p5 && (u6.innerHTML = ""), L("template" == t5.type ? u6.content : u6, g(v6) ? v6 : [v6], t5, i5, r5, "foreignObject" == x5 ? "http://www.w3.org/1999/xhtml" : o5, e5, f7, e5 ? e5[0] : i5.__k && $(i5, 0), c5, a5), null != e5) for (s5 = e5.length; s5--; ) b(e5[s5]);
      c5 && "textarea" != x5 || (s5 = "value", "progress" == x5 && null == w5 ? u6.removeAttribute("value") : null != w5 && (w5 !== u6[s5] || "progress" == x5 && !w5 || "option" == x5 && w5 != m6[s5]) && N(u6, s5, w5, m6[s5], o5), s5 = "checked", null != _6 && _6 != u6[s5] && N(u6, s5, _6, m6[s5], o5));
    }
    return u6;
  }
  function J(n4, u6, t5) {
    try {
      if ("function" == typeof n4) {
        var i5 = "function" == typeof n4.__u;
        i5 && n4.__u(), i5 && null == u6 || (n4.__u = n4(u6));
      } else n4.current = u6;
    } catch (n5) {
      l.__e(n5, t5);
    }
  }
  function K(n4, u6, t5) {
    var i5, r5;
    if (l.unmount && l.unmount(n4), (i5 = n4.ref) && (i5.current && i5.current != n4.__e || J(i5, null, u6)), null != (i5 = n4.__c)) {
      if (i5.componentWillUnmount) try {
        i5.componentWillUnmount();
      } catch (n5) {
        l.__e(n5, u6);
      }
      i5.base = i5.__P = i5.__n = null;
    }
    if (i5 = n4.__k) for (r5 = 0; r5 < i5.length; r5++) i5[r5] && K(i5[r5], u6, t5 || "function" != typeof n4.type);
    t5 || b(n4.__e), n4.__c = n4.__ = n4.__e = void 0;
  }
  function Q(n4, l7, u6) {
    return this.constructor(n4, u6);
  }
  function R(u6, t5, i5) {
    var r5, o5, e5, f7;
    t5 == document && (t5 = document.documentElement), l.__ && l.__(u6, t5), o5 = (r5 = "function" == typeof i5) ? null : i5 && i5.__k || t5.__k, e5 = [], f7 = [], q(t5, u6 = (!r5 && i5 || t5).__k = k(S, null, [u6]), o5 || d, d, t5.namespaceURI, !r5 && i5 ? [i5] : o5 ? null : t5.firstChild ? n.call(t5.childNodes) : null, e5, !r5 && i5 ? i5 : o5 ? o5.__e : t5.firstChild, r5, f7), D(e5, u6, f7), u6.props.children = null;
  }
  n = w.slice, l = { __e: function(n4, l7, u6, t5) {
    for (var i5, r5, o5; l7 = l7.__; ) if ((i5 = l7.__c) && !i5.__) try {
      if ((r5 = i5.constructor) && null != r5.getDerivedStateFromError && (i5.setState(r5.getDerivedStateFromError(n4)), o5 = i5.__d), null != i5.componentDidCatch && (i5.componentDidCatch(n4, t5 || {}), o5 = i5.__d), o5) return i5.__E = i5;
    } catch (l8) {
      n4 = l8;
    }
    throw n4;
  } }, u = 0, t = function(n4) {
    return null != n4 && void 0 === n4.constructor;
  }, C.prototype.setState = function(n4, l7) {
    var u6;
    u6 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n4 && (n4 = n4(m({}, u6), this.props)), n4 && m(u6, n4), null != n4 && this.__v && (l7 && this._sb.push(l7), A(this));
  }, C.prototype.forceUpdate = function(n4) {
    this.__v && (this.__e = true, n4 && this.__h.push(n4), A(this));
  }, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n4, l7) {
    return n4.__v.__b - l7.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // node_modules/preact/hooks/dist/hooks.module.js
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = 0;
  var f2 = [];
  var c2 = l;
  var e2 = c2.__b;
  var a2 = c2.__r;
  var v2 = c2.diffed;
  var l2 = c2.__c;
  var m2 = c2.unmount;
  var p2 = c2.__;
  function s2(n4, t5) {
    c2.__h && c2.__h(r2, n4, o2 || t5), o2 = 0;
    var u6 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n4 >= u6.__.length && u6.__.push({}), u6.__[n4];
  }
  function d2(n4) {
    return o2 = 1, y2(D2, n4);
  }
  function y2(n4, u6, i5) {
    var o5 = s2(t2++, 2);
    if (o5.t = n4, !o5.__c && (o5.__ = [i5 ? i5(u6) : D2(void 0, u6), function(n5) {
      var t5 = o5.__N ? o5.__N[0] : o5.__[0], r5 = o5.t(t5, n5);
      t5 !== r5 && (o5.__N = [r5, o5.__[1]], o5.__c.setState({}));
    }], o5.__c = r2, !r2.__f)) {
      var f7 = function(n5, t5, r5) {
        if (!o5.__c.__H) return true;
        var u7 = false, i6 = o5.__c.props !== n5;
        if (o5.__c.__H.__.some(function(n6) {
          if (n6.__N) {
            u7 = true;
            var t6 = n6.__[0];
            n6.__ = n6.__N, n6.__N = void 0, t6 !== n6.__[0] && (i6 = true);
          }
        }), c5) {
          var f8 = c5.call(this, n5, t5, r5);
          return u7 ? f8 || i6 : f8;
        }
        return !u7 || i6;
      };
      r2.__f = true;
      var c5 = r2.shouldComponentUpdate, e5 = r2.componentWillUpdate;
      r2.componentWillUpdate = function(n5, t5, r5) {
        if (this.__e) {
          var u7 = c5;
          c5 = void 0, f7(n5, t5, r5), c5 = u7;
        }
        e5 && e5.call(this, n5, t5, r5);
      }, r2.shouldComponentUpdate = f7;
    }
    return o5.__N || o5.__;
  }
  function h2(n4, u6) {
    var i5 = s2(t2++, 3);
    !c2.__s && C2(i5.__H, u6) && (i5.__ = n4, i5.u = u6, r2.__H.__h.push(i5));
  }
  function _2(n4, u6) {
    var i5 = s2(t2++, 4);
    !c2.__s && C2(i5.__H, u6) && (i5.__ = n4, i5.u = u6, r2.__h.push(i5));
  }
  function A2(n4) {
    return o2 = 5, T2(function() {
      return { current: n4 };
    }, []);
  }
  function T2(n4, r5) {
    var u6 = s2(t2++, 7);
    return C2(u6.__H, r5) && (u6.__ = n4(), u6.__H = r5, u6.__h = n4), u6.__;
  }
  function q2(n4, t5) {
    return o2 = 8, T2(function() {
      return n4;
    }, t5);
  }
  function j2() {
    for (var n4; n4 = f2.shift(); ) {
      var t5 = n4.__H;
      if (n4.__P && t5) try {
        t5.__h.some(z2), t5.__h.some(B2), t5.__h = [];
      } catch (r5) {
        t5.__h = [], c2.__e(r5, n4.__v);
      }
    }
  }
  c2.__b = function(n4) {
    r2 = null, e2 && e2(n4);
  }, c2.__ = function(n4, t5) {
    n4 && t5.__k && t5.__k.__m && (n4.__m = t5.__k.__m), p2 && p2(n4, t5);
  }, c2.__r = function(n4) {
    a2 && a2(n4), t2 = 0;
    var i5 = (r2 = n4.__c).__H;
    i5 && (u2 === r2 ? (i5.__h = [], r2.__h = [], i5.__.some(function(n5) {
      n5.__N && (n5.__ = n5.__N), n5.u = n5.__N = void 0;
    })) : (i5.__h.some(z2), i5.__h.some(B2), i5.__h = [], t2 = 0)), u2 = r2;
  }, c2.diffed = function(n4) {
    v2 && v2(n4);
    var t5 = n4.__c;
    t5 && t5.__H && (t5.__H.__h.length && (1 !== f2.push(t5) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t5.__H.__.some(function(n5) {
      n5.u && (n5.__H = n5.u, n5.u = void 0);
    })), u2 = r2 = null;
  }, c2.__c = function(n4, t5) {
    t5.some(function(n5) {
      try {
        n5.__h.some(z2), n5.__h = n5.__h.filter(function(n6) {
          return !n6.__ || B2(n6);
        });
      } catch (r5) {
        t5.some(function(n6) {
          n6.__h && (n6.__h = []);
        }), t5 = [], c2.__e(r5, n5.__v);
      }
    }), l2 && l2(n4, t5);
  }, c2.unmount = function(n4) {
    m2 && m2(n4);
    var t5, r5 = n4.__c;
    r5 && r5.__H && (r5.__H.__.some(function(n5) {
      try {
        z2(n5);
      } catch (n6) {
        t5 = n6;
      }
    }), r5.__H = void 0, t5 && c2.__e(t5, r5.__v));
  };
  var k2 = "function" == typeof requestAnimationFrame;
  function w2(n4) {
    var t5, r5 = function() {
      clearTimeout(u6), k2 && cancelAnimationFrame(t5), setTimeout(n4);
    }, u6 = setTimeout(r5, 35);
    k2 && (t5 = requestAnimationFrame(r5));
  }
  function z2(n4) {
    var t5 = r2, u6 = n4.__c;
    "function" == typeof u6 && (n4.__c = void 0, u6()), r2 = t5;
  }
  function B2(n4) {
    var t5 = r2;
    n4.__c = n4.__(), r2 = t5;
  }
  function C2(n4, t5) {
    return !n4 || n4.length !== t5.length || t5.some(function(t6, r5) {
      return t6 !== n4[r5];
    });
  }
  function D2(n4, t5) {
    return "function" == typeof t5 ? t5(n4) : t5;
  }

  // src/stored.ts
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // src/background.ts
  var BACKGROUND_SCHEMA_VERSION = 1;
  function backgroundStorageKey(boardId) {
    return `background:${boardId}`;
  }
  var MAX_BACKGROUND_EDGE = 2048;
  var BACKGROUND_FORMAT = "image/webp";
  var BACKGROUND_QUALITY = 0.8;
  var IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
  var LOOK_CONTROLS = [
    { key: "contrast", label: "Contrast", min: 0, max: 200, neutral: 100 },
    { key: "brightness", label: "Brightness", min: 0, max: 200, neutral: 100 },
    { key: "saturation", label: "Saturation", min: 0, max: 200, neutral: 100 },
    { key: "opacity", label: "Opacity", min: 0, max: 100, neutral: 100 }
  ];
  var NEUTRAL_LOOK = Object.fromEntries(
    LOOK_CONTROLS.map((control) => [control.key, control.neutral])
  );
  function createBackground(image, look = NEUTRAL_LOOK) {
    return {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      image,
      contrast: look.contrast,
      brightness: look.brightness,
      saturation: look.saturation,
      opacity: look.opacity
    };
  }
  function adjustBackground(background, key, value) {
    const control = LOOK_CONTROLS.find((entry) => entry.key === key);
    if (!control || !Number.isFinite(value)) return background;
    const next = clamp(Math.round(value), control.min, control.max);
    return background[key] === next ? background : { ...background, [key]: next };
  }
  function resetLook(background) {
    return LOOK_CONTROLS.every((control) => background[control.key] === control.neutral) ? background : { ...background, ...NEUTRAL_LOOK };
  }
  function backgroundStyle(background) {
    return {
      filter: `contrast(${background.contrast}%) brightness(${background.brightness}%) saturate(${background.saturation}%)`,
      opacity: `${background.opacity / 100}`
    };
  }
  function readBackground(raw) {
    if (!isRecord(raw)) return null;
    const version = typeof raw["schemaVersion"] === "number" ? raw["schemaVersion"] : 0;
    if (version < 1) return null;
    const image = raw["image"];
    if (typeof image !== "string" || !isImageFile({ type: dataUrlType(image) })) return null;
    const background = createBackground(image);
    for (const control of LOOK_CONTROLS) {
      const value = raw[control.key];
      background[control.key] = typeof value === "number" && Number.isFinite(value) ? clamp(Math.round(value), control.min, control.max) : control.neutral;
    }
    return background;
  }
  function isImageFile(file) {
    return IMAGE_TYPES.includes(file.type);
  }
  async function shrinkImage(file, maxEdge = MAX_BACKGROUND_EDGE, quality = BACKGROUND_QUALITY) {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser cannot draw pictures.");
      context.drawImage(bitmap, 0, 0, width, height);
      return canvas.toDataURL(BACKGROUND_FORMAT, quality);
    } finally {
      bitmap.close();
    }
  }
  function dataUrlType(value) {
    return /^data:([a-z]+\/[a-z0-9.+-]+)[;,]/i.exec(value)?.[1]?.toLowerCase() ?? "";
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // src/bridge.ts
  function resolveBridge(host = globalThis.window) {
    const candidate = host?.ghostex;
    return candidate?.__bridgeVersion === 1 ? candidate : null;
  }
  var BRIDGE_GRACE_MS = 1500;
  var BRIDGE_POLL_MS = 25;
  var BRIDGE_HARD_CAP_MS = 6e3;
  function waitForBridge(host = globalThis.window, graceMs = BRIDGE_GRACE_MS) {
    const immediate = resolveBridge(host);
    if (immediate || !host) return Promise.resolve(immediate);
    return new Promise((resolve) => {
      let timer = null;
      let deadline = Date.now() + BRIDGE_HARD_CAP_MS;
      const settle = (bridge) => {
        if (timer !== null) clearTimeout(timer);
        host.removeEventListener("load", startGrace);
        resolve(bridge);
      };
      const look = () => {
        const bridge = resolveBridge(host);
        if (bridge) {
          settle(bridge);
          return;
        }
        if (Date.now() >= deadline) {
          settle(null);
          return;
        }
        timer = setTimeout(look, BRIDGE_POLL_MS);
      };
      function startGrace() {
        deadline = Math.min(deadline, Date.now() + graceMs);
      }
      if (host.document?.readyState === "complete") startGrace();
      else host.addEventListener("load", startGrace, { once: true });
      look();
    });
  }
  function readProject(context) {
    const path = text(context?.project?.path);
    const name = text(context?.project?.name);
    if (path.length === 0 && name.length === 0) return null;
    const id = path.length > 0 ? path : name;
    return { id, name: name.length > 0 ? name : projectLabel(id) };
  }
  function projectLabel(id) {
    return id.split("/").filter(Boolean).at(-1) ?? id;
  }
  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  // src/fonts.ts
  var FONTS = [
    {
      name: "caveat",
      label: "Caveat",
      hint: "hand-drawn",
      stack: '"Caveat", "Bradley Hand", "Segoe Print", cursive',
      bundled: true
    },
    {
      name: "inter",
      label: "Inter",
      hint: "sans",
      stack: '"Inter", ui-sans-serif, system-ui, sans-serif',
      bundled: true
    },
    {
      name: "lora",
      label: "Lora",
      hint: "serif",
      stack: '"Lora", ui-serif, Georgia, serif',
      bundled: true
    },
    {
      name: "jetbrains-mono",
      label: "JetBrains Mono",
      hint: "mono",
      stack: '"JetBrains Mono", ui-monospace, Menlo, monospace',
      bundled: true
    },
    {
      name: "system",
      label: "System",
      hint: "sans",
      stack: 'ui-sans-serif, -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
      bundled: false
    },
    {
      name: "system-serif",
      label: "System serif",
      hint: "serif",
      stack: 'ui-serif, Georgia, "Iowan Old Style", "Times New Roman", serif',
      bundled: false
    },
    {
      name: "system-mono",
      label: "System mono",
      hint: "mono",
      stack: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
      bundled: false
    }
  ];
  var DEFAULT_FONT = "system";
  var BY_NAME = Object.fromEntries(FONTS.map((font) => [font.name, font]));
  function isFontName(value) {
    return typeof value === "string" && value in BY_NAME;
  }
  function fontFor(name) {
    return BY_NAME[name];
  }
  function fontStack(name) {
    return fontFor(name).stack;
  }

  // src/viewport.ts
  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 8;
  var DEFAULT_VIEWPORT = Object.freeze({ x: 0, y: 0, zoom: 1 });
  var ZOOM_STEP = 1.1;
  var WHEEL_ZOOM_SENSITIVITY = 0.01;
  var MAX_WHEEL_ZOOM_DELTA = Math.log(ZOOM_STEP) / WHEEL_ZOOM_SENSITIVITY;
  function clampZoom(zoom) {
    if (!Number.isFinite(zoom)) return DEFAULT_VIEWPORT.zoom;
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  }
  function surfaceToWorld(viewport, point) {
    return {
      x: (point.x - viewport.x) / viewport.zoom,
      y: (point.y - viewport.y) / viewport.zoom
    };
  }
  function worldToSurface(viewport, point) {
    return {
      x: point.x * viewport.zoom + viewport.x,
      y: point.y * viewport.zoom + viewport.y
    };
  }
  function panBy(viewport, dx, dy) {
    return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
  }
  function zoomAt(viewport, anchor, zoom) {
    const nextZoom = clampZoom(zoom);
    if (nextZoom === viewport.zoom) return viewport;
    const world = surfaceToWorld(viewport, anchor);
    return {
      x: anchor.x - world.x * nextZoom,
      y: anchor.y - world.y * nextZoom,
      zoom: nextZoom
    };
  }
  function zoomByFactor(viewport, anchor, factor) {
    return zoomAt(viewport, anchor, viewport.zoom * factor);
  }
  function zoomInAt(viewport, anchor) {
    return zoomByFactor(viewport, anchor, ZOOM_STEP);
  }
  function zoomOutAt(viewport, anchor) {
    return zoomByFactor(viewport, anchor, 1 / ZOOM_STEP);
  }
  function zoomByWheel(viewport, anchor, deltaY) {
    const delta = Math.max(-MAX_WHEEL_ZOOM_DELTA, Math.min(MAX_WHEEL_ZOOM_DELTA, deltaY));
    return zoomByFactor(viewport, anchor, Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY));
  }
  function resetZoomAt(viewport, anchor) {
    return zoomAt(viewport, anchor, 1);
  }
  function fitToBounds(bounds, size, padding = 64) {
    if (!bounds || size.width <= 0 || size.height <= 0) return { ...DEFAULT_VIEWPORT };
    const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
    const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
    const usableWidth = Math.max(size.width - padding * 2, 1);
    const usableHeight = Math.max(size.height - padding * 2, 1);
    const zoom = clampZoom(Math.min(usableWidth / contentWidth, usableHeight / contentHeight));
    return {
      x: size.width / 2 - (bounds.minX + bounds.maxX) / 2 * zoom,
      y: size.height / 2 - (bounds.minY + bounds.maxY) / 2 * zoom,
      zoom
    };
  }
  function zoomPercent(zoom) {
    return Math.round(zoom * 100);
  }
  function sameViewport(a5, b5) {
    return a5.x === b5.x && a5.y === b5.y && a5.zoom === b5.zoom;
  }
  var GRID_WORLD_STEP = 24;
  var GRID_MIN_PX = 12;
  var GRID_MAX_PX = 96;
  function gridStep(zoom) {
    let step = GRID_WORLD_STEP * clampZoom(zoom);
    while (step < GRID_MIN_PX) step *= 2;
    while (step > GRID_MAX_PX) step /= 2;
    return step;
  }
  function wrap(value, step) {
    return (value % step + step) % step;
  }

  // src/board.ts
  var SCHEMA_VERSION = 5;
  var DEFAULT_BOARD_ID = "default";
  var NOTE_WIDTH = 208;
  var NOTE_HEIGHT = 160;
  var NOTE_MIN_WIDTH = 96;
  var NOTE_MIN_HEIGHT = 72;
  var NOTE_COLORS = ["butter", "apricot", "rose", "mint", "sky", "lilac"];
  var DEFAULT_NOTE_COLOR = "butter";
  var STROKE_COLORS = ["chalk", "coral", "amber", "sage", "azure", "violet"];
  var DEFAULT_STROKE_COLOR = "chalk";
  var STROKE_WIDTHS = ["fine", "medium", "bold"];
  var DEFAULT_STROKE_WIDTH = "medium";
  var STROKE_PX = { fine: 2, medium: 5, bold: 10 };
  var LABEL_PX = { fine: 16, medium: 24, bold: 36 };
  var SHAPE_KINDS = ["rectangle", "ellipse", "line", "arrow"];
  function isDrawn(item) {
    return item.type !== "note";
  }
  var RESIZE_HANDLES = ["nw", "ne", "sw", "se"];
  function boardStorageKey(id) {
    return `board:${id}`;
  }
  function createBoard(id = DEFAULT_BOARD_ID) {
    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      items: [],
      viewport: { ...DEFAULT_VIEWPORT }
    };
  }
  var idCounter = 0;
  function nextItemId() {
    idCounter += 1;
    return `n${Date.now().toString(36)}${idCounter.toString(36)}`;
  }
  function createNote(center, id = nextItemId(), color = DEFAULT_NOTE_COLOR) {
    return {
      id,
      type: "note",
      x: center.x - NOTE_WIDTH / 2,
      y: center.y - NOTE_HEIGHT / 2,
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
      text: "",
      color
    };
  }
  function createStroke(points, color, size, id = nextItemId()) {
    return { id, type: "stroke", points, color, size };
  }
  function createShape(shape, a5, b5, color, size, id = nextItemId(), seed = nextSeed()) {
    return { id, type: "shape", shape, a: { ...a5 }, b: { ...b5 }, color, size, seed };
  }
  function createLabel(at3, color, size, id = nextItemId()) {
    return { id, type: "text", x: at3.x, y: at3.y, text: "", color, size };
  }
  function nextSeed() {
    return 1 + Math.floor(Math.random() * 2 ** 31);
  }
  function nextNoteColor(color) {
    const index = NOTE_COLORS.indexOf(color);
    return NOTE_COLORS[(index + 1) % NOTE_COLORS.length] ?? DEFAULT_NOTE_COLOR;
  }
  function isNoteColor(value) {
    return typeof value === "string" && NOTE_COLORS.includes(value);
  }
  function isStrokeColor(value) {
    return typeof value === "string" && STROKE_COLORS.includes(value);
  }
  function isStrokeWidth(value) {
    return typeof value === "string" && STROKE_WIDTHS.includes(value);
  }
  function isShapeKind(value) {
    return typeof value === "string" && SHAPE_KINDS.includes(value);
  }
  function isUndoable(action) {
    switch (action.type) {
      case "board/loaded":
      case "viewport/changed":
        return false;
      case "item/added":
      case "item/edited":
      case "items/deleted":
      case "items/moved":
      case "note/colored":
      case "note/font":
      case "note/resized":
        return true;
    }
  }
  function boardReducer(state, action) {
    switch (action.type) {
      case "board/loaded":
        return action.document;
      case "viewport/changed": {
        const viewport = normalizeViewport(action.viewport, state.viewport);
        if (sameViewport(viewport, state.viewport)) return state;
        return { ...state, viewport };
      }
      case "item/added": {
        if (state.items.some((item) => item.id === action.item.id)) return state;
        return { ...state, items: [...state.items, action.item] };
      }
      case "item/edited":
        return replaceItem(state, action.id, (item) => {
          if (item.type !== "note" && item.type !== "text") return item;
          return item.text === action.text ? item : { ...item, text: action.text };
        });
      case "items/deleted": {
        const doomed = new Set(action.ids);
        const items = state.items.filter((item) => !doomed.has(item.id));
        if (items.length === state.items.length) return state;
        return { ...state, items };
      }
      case "items/moved": {
        const { dx, dy } = action;
        if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx === 0 && dy === 0) return state;
        const moving = new Set(action.ids);
        let changed = false;
        const items = state.items.map((item) => {
          if (!moving.has(item.id)) return item;
          changed = true;
          return translateItem(item, dx, dy);
        });
        return changed ? { ...state, items } : state;
      }
      case "note/resized":
        return replaceItem(state, action.id, (item) => {
          if (item.type !== "note") return item;
          const rect = clampRect(action.rect, item);
          return sameRect(item, rect) ? item : { ...item, ...rect };
        });
      case "note/colored": {
        const targets = new Set(action.ids);
        let changed = false;
        const items = state.items.map((item) => {
          if (item.type !== "note" || !targets.has(item.id) || item.color === action.color) {
            return item;
          }
          changed = true;
          return { ...item, color: action.color };
        });
        return changed ? { ...state, items } : state;
      }
      case "note/font": {
        const targets = new Set(action.ids);
        let changed = false;
        const items = state.items.map((item) => {
          if (item.type !== "note" || !targets.has(item.id) || (item.font ?? null) === action.font) {
            return item;
          }
          changed = true;
          return withFont(item, action.font);
        });
        return changed ? { ...state, items } : state;
      }
    }
  }
  function withFont(note, font) {
    const { font: _dropped, ...rest } = note;
    return font === null ? rest : { ...rest, font };
  }
  function resizeRect(start, handle, dx, dy) {
    const right = start.x + start.width;
    const bottom = start.y + start.height;
    const movesLeft = handle.endsWith("w");
    const movesTop = handle.startsWith("n");
    const x5 = movesLeft ? Math.min(start.x + dx, right - NOTE_MIN_WIDTH) : start.x;
    const y6 = movesTop ? Math.min(start.y + dy, bottom - NOTE_MIN_HEIGHT) : start.y;
    const width = movesLeft ? right - x5 : Math.max(start.width + dx, NOTE_MIN_WIDTH);
    const height = movesTop ? bottom - y6 : Math.max(start.height + dy, NOTE_MIN_HEIGHT);
    return { x: x5, y: y6, width, height };
  }
  function translateItem(item, dx, dy) {
    switch (item.type) {
      case "note":
      case "text":
        return { ...item, x: item.x + dx, y: item.y + dy };
      case "stroke":
        return { ...item, points: item.points.map(([x5, y6]) => [x5 + dx, y6 + dy]) };
      case "shape":
        return {
          ...item,
          a: { x: item.a.x + dx, y: item.a.y + dy },
          b: { x: item.b.x + dx, y: item.b.y + dy }
        };
    }
  }
  function toggleTask(text3, index) {
    if (!Number.isInteger(index) || index < 0) return text3;
    const lines = text3.split("\n");
    let fence2 = null;
    let seen = 0;
    for (let line = 0; line < lines.length; line += 1) {
      const source = lines[line] ?? "";
      const fenceMarker = CODE_FENCE.exec(source)?.[1];
      if (fenceMarker !== void 0) {
        if (fence2 === null) fence2 = fenceMarker;
        else if (fenceMarker[0] === fence2[0] && fenceMarker.length >= fence2.length) fence2 = null;
        continue;
      }
      if (fence2 !== null) continue;
      const task = TASK_LINE.exec(source);
      if (!task) continue;
      if (seen === index) {
        const checked = task[2] !== " ";
        lines[line] = source.replace(TASK_LINE, `$1${checked ? " " : "x"}$3`);
        return lines.join("\n");
      }
      seen += 1;
    }
    return text3;
  }
  var CODE_FENCE = /^ {0,3}(`{3,}|~{3,})/;
  var TASK_LINE = /^(\s*(?:>\s*)*(?:[-*+]|\d{1,9}[.)])\s+\[)([ xX])(\])/;
  var LABEL_CHAR_WIDTH = 0.62;
  var LABEL_LINE_HEIGHT = 1.3;
  function labelBounds(item) {
    const size = LABEL_PX[item.size];
    const lines = item.text.split("\n");
    const longest = lines.reduce((widest, line) => Math.max(widest, line.length), 1);
    return {
      x: item.x,
      y: item.y,
      width: longest * size * LABEL_CHAR_WIDTH,
      height: lines.length * size * LABEL_LINE_HEIGHT
    };
  }
  function itemBounds(item) {
    switch (item.type) {
      case "note":
        return { x: item.x, y: item.y, width: item.width, height: item.height };
      case "text":
        return labelBounds(item);
      case "stroke":
        return padded(pointsBounds(item.points.map(([x5, y6]) => ({ x: x5, y: y6 }))), STROKE_PX[item.size] / 2);
      case "shape":
        return padded(pointsBounds([item.a, item.b]), STROKE_PX[item.size] / 2);
    }
  }
  function boardBounds(items) {
    if (items.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const item of items) {
      const rect = itemBounds(item);
      minX = Math.min(minX, rect.x);
      minY = Math.min(minY, rect.y);
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }
    return { minX, minY, maxX, maxY };
  }
  function readBoard(raw, id = DEFAULT_BOARD_ID) {
    if (!isRecord(raw)) return createBoard(id);
    const storedVersion = typeof raw["schemaVersion"] === "number" ? raw["schemaVersion"] : 0;
    if (storedVersion < 1) return createBoard(id);
    return {
      schemaVersion: SCHEMA_VERSION,
      // A board read under one id keeps that id, whatever the stored copy claims:
      // storage keys, not documents, decide which board this is.
      id,
      // Version 1 items were `{ id, type }` placeholders with no geometry, so
      // there is nowhere on the board to put them: the migration drops them.
      items: storedVersion < 2 ? [] : readItems(raw["items"]),
      viewport: normalizeViewport(raw["viewport"], DEFAULT_VIEWPORT)
    };
  }
  function replaceItem(state, id, update) {
    const index = state.items.findIndex((item) => item.id === id);
    const current = state.items[index];
    if (!current) return state;
    const next = update(current);
    if (next === current) return state;
    const items = [...state.items];
    items[index] = next;
    return { ...state, items };
  }
  function clampRect(rect, fallback) {
    return {
      x: finiteOr(rect.x, fallback.x),
      y: finiteOr(rect.y, fallback.y),
      width: Math.max(finiteOr(rect.width, fallback.width), NOTE_MIN_WIDTH),
      height: Math.max(finiteOr(rect.height, fallback.height), NOTE_MIN_HEIGHT)
    };
  }
  function sameRect(a5, b5) {
    return a5.x === b5.x && a5.y === b5.y && a5.width === b5.width && a5.height === b5.height;
  }
  function pointsBounds(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  function padded(rect, by) {
    return {
      x: rect.x - by,
      y: rect.y - by,
      width: rect.width + by * 2,
      height: rect.height + by * 2
    };
  }
  function readItems(raw) {
    if (!Array.isArray(raw)) return [];
    const items = [];
    for (const stored of raw) {
      const item = readItem(stored);
      if (item) items.push(item);
    }
    return items;
  }
  function readItem(raw) {
    if (!isRecord(raw)) return null;
    const id = raw["id"];
    if (typeof id !== "string" || id.length === 0) return null;
    const color = isStrokeColor(raw["color"]) ? raw["color"] : DEFAULT_STROKE_COLOR;
    const size = isStrokeWidth(raw["size"]) ? raw["size"] : DEFAULT_STROKE_WIDTH;
    switch (raw["type"]) {
      case "note":
        return {
          id,
          type: "note",
          x: finiteOr(raw["x"], 0),
          y: finiteOr(raw["y"], 0),
          width: Math.max(finiteOr(raw["width"], NOTE_WIDTH), NOTE_MIN_WIDTH),
          height: Math.max(finiteOr(raw["height"], NOTE_HEIGHT), NOTE_MIN_HEIGHT),
          text: typeof raw["text"] === "string" ? raw["text"] : "",
          // Version 2 notes were all the same paper; they come back as the default.
          color: isNoteColor(raw["color"]) ? raw["color"] : DEFAULT_NOTE_COLOR,
          // Notes before version 5 had no font of their own, and a font that is
          // no longer on the list falls back the same way: to the default.
          ...isFontName(raw["font"]) ? { font: raw["font"] } : {}
        };
      case "stroke": {
        const points = readPoints(raw["points"]);
        if (points.length === 0) return null;
        return { id, type: "stroke", points, color, size };
      }
      case "shape": {
        if (!isShapeKind(raw["shape"])) return null;
        return {
          id,
          type: "shape",
          shape: raw["shape"],
          a: readPoint(raw["a"]),
          b: readPoint(raw["b"]),
          color,
          size,
          seed: Math.trunc(finiteOr(raw["seed"], 1))
        };
      }
      case "text":
        return {
          id,
          type: "text",
          x: finiteOr(raw["x"], 0),
          y: finiteOr(raw["y"], 0),
          text: typeof raw["text"] === "string" ? raw["text"] : "",
          color,
          size
        };
      default:
        return null;
    }
  }
  function readPoints(raw) {
    if (!Array.isArray(raw)) return [];
    const points = [];
    for (const entry of raw) {
      if (!Array.isArray(entry)) continue;
      const [x5, y6] = entry;
      if (typeof x5 !== "number" || typeof y6 !== "number") continue;
      if (!Number.isFinite(x5) || !Number.isFinite(y6)) continue;
      points.push([x5, y6]);
    }
    return points;
  }
  function readPoint(raw) {
    if (!isRecord(raw)) return { x: 0, y: 0 };
    return { x: finiteOr(raw["x"], 0), y: finiteOr(raw["y"], 0) };
  }
  function normalizeViewport(raw, fallback) {
    if (!isRecord(raw)) return { ...fallback };
    return {
      x: finiteOr(raw["x"], fallback.x),
      y: finiteOr(raw["y"], fallback.y),
      zoom: clampZoom(finiteOr(raw["zoom"], fallback.zoom))
    };
  }
  function finiteOr(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  // src/boards.ts
  var INDEX_SCHEMA_VERSION = 1;
  var BOARDS_STORAGE_KEY = "boards";
  var DEFAULT_BOARD_NAME = "Canvas";
  var MAX_BOARD_NAME_LENGTH = 60;
  var idCounter2 = 0;
  function nextBoardId() {
    idCounter2 += 1;
    return `b${Date.now().toString(36)}${idCounter2.toString(36)}`;
  }
  function createIndex() {
    return {
      schemaVersion: INDEX_SCHEMA_VERSION,
      boards: [{ id: DEFAULT_BOARD_ID, name: DEFAULT_BOARD_NAME, projectId: null }],
      lastOpen: DEFAULT_BOARD_ID
    };
  }
  function currentBoard(index) {
    return index.boards.find((board) => board.id === index.lastOpen) ?? firstBoard(index);
  }
  function boardForProject(index, projectId) {
    return index.boards.find((board) => board.projectId === projectId) ?? null;
  }
  function openBoard(index, id) {
    if (id === index.lastOpen || !index.boards.some((board) => board.id === id)) return index;
    return { ...index, lastOpen: id };
  }
  function addBoard(index, name, projectId = null, id = nextBoardId()) {
    const board = { id, name: cleanName(name), projectId };
    const boards = projectId === null ? index.boards : unlinkProject(index.boards, projectId);
    return {
      index: { ...index, boards: [...boards, board], lastOpen: board.id },
      board
    };
  }
  function renameBoard(index, id, name) {
    const cleaned = cleanName(name);
    return replaceBoard(
      index,
      id,
      (board) => board.name === cleaned ? board : { ...board, name: cleaned }
    );
  }
  function setBoardProject(index, id, projectId) {
    if (!index.boards.some((board) => board.id === id)) return index;
    const boards = projectId === null ? index.boards : unlinkProject(index.boards, projectId);
    return {
      ...index,
      boards: boards.map((board) => board.id === id ? { ...board, projectId } : board)
    };
  }
  function deleteBoard(index, id, replacementId = nextBoardId()) {
    const doomed = index.boards.findIndex((board) => board.id === id);
    if (doomed === -1) return index;
    const boards = index.boards.filter((board) => board.id !== id);
    if (boards.length === 0) {
      return {
        ...index,
        boards: [{ id: replacementId, name: DEFAULT_BOARD_NAME, projectId: null }],
        lastOpen: replacementId
      };
    }
    const neighbour = boards[Math.min(doomed, boards.length - 1)] ?? boards[0];
    const lastOpen = index.lastOpen === id ? neighbour?.id ?? "" : index.lastOpen;
    return { ...index, boards, lastOpen };
  }
  function readIndex(raw) {
    if (!isRecord(raw)) return createIndex();
    const version = typeof raw["schemaVersion"] === "number" ? raw["schemaVersion"] : 0;
    if (version < 1) return createIndex();
    const boards = readBoards(raw["boards"]);
    if (boards.length === 0) return createIndex();
    const lastOpen = typeof raw["lastOpen"] === "string" ? raw["lastOpen"] : "";
    return {
      schemaVersion: INDEX_SCHEMA_VERSION,
      boards,
      lastOpen: boards.some((board) => board.id === lastOpen) ? lastOpen : boards[0]?.id ?? ""
    };
  }
  function cleanName(name) {
    const trimmed = name.trim().slice(0, MAX_BOARD_NAME_LENGTH).trim();
    return trimmed.length > 0 ? trimmed : DEFAULT_BOARD_NAME;
  }
  function firstBoard(index) {
    return index.boards[0] ?? { id: DEFAULT_BOARD_ID, name: DEFAULT_BOARD_NAME, projectId: null };
  }
  function replaceBoard(index, id, update) {
    const position = index.boards.findIndex((board) => board.id === id);
    const current = index.boards[position];
    if (!current) return index;
    const next = update(current);
    if (next === current) return index;
    const boards = [...index.boards];
    boards[position] = next;
    return { ...index, boards };
  }
  function unlinkProject(boards, projectId) {
    return boards.map((board) => board.projectId === projectId ? { ...board, projectId: null } : board);
  }
  function readBoards(raw) {
    if (!Array.isArray(raw)) return [];
    const boards = [];
    const seen = /* @__PURE__ */ new Set();
    for (const entry of raw) {
      if (!isRecord(entry)) continue;
      const id = entry["id"];
      if (typeof id !== "string" || id.length === 0 || seen.has(id)) continue;
      seen.add(id);
      const name = entry["name"];
      const projectId = entry["projectId"];
      boards.push({
        id,
        name: typeof name === "string" ? cleanName(name) : DEFAULT_BOARD_NAME,
        projectId: typeof projectId === "string" && projectId.length > 0 ? projectId : null
      });
    }
    return boards;
  }

  // node_modules/roughjs/bundled/rough.esm.js
  function t3(t5, e5, s5) {
    if (t5 && t5.length) {
      const [n4, o5] = e5, a5 = Math.PI / 180 * s5, h5 = Math.cos(a5), r5 = Math.sin(a5);
      for (const e6 of t5) {
        const [t6, s6] = e6;
        e6[0] = (t6 - n4) * h5 - (s6 - o5) * r5 + n4, e6[1] = (t6 - n4) * r5 + (s6 - o5) * h5 + o5;
      }
    }
  }
  function e3(t5, e5) {
    return t5[0] === e5[0] && t5[1] === e5[1];
  }
  function s3(s5, n4, o5, a5 = 1) {
    const h5 = o5, r5 = Math.max(n4, 0.1), i5 = s5[0] && s5[0][0] && "number" == typeof s5[0][0] ? [s5] : s5, c5 = [0, 0];
    if (h5) for (const e5 of i5) t3(e5, c5, h5);
    const l7 = (function(t5, s6, n5) {
      const o6 = [];
      for (const s7 of t5) {
        const t6 = [...s7];
        e3(t6[0], t6[t6.length - 1]) || t6.push([t6[0][0], t6[0][1]]), t6.length > 2 && o6.push(t6);
      }
      const a6 = [];
      s6 = Math.max(s6, 0.1);
      const h6 = [];
      for (const t6 of o6) for (let e5 = 0; e5 < t6.length - 1; e5++) {
        const s7 = t6[e5], n6 = t6[e5 + 1];
        if (s7[1] !== n6[1]) {
          const t7 = Math.min(s7[1], n6[1]);
          h6.push({ ymin: t7, ymax: Math.max(s7[1], n6[1]), x: t7 === s7[1] ? s7[0] : n6[0], islope: (n6[0] - s7[0]) / (n6[1] - s7[1]) });
        }
      }
      if (h6.sort(((t6, e5) => t6.ymin < e5.ymin ? -1 : t6.ymin > e5.ymin ? 1 : t6.x < e5.x ? -1 : t6.x > e5.x ? 1 : t6.ymax === e5.ymax ? 0 : (t6.ymax - e5.ymax) / Math.abs(t6.ymax - e5.ymax))), !h6.length) return a6;
      let r6 = [], i6 = h6[0].ymin, c6 = 0;
      for (; r6.length || h6.length; ) {
        if (h6.length) {
          let t6 = -1;
          for (let e5 = 0; e5 < h6.length && !(h6[e5].ymin > i6); e5++) t6 = e5;
          h6.splice(0, t6 + 1).forEach(((t7) => {
            r6.push({ s: i6, edge: t7 });
          }));
        }
        if (r6 = r6.filter(((t6) => !(t6.edge.ymax <= i6))), r6.sort(((t6, e5) => t6.edge.x === e5.edge.x ? 0 : (t6.edge.x - e5.edge.x) / Math.abs(t6.edge.x - e5.edge.x))), (1 !== n5 || c6 % s6 == 0) && r6.length > 1) for (let t6 = 0; t6 < r6.length; t6 += 2) {
          const e5 = t6 + 1;
          if (e5 >= r6.length) break;
          const s7 = r6[t6].edge, n6 = r6[e5].edge;
          a6.push([[Math.round(s7.x), i6], [Math.round(n6.x), i6]]);
        }
        i6 += n5, r6.forEach(((t6) => {
          t6.edge.x = t6.edge.x + n5 * t6.edge.islope;
        })), c6++;
      }
      return a6;
    })(i5, r5, a5);
    if (h5) {
      for (const e5 of i5) t3(e5, c5, -h5);
      !(function(e5, s6, n5) {
        const o6 = [];
        e5.forEach(((t5) => o6.push(...t5))), t3(o6, s6, n5);
      })(l7, c5, -h5);
    }
    return l7;
  }
  function n2(t5, e5) {
    var n4;
    const o5 = e5.hachureAngle + 90;
    let a5 = e5.hachureGap;
    a5 < 0 && (a5 = 4 * e5.strokeWidth), a5 = Math.round(Math.max(a5, 0.1));
    let h5 = 1;
    return e5.roughness >= 1 && ((null === (n4 = e5.randomizer) || void 0 === n4 ? void 0 : n4.next()) || Math.random()) > 0.7 && (h5 = a5), s3(t5, a5, o5, h5 || 1);
  }
  var o3 = class {
    constructor(t5) {
      this.helper = t5;
    }
    fillPolygons(t5, e5) {
      return this._fillPolygons(t5, e5);
    }
    _fillPolygons(t5, e5) {
      const s5 = n2(t5, e5);
      return { type: "fillSketch", ops: this.renderLines(s5, e5) };
    }
    renderLines(t5, e5) {
      const s5 = [];
      for (const n4 of t5) s5.push(...this.helper.doubleLineOps(n4[0][0], n4[0][1], n4[1][0], n4[1][1], e5));
      return s5;
    }
  };
  function a3(t5) {
    const e5 = t5[0], s5 = t5[1];
    return Math.sqrt(Math.pow(e5[0] - s5[0], 2) + Math.pow(e5[1] - s5[1], 2));
  }
  var h3 = class extends o3 {
    fillPolygons(t5, e5) {
      let s5 = e5.hachureGap;
      s5 < 0 && (s5 = 4 * e5.strokeWidth), s5 = Math.max(s5, 0.1);
      const o5 = n2(t5, Object.assign({}, e5, { hachureGap: s5 })), h5 = Math.PI / 180 * e5.hachureAngle, r5 = [], i5 = 0.5 * s5 * Math.cos(h5), c5 = 0.5 * s5 * Math.sin(h5);
      for (const [t6, e6] of o5) a3([t6, e6]) && r5.push([[t6[0] - i5, t6[1] + c5], [...e6]], [[t6[0] + i5, t6[1] - c5], [...e6]]);
      return { type: "fillSketch", ops: this.renderLines(r5, e5) };
    }
  };
  var r3 = class extends o3 {
    fillPolygons(t5, e5) {
      const s5 = this._fillPolygons(t5, e5), n4 = Object.assign({}, e5, { hachureAngle: e5.hachureAngle + 90 }), o5 = this._fillPolygons(t5, n4);
      return s5.ops = s5.ops.concat(o5.ops), s5;
    }
  };
  var i3 = class {
    constructor(t5) {
      this.helper = t5;
    }
    fillPolygons(t5, e5) {
      const s5 = n2(t5, e5 = Object.assign({}, e5, { hachureAngle: 0 }));
      return this.dotsOnLines(s5, e5);
    }
    dotsOnLines(t5, e5) {
      const s5 = [];
      let n4 = e5.hachureGap;
      n4 < 0 && (n4 = 4 * e5.strokeWidth), n4 = Math.max(n4, 0.1);
      let o5 = e5.fillWeight;
      o5 < 0 && (o5 = e5.strokeWidth / 2);
      const h5 = n4 / 4;
      for (const r5 of t5) {
        const t6 = a3(r5), i5 = t6 / n4, c5 = Math.ceil(i5) - 1, l7 = t6 - c5 * n4, u6 = (r5[0][0] + r5[1][0]) / 2 - n4 / 4, p5 = Math.min(r5[0][1], r5[1][1]);
        for (let t7 = 0; t7 < c5; t7++) {
          const a5 = p5 + l7 + t7 * n4, r6 = u6 - h5 + 2 * Math.random() * h5, i6 = a5 - h5 + 2 * Math.random() * h5, c6 = this.helper.ellipse(r6, i6, o5, o5, e5);
          s5.push(...c6.ops);
        }
      }
      return { type: "fillSketch", ops: s5 };
    }
  };
  var c3 = class {
    constructor(t5) {
      this.helper = t5;
    }
    fillPolygons(t5, e5) {
      const s5 = n2(t5, e5);
      return { type: "fillSketch", ops: this.dashedLine(s5, e5) };
    }
    dashedLine(t5, e5) {
      const s5 = e5.dashOffset < 0 ? e5.hachureGap < 0 ? 4 * e5.strokeWidth : e5.hachureGap : e5.dashOffset, n4 = e5.dashGap < 0 ? e5.hachureGap < 0 ? 4 * e5.strokeWidth : e5.hachureGap : e5.dashGap, o5 = [];
      return t5.forEach(((t6) => {
        const h5 = a3(t6), r5 = Math.floor(h5 / (s5 + n4)), i5 = (h5 + n4 - r5 * (s5 + n4)) / 2;
        let c5 = t6[0], l7 = t6[1];
        c5[0] > l7[0] && (c5 = t6[1], l7 = t6[0]);
        const u6 = Math.atan((l7[1] - c5[1]) / (l7[0] - c5[0]));
        for (let t7 = 0; t7 < r5; t7++) {
          const a5 = t7 * (s5 + n4), h6 = a5 + s5, r6 = [c5[0] + a5 * Math.cos(u6) + i5 * Math.cos(u6), c5[1] + a5 * Math.sin(u6) + i5 * Math.sin(u6)], l8 = [c5[0] + h6 * Math.cos(u6) + i5 * Math.cos(u6), c5[1] + h6 * Math.sin(u6) + i5 * Math.sin(u6)];
          o5.push(...this.helper.doubleLineOps(r6[0], r6[1], l8[0], l8[1], e5));
        }
      })), o5;
    }
  };
  var l3 = class {
    constructor(t5) {
      this.helper = t5;
    }
    fillPolygons(t5, e5) {
      const s5 = e5.hachureGap < 0 ? 4 * e5.strokeWidth : e5.hachureGap, o5 = e5.zigzagOffset < 0 ? s5 : e5.zigzagOffset, a5 = n2(t5, e5 = Object.assign({}, e5, { hachureGap: s5 + o5 }));
      return { type: "fillSketch", ops: this.zigzagLines(a5, o5, e5) };
    }
    zigzagLines(t5, e5, s5) {
      const n4 = [];
      return t5.forEach(((t6) => {
        const o5 = a3(t6), h5 = Math.round(o5 / (2 * e5));
        let r5 = t6[0], i5 = t6[1];
        r5[0] > i5[0] && (r5 = t6[1], i5 = t6[0]);
        const c5 = Math.atan((i5[1] - r5[1]) / (i5[0] - r5[0]));
        for (let t7 = 0; t7 < h5; t7++) {
          const o6 = 2 * t7 * e5, a5 = 2 * (t7 + 1) * e5, h6 = Math.sqrt(2 * Math.pow(e5, 2)), i6 = [r5[0] + o6 * Math.cos(c5), r5[1] + o6 * Math.sin(c5)], l7 = [r5[0] + a5 * Math.cos(c5), r5[1] + a5 * Math.sin(c5)], u6 = [i6[0] + h6 * Math.cos(c5 + Math.PI / 4), i6[1] + h6 * Math.sin(c5 + Math.PI / 4)];
          n4.push(...this.helper.doubleLineOps(i6[0], i6[1], u6[0], u6[1], s5), ...this.helper.doubleLineOps(u6[0], u6[1], l7[0], l7[1], s5));
        }
      })), n4;
    }
  };
  var u3 = {};
  var p3 = class {
    constructor(t5) {
      this.seed = t5;
    }
    next() {
      return this.seed ? (2 ** 31 - 1 & (this.seed = Math.imul(48271, this.seed))) / 2 ** 31 : Math.random();
    }
  };
  var f3 = 0;
  var d3 = 1;
  var g2 = 2;
  var M = { A: 7, a: 7, C: 6, c: 6, H: 1, h: 1, L: 2, l: 2, M: 2, m: 2, Q: 4, q: 4, S: 4, s: 4, T: 2, t: 2, V: 1, v: 1, Z: 0, z: 0 };
  function k3(t5, e5) {
    return t5.type === e5;
  }
  function b2(t5) {
    const e5 = [], s5 = (function(t6) {
      const e6 = new Array();
      for (; "" !== t6; ) if (t6.match(/^([ \t\r\n,]+)/)) t6 = t6.substr(RegExp.$1.length);
      else if (t6.match(/^([aAcChHlLmMqQsStTvVzZ])/)) e6[e6.length] = { type: f3, text: RegExp.$1 }, t6 = t6.substr(RegExp.$1.length);
      else {
        if (!t6.match(/^(([-+]?[0-9]+(\.[0-9]*)?|[-+]?\.[0-9]+)([eE][-+]?[0-9]+)?)/)) return [];
        e6[e6.length] = { type: d3, text: `${parseFloat(RegExp.$1)}` }, t6 = t6.substr(RegExp.$1.length);
      }
      return e6[e6.length] = { type: g2, text: "" }, e6;
    })(t5);
    let n4 = "BOD", o5 = 0, a5 = s5[o5];
    for (; !k3(a5, g2); ) {
      let h5 = 0;
      const r5 = [];
      if ("BOD" === n4) {
        if ("M" !== a5.text && "m" !== a5.text) return b2("M0,0" + t5);
        o5++, h5 = M[a5.text], n4 = a5.text;
      } else k3(a5, d3) ? h5 = M[n4] : (o5++, h5 = M[a5.text], n4 = a5.text);
      if (!(o5 + h5 < s5.length)) throw new Error("Path data ended short");
      for (let t6 = o5; t6 < o5 + h5; t6++) {
        const e6 = s5[t6];
        if (!k3(e6, d3)) throw new Error("Param not a number: " + n4 + "," + e6.text);
        r5[r5.length] = +e6.text;
      }
      if ("number" != typeof M[n4]) throw new Error("Bad segment: " + n4);
      {
        const t6 = { key: n4, data: r5 };
        e5.push(t6), o5 += h5, a5 = s5[o5], "M" === n4 && (n4 = "L"), "m" === n4 && (n4 = "l");
      }
    }
    return e5;
  }
  function y3(t5) {
    let e5 = 0, s5 = 0, n4 = 0, o5 = 0;
    const a5 = [];
    for (const { key: h5, data: r5 } of t5) switch (h5) {
      case "M":
        a5.push({ key: "M", data: [...r5] }), [e5, s5] = r5, [n4, o5] = r5;
        break;
      case "m":
        e5 += r5[0], s5 += r5[1], a5.push({ key: "M", data: [e5, s5] }), n4 = e5, o5 = s5;
        break;
      case "L":
        a5.push({ key: "L", data: [...r5] }), [e5, s5] = r5;
        break;
      case "l":
        e5 += r5[0], s5 += r5[1], a5.push({ key: "L", data: [e5, s5] });
        break;
      case "C":
        a5.push({ key: "C", data: [...r5] }), e5 = r5[4], s5 = r5[5];
        break;
      case "c": {
        const t6 = r5.map(((t7, n5) => n5 % 2 ? t7 + s5 : t7 + e5));
        a5.push({ key: "C", data: t6 }), e5 = t6[4], s5 = t6[5];
        break;
      }
      case "Q":
        a5.push({ key: "Q", data: [...r5] }), e5 = r5[2], s5 = r5[3];
        break;
      case "q": {
        const t6 = r5.map(((t7, n5) => n5 % 2 ? t7 + s5 : t7 + e5));
        a5.push({ key: "Q", data: t6 }), e5 = t6[2], s5 = t6[3];
        break;
      }
      case "A":
        a5.push({ key: "A", data: [...r5] }), e5 = r5[5], s5 = r5[6];
        break;
      case "a":
        e5 += r5[5], s5 += r5[6], a5.push({ key: "A", data: [r5[0], r5[1], r5[2], r5[3], r5[4], e5, s5] });
        break;
      case "H":
        a5.push({ key: "H", data: [...r5] }), e5 = r5[0];
        break;
      case "h":
        e5 += r5[0], a5.push({ key: "H", data: [e5] });
        break;
      case "V":
        a5.push({ key: "V", data: [...r5] }), s5 = r5[0];
        break;
      case "v":
        s5 += r5[0], a5.push({ key: "V", data: [s5] });
        break;
      case "S":
        a5.push({ key: "S", data: [...r5] }), e5 = r5[2], s5 = r5[3];
        break;
      case "s": {
        const t6 = r5.map(((t7, n5) => n5 % 2 ? t7 + s5 : t7 + e5));
        a5.push({ key: "S", data: t6 }), e5 = t6[2], s5 = t6[3];
        break;
      }
      case "T":
        a5.push({ key: "T", data: [...r5] }), e5 = r5[0], s5 = r5[1];
        break;
      case "t":
        e5 += r5[0], s5 += r5[1], a5.push({ key: "T", data: [e5, s5] });
        break;
      case "Z":
      case "z":
        a5.push({ key: "Z", data: [] }), e5 = n4, s5 = o5;
    }
    return a5;
  }
  function m3(t5) {
    const e5 = [];
    let s5 = "", n4 = 0, o5 = 0, a5 = 0, h5 = 0, r5 = 0, i5 = 0;
    for (const { key: c5, data: l7 } of t5) {
      switch (c5) {
        case "M":
          e5.push({ key: "M", data: [...l7] }), [n4, o5] = l7, [a5, h5] = l7;
          break;
        case "C":
          e5.push({ key: "C", data: [...l7] }), n4 = l7[4], o5 = l7[5], r5 = l7[2], i5 = l7[3];
          break;
        case "L":
          e5.push({ key: "L", data: [...l7] }), [n4, o5] = l7;
          break;
        case "H":
          n4 = l7[0], e5.push({ key: "L", data: [n4, o5] });
          break;
        case "V":
          o5 = l7[0], e5.push({ key: "L", data: [n4, o5] });
          break;
        case "S": {
          let t6 = 0, a6 = 0;
          "C" === s5 || "S" === s5 ? (t6 = n4 + (n4 - r5), a6 = o5 + (o5 - i5)) : (t6 = n4, a6 = o5), e5.push({ key: "C", data: [t6, a6, ...l7] }), r5 = l7[0], i5 = l7[1], n4 = l7[2], o5 = l7[3];
          break;
        }
        case "T": {
          const [t6, a6] = l7;
          let h6 = 0, c6 = 0;
          "Q" === s5 || "T" === s5 ? (h6 = n4 + (n4 - r5), c6 = o5 + (o5 - i5)) : (h6 = n4, c6 = o5);
          const u6 = n4 + 2 * (h6 - n4) / 3, p5 = o5 + 2 * (c6 - o5) / 3, f7 = t6 + 2 * (h6 - t6) / 3, d5 = a6 + 2 * (c6 - a6) / 3;
          e5.push({ key: "C", data: [u6, p5, f7, d5, t6, a6] }), r5 = h6, i5 = c6, n4 = t6, o5 = a6;
          break;
        }
        case "Q": {
          const [t6, s6, a6, h6] = l7, c6 = n4 + 2 * (t6 - n4) / 3, u6 = o5 + 2 * (s6 - o5) / 3, p5 = a6 + 2 * (t6 - a6) / 3, f7 = h6 + 2 * (s6 - h6) / 3;
          e5.push({ key: "C", data: [c6, u6, p5, f7, a6, h6] }), r5 = t6, i5 = s6, n4 = a6, o5 = h6;
          break;
        }
        case "A": {
          const t6 = Math.abs(l7[0]), s6 = Math.abs(l7[1]), a6 = l7[2], h6 = l7[3], r6 = l7[4], i6 = l7[5], c6 = l7[6];
          if (0 === t6 || 0 === s6) e5.push({ key: "C", data: [n4, o5, i6, c6, i6, c6] }), n4 = i6, o5 = c6;
          else if (n4 !== i6 || o5 !== c6) {
            x2(n4, o5, i6, c6, t6, s6, a6, h6, r6).forEach((function(t7) {
              e5.push({ key: "C", data: t7 });
            })), n4 = i6, o5 = c6;
          }
          break;
        }
        case "Z":
          e5.push({ key: "Z", data: [] }), n4 = a5, o5 = h5;
      }
      s5 = c5;
    }
    return e5;
  }
  function w3(t5, e5, s5) {
    return [t5 * Math.cos(s5) - e5 * Math.sin(s5), t5 * Math.sin(s5) + e5 * Math.cos(s5)];
  }
  function x2(t5, e5, s5, n4, o5, a5, h5, r5, i5, c5) {
    const l7 = (u6 = h5, Math.PI * u6 / 180);
    var u6;
    let p5 = [], f7 = 0, d5 = 0, g4 = 0, M4 = 0;
    if (c5) [f7, d5, g4, M4] = c5;
    else {
      [t5, e5] = w3(t5, e5, -l7), [s5, n4] = w3(s5, n4, -l7);
      const h6 = (t5 - s5) / 2, c6 = (e5 - n4) / 2;
      let u7 = h6 * h6 / (o5 * o5) + c6 * c6 / (a5 * a5);
      u7 > 1 && (u7 = Math.sqrt(u7), o5 *= u7, a5 *= u7);
      const p6 = o5 * o5, k7 = a5 * a5, b6 = p6 * k7 - p6 * c6 * c6 - k7 * h6 * h6, y7 = p6 * c6 * c6 + k7 * h6 * h6, m7 = (r5 === i5 ? -1 : 1) * Math.sqrt(Math.abs(b6 / y7));
      g4 = m7 * o5 * c6 / a5 + (t5 + s5) / 2, M4 = m7 * -a5 * h6 / o5 + (e5 + n4) / 2, f7 = Math.asin(parseFloat(((e5 - M4) / a5).toFixed(9))), d5 = Math.asin(parseFloat(((n4 - M4) / a5).toFixed(9))), t5 < g4 && (f7 = Math.PI - f7), s5 < g4 && (d5 = Math.PI - d5), f7 < 0 && (f7 = 2 * Math.PI + f7), d5 < 0 && (d5 = 2 * Math.PI + d5), i5 && f7 > d5 && (f7 -= 2 * Math.PI), !i5 && d5 > f7 && (d5 -= 2 * Math.PI);
    }
    let k6 = d5 - f7;
    if (Math.abs(k6) > 120 * Math.PI / 180) {
      const t6 = d5, e6 = s5, r6 = n4;
      d5 = i5 && d5 > f7 ? f7 + 120 * Math.PI / 180 * 1 : f7 + 120 * Math.PI / 180 * -1, p5 = x2(s5 = g4 + o5 * Math.cos(d5), n4 = M4 + a5 * Math.sin(d5), e6, r6, o5, a5, h5, 0, i5, [d5, t6, g4, M4]);
    }
    k6 = d5 - f7;
    const b5 = Math.cos(f7), y6 = Math.sin(f7), m6 = Math.cos(d5), P5 = Math.sin(d5), v6 = Math.tan(k6 / 4), S5 = 4 / 3 * o5 * v6, O4 = 4 / 3 * a5 * v6, L5 = [t5, e5], T6 = [t5 + S5 * y6, e5 - O4 * b5], D5 = [s5 + S5 * P5, n4 - O4 * m6], A6 = [s5, n4];
    if (T6[0] = 2 * L5[0] - T6[0], T6[1] = 2 * L5[1] - T6[1], c5) return [T6, D5, A6].concat(p5);
    {
      p5 = [T6, D5, A6].concat(p5);
      const t6 = [];
      for (let e6 = 0; e6 < p5.length; e6 += 3) {
        const s6 = w3(p5[e6][0], p5[e6][1], l7), n5 = w3(p5[e6 + 1][0], p5[e6 + 1][1], l7), o6 = w3(p5[e6 + 2][0], p5[e6 + 2][1], l7);
        t6.push([s6[0], s6[1], n5[0], n5[1], o6[0], o6[1]]);
      }
      return t6;
    }
  }
  var P2 = { randOffset: function(t5, e5) {
    return G2(t5, e5);
  }, randOffsetWithRange: function(t5, e5, s5) {
    return E2(t5, e5, s5);
  }, ellipse: function(t5, e5, s5, n4, o5) {
    const a5 = T3(s5, n4, o5);
    return D3(t5, e5, o5, a5).opset;
  }, doubleLineOps: function(t5, e5, s5, n4, o5) {
    return $2(t5, e5, s5, n4, o5, true);
  } };
  function v3(t5, e5, s5, n4, o5) {
    return { type: "path", ops: $2(t5, e5, s5, n4, o5) };
  }
  function S2(t5, e5, s5) {
    const n4 = (t5 || []).length;
    if (n4 > 2) {
      const o5 = [];
      for (let e6 = 0; e6 < n4 - 1; e6++) o5.push(...$2(t5[e6][0], t5[e6][1], t5[e6 + 1][0], t5[e6 + 1][1], s5));
      return e5 && o5.push(...$2(t5[n4 - 1][0], t5[n4 - 1][1], t5[0][0], t5[0][1], s5)), { type: "path", ops: o5 };
    }
    return 2 === n4 ? v3(t5[0][0], t5[0][1], t5[1][0], t5[1][1], s5) : { type: "path", ops: [] };
  }
  function O2(t5, e5, s5, n4, o5) {
    return (function(t6, e6) {
      return S2(t6, true, e6);
    })([[t5, e5], [t5 + s5, e5], [t5 + s5, e5 + n4], [t5, e5 + n4]], o5);
  }
  function L2(t5, e5) {
    if (t5.length) {
      const s5 = "number" == typeof t5[0][0] ? [t5] : t5, n4 = j3(s5[0], 1 * (1 + 0.2 * e5.roughness), e5), o5 = e5.disableMultiStroke ? [] : j3(s5[0], 1.5 * (1 + 0.22 * e5.roughness), z3(e5));
      for (let t6 = 1; t6 < s5.length; t6++) {
        const a5 = s5[t6];
        if (a5.length) {
          const t7 = j3(a5, 1 * (1 + 0.2 * e5.roughness), e5), s6 = e5.disableMultiStroke ? [] : j3(a5, 1.5 * (1 + 0.22 * e5.roughness), z3(e5));
          for (const e6 of t7) "move" !== e6.op && n4.push(e6);
          for (const t8 of s6) "move" !== t8.op && o5.push(t8);
        }
      }
      return { type: "path", ops: n4.concat(o5) };
    }
    return { type: "path", ops: [] };
  }
  function T3(t5, e5, s5) {
    const n4 = Math.sqrt(2 * Math.PI * Math.sqrt((Math.pow(t5 / 2, 2) + Math.pow(e5 / 2, 2)) / 2)), o5 = Math.ceil(Math.max(s5.curveStepCount, s5.curveStepCount / Math.sqrt(200) * n4)), a5 = 2 * Math.PI / o5;
    let h5 = Math.abs(t5 / 2), r5 = Math.abs(e5 / 2);
    const i5 = 1 - s5.curveFitting;
    return h5 += G2(h5 * i5, s5), r5 += G2(r5 * i5, s5), { increment: a5, rx: h5, ry: r5 };
  }
  function D3(t5, e5, s5, n4) {
    const [o5, a5] = F(n4.increment, t5, e5, n4.rx, n4.ry, 1, n4.increment * E2(0.1, E2(0.4, 1, s5), s5), s5);
    let h5 = q3(o5, null, s5);
    if (!s5.disableMultiStroke && 0 !== s5.roughness) {
      const [o6] = F(n4.increment, t5, e5, n4.rx, n4.ry, 1.5, 0, s5), a6 = q3(o6, null, s5);
      h5 = h5.concat(a6);
    }
    return { estimatedPoints: a5, opset: { type: "path", ops: h5 } };
  }
  function A3(t5, e5, s5, n4, o5, a5, h5, r5, i5) {
    const c5 = t5, l7 = e5;
    let u6 = Math.abs(s5 / 2), p5 = Math.abs(n4 / 2);
    u6 += G2(0.01 * u6, i5), p5 += G2(0.01 * p5, i5);
    let f7 = o5, d5 = a5;
    for (; f7 < 0; ) f7 += 2 * Math.PI, d5 += 2 * Math.PI;
    d5 - f7 > 2 * Math.PI && (f7 = 0, d5 = 2 * Math.PI);
    const g4 = 2 * Math.PI / i5.curveStepCount, M4 = Math.min(g4 / 2, (d5 - f7) / 2), k6 = V2(M4, c5, l7, u6, p5, f7, d5, 1, i5);
    if (!i5.disableMultiStroke) {
      const t6 = V2(M4, c5, l7, u6, p5, f7, d5, 1.5, i5);
      k6.push(...t6);
    }
    return h5 && (r5 ? k6.push(...$2(c5, l7, c5 + u6 * Math.cos(f7), l7 + p5 * Math.sin(f7), i5), ...$2(c5, l7, c5 + u6 * Math.cos(d5), l7 + p5 * Math.sin(d5), i5)) : k6.push({ op: "lineTo", data: [c5, l7] }, { op: "lineTo", data: [c5 + u6 * Math.cos(f7), l7 + p5 * Math.sin(f7)] })), { type: "path", ops: k6 };
  }
  function _3(t5, e5) {
    const s5 = m3(y3(b2(t5))), n4 = [];
    let o5 = [0, 0], a5 = [0, 0];
    for (const { key: t6, data: h5 } of s5) switch (t6) {
      case "M":
        a5 = [h5[0], h5[1]], o5 = [h5[0], h5[1]];
        break;
      case "L":
        n4.push(...$2(a5[0], a5[1], h5[0], h5[1], e5)), a5 = [h5[0], h5[1]];
        break;
      case "C": {
        const [t7, s6, o6, r5, i5, c5] = h5;
        n4.push(...Z(t7, s6, o6, r5, i5, c5, a5, e5)), a5 = [i5, c5];
        break;
      }
      case "Z":
        n4.push(...$2(a5[0], a5[1], o5[0], o5[1], e5)), a5 = [o5[0], o5[1]];
    }
    return { type: "path", ops: n4 };
  }
  function I2(t5, e5) {
    const s5 = [];
    for (const n4 of t5) if (n4.length) {
      const t6 = e5.maxRandomnessOffset || 0, o5 = n4.length;
      if (o5 > 2) {
        s5.push({ op: "move", data: [n4[0][0] + G2(t6, e5), n4[0][1] + G2(t6, e5)] });
        for (let a5 = 1; a5 < o5; a5++) s5.push({ op: "lineTo", data: [n4[a5][0] + G2(t6, e5), n4[a5][1] + G2(t6, e5)] });
      }
    }
    return { type: "fillPath", ops: s5 };
  }
  function C3(t5, e5) {
    return (function(t6, e6) {
      let s5 = t6.fillStyle || "hachure";
      if (!u3[s5]) switch (s5) {
        case "zigzag":
          u3[s5] || (u3[s5] = new h3(e6));
          break;
        case "cross-hatch":
          u3[s5] || (u3[s5] = new r3(e6));
          break;
        case "dots":
          u3[s5] || (u3[s5] = new i3(e6));
          break;
        case "dashed":
          u3[s5] || (u3[s5] = new c3(e6));
          break;
        case "zigzag-line":
          u3[s5] || (u3[s5] = new l3(e6));
          break;
        default:
          s5 = "hachure", u3[s5] || (u3[s5] = new o3(e6));
      }
      return u3[s5];
    })(e5, P2).fillPolygons(t5, e5);
  }
  function z3(t5) {
    const e5 = Object.assign({}, t5);
    return e5.randomizer = void 0, t5.seed && (e5.seed = t5.seed + 1), e5;
  }
  function W(t5) {
    return t5.randomizer || (t5.randomizer = new p3(t5.seed || 0)), t5.randomizer.next();
  }
  function E2(t5, e5, s5, n4 = 1) {
    return s5.roughness * n4 * (W(s5) * (e5 - t5) + t5);
  }
  function G2(t5, e5, s5 = 1) {
    return E2(-t5, t5, e5, s5);
  }
  function $2(t5, e5, s5, n4, o5, a5 = false) {
    const h5 = a5 ? o5.disableMultiStrokeFill : o5.disableMultiStroke, r5 = R2(t5, e5, s5, n4, o5, true, false);
    if (h5) return r5;
    const i5 = R2(t5, e5, s5, n4, o5, true, true);
    return r5.concat(i5);
  }
  function R2(t5, e5, s5, n4, o5, a5, h5) {
    const r5 = Math.pow(t5 - s5, 2) + Math.pow(e5 - n4, 2), i5 = Math.sqrt(r5);
    let c5 = 1;
    c5 = i5 < 200 ? 1 : i5 > 500 ? 0.4 : -16668e-7 * i5 + 1.233334;
    let l7 = o5.maxRandomnessOffset || 0;
    l7 * l7 * 100 > r5 && (l7 = i5 / 10);
    const u6 = l7 / 2, p5 = 0.2 + 0.2 * W(o5);
    let f7 = o5.bowing * o5.maxRandomnessOffset * (n4 - e5) / 200, d5 = o5.bowing * o5.maxRandomnessOffset * (t5 - s5) / 200;
    f7 = G2(f7, o5, c5), d5 = G2(d5, o5, c5);
    const g4 = [], M4 = () => G2(u6, o5, c5), k6 = () => G2(l7, o5, c5), b5 = o5.preserveVertices;
    return a5 && (h5 ? g4.push({ op: "move", data: [t5 + (b5 ? 0 : M4()), e5 + (b5 ? 0 : M4())] }) : g4.push({ op: "move", data: [t5 + (b5 ? 0 : G2(l7, o5, c5)), e5 + (b5 ? 0 : G2(l7, o5, c5))] })), h5 ? g4.push({ op: "bcurveTo", data: [f7 + t5 + (s5 - t5) * p5 + M4(), d5 + e5 + (n4 - e5) * p5 + M4(), f7 + t5 + 2 * (s5 - t5) * p5 + M4(), d5 + e5 + 2 * (n4 - e5) * p5 + M4(), s5 + (b5 ? 0 : M4()), n4 + (b5 ? 0 : M4())] }) : g4.push({ op: "bcurveTo", data: [f7 + t5 + (s5 - t5) * p5 + k6(), d5 + e5 + (n4 - e5) * p5 + k6(), f7 + t5 + 2 * (s5 - t5) * p5 + k6(), d5 + e5 + 2 * (n4 - e5) * p5 + k6(), s5 + (b5 ? 0 : k6()), n4 + (b5 ? 0 : k6())] }), g4;
  }
  function j3(t5, e5, s5) {
    if (!t5.length) return [];
    const n4 = [];
    n4.push([t5[0][0] + G2(e5, s5), t5[0][1] + G2(e5, s5)]), n4.push([t5[0][0] + G2(e5, s5), t5[0][1] + G2(e5, s5)]);
    for (let o5 = 1; o5 < t5.length; o5++) n4.push([t5[o5][0] + G2(e5, s5), t5[o5][1] + G2(e5, s5)]), o5 === t5.length - 1 && n4.push([t5[o5][0] + G2(e5, s5), t5[o5][1] + G2(e5, s5)]);
    return q3(n4, null, s5);
  }
  function q3(t5, e5, s5) {
    const n4 = t5.length, o5 = [];
    if (n4 > 3) {
      const a5 = [], h5 = 1 - s5.curveTightness;
      o5.push({ op: "move", data: [t5[1][0], t5[1][1]] });
      for (let e6 = 1; e6 + 2 < n4; e6++) {
        const s6 = t5[e6];
        a5[0] = [s6[0], s6[1]], a5[1] = [s6[0] + (h5 * t5[e6 + 1][0] - h5 * t5[e6 - 1][0]) / 6, s6[1] + (h5 * t5[e6 + 1][1] - h5 * t5[e6 - 1][1]) / 6], a5[2] = [t5[e6 + 1][0] + (h5 * t5[e6][0] - h5 * t5[e6 + 2][0]) / 6, t5[e6 + 1][1] + (h5 * t5[e6][1] - h5 * t5[e6 + 2][1]) / 6], a5[3] = [t5[e6 + 1][0], t5[e6 + 1][1]], o5.push({ op: "bcurveTo", data: [a5[1][0], a5[1][1], a5[2][0], a5[2][1], a5[3][0], a5[3][1]] });
      }
      if (e5 && 2 === e5.length) {
        const t6 = s5.maxRandomnessOffset;
        o5.push({ op: "lineTo", data: [e5[0] + G2(t6, s5), e5[1] + G2(t6, s5)] });
      }
    } else 3 === n4 ? (o5.push({ op: "move", data: [t5[1][0], t5[1][1]] }), o5.push({ op: "bcurveTo", data: [t5[1][0], t5[1][1], t5[2][0], t5[2][1], t5[2][0], t5[2][1]] })) : 2 === n4 && o5.push(...R2(t5[0][0], t5[0][1], t5[1][0], t5[1][1], s5, true, true));
    return o5;
  }
  function F(t5, e5, s5, n4, o5, a5, h5, r5) {
    const i5 = [], c5 = [];
    if (0 === r5.roughness) {
      t5 /= 4, c5.push([e5 + n4 * Math.cos(-t5), s5 + o5 * Math.sin(-t5)]);
      for (let a6 = 0; a6 <= 2 * Math.PI; a6 += t5) {
        const t6 = [e5 + n4 * Math.cos(a6), s5 + o5 * Math.sin(a6)];
        i5.push(t6), c5.push(t6);
      }
      c5.push([e5 + n4 * Math.cos(0), s5 + o5 * Math.sin(0)]), c5.push([e5 + n4 * Math.cos(t5), s5 + o5 * Math.sin(t5)]);
    } else {
      const l7 = G2(0.5, r5) - Math.PI / 2;
      c5.push([G2(a5, r5) + e5 + 0.9 * n4 * Math.cos(l7 - t5), G2(a5, r5) + s5 + 0.9 * o5 * Math.sin(l7 - t5)]);
      const u6 = 2 * Math.PI + l7 - 0.01;
      for (let h6 = l7; h6 < u6; h6 += t5) {
        const t6 = [G2(a5, r5) + e5 + n4 * Math.cos(h6), G2(a5, r5) + s5 + o5 * Math.sin(h6)];
        i5.push(t6), c5.push(t6);
      }
      c5.push([G2(a5, r5) + e5 + n4 * Math.cos(l7 + 2 * Math.PI + 0.5 * h5), G2(a5, r5) + s5 + o5 * Math.sin(l7 + 2 * Math.PI + 0.5 * h5)]), c5.push([G2(a5, r5) + e5 + 0.98 * n4 * Math.cos(l7 + h5), G2(a5, r5) + s5 + 0.98 * o5 * Math.sin(l7 + h5)]), c5.push([G2(a5, r5) + e5 + 0.9 * n4 * Math.cos(l7 + 0.5 * h5), G2(a5, r5) + s5 + 0.9 * o5 * Math.sin(l7 + 0.5 * h5)]);
    }
    return [c5, i5];
  }
  function V2(t5, e5, s5, n4, o5, a5, h5, r5, i5) {
    const c5 = a5 + G2(0.1, i5), l7 = [];
    l7.push([G2(r5, i5) + e5 + 0.9 * n4 * Math.cos(c5 - t5), G2(r5, i5) + s5 + 0.9 * o5 * Math.sin(c5 - t5)]);
    for (let a6 = c5; a6 <= h5; a6 += t5) l7.push([G2(r5, i5) + e5 + n4 * Math.cos(a6), G2(r5, i5) + s5 + o5 * Math.sin(a6)]);
    return l7.push([e5 + n4 * Math.cos(h5), s5 + o5 * Math.sin(h5)]), l7.push([e5 + n4 * Math.cos(h5), s5 + o5 * Math.sin(h5)]), q3(l7, null, i5);
  }
  function Z(t5, e5, s5, n4, o5, a5, h5, r5) {
    const i5 = [], c5 = [r5.maxRandomnessOffset || 1, (r5.maxRandomnessOffset || 1) + 0.3];
    let l7 = [0, 0];
    const u6 = r5.disableMultiStroke ? 1 : 2, p5 = r5.preserveVertices;
    for (let f7 = 0; f7 < u6; f7++) 0 === f7 ? i5.push({ op: "move", data: [h5[0], h5[1]] }) : i5.push({ op: "move", data: [h5[0] + (p5 ? 0 : G2(c5[0], r5)), h5[1] + (p5 ? 0 : G2(c5[0], r5))] }), l7 = p5 ? [o5, a5] : [o5 + G2(c5[f7], r5), a5 + G2(c5[f7], r5)], i5.push({ op: "bcurveTo", data: [t5 + G2(c5[f7], r5), e5 + G2(c5[f7], r5), s5 + G2(c5[f7], r5), n4 + G2(c5[f7], r5), l7[0], l7[1]] });
    return i5;
  }
  function Q2(t5) {
    return [...t5];
  }
  function H2(t5, e5 = 0) {
    const s5 = t5.length;
    if (s5 < 3) throw new Error("A curve must have at least three points.");
    const n4 = [];
    if (3 === s5) n4.push(Q2(t5[0]), Q2(t5[1]), Q2(t5[2]), Q2(t5[2]));
    else {
      const s6 = [];
      s6.push(t5[0], t5[0]);
      for (let e6 = 1; e6 < t5.length; e6++) s6.push(t5[e6]), e6 === t5.length - 1 && s6.push(t5[e6]);
      const o5 = [], a5 = 1 - e5;
      n4.push(Q2(s6[0]));
      for (let t6 = 1; t6 + 2 < s6.length; t6++) {
        const e6 = s6[t6];
        o5[0] = [e6[0], e6[1]], o5[1] = [e6[0] + (a5 * s6[t6 + 1][0] - a5 * s6[t6 - 1][0]) / 6, e6[1] + (a5 * s6[t6 + 1][1] - a5 * s6[t6 - 1][1]) / 6], o5[2] = [s6[t6 + 1][0] + (a5 * s6[t6][0] - a5 * s6[t6 + 2][0]) / 6, s6[t6 + 1][1] + (a5 * s6[t6][1] - a5 * s6[t6 + 2][1]) / 6], o5[3] = [s6[t6 + 1][0], s6[t6 + 1][1]], n4.push(o5[1], o5[2], o5[3]);
      }
    }
    return n4;
  }
  function N2(t5, e5) {
    return Math.pow(t5[0] - e5[0], 2) + Math.pow(t5[1] - e5[1], 2);
  }
  function B3(t5, e5, s5) {
    const n4 = N2(e5, s5);
    if (0 === n4) return N2(t5, e5);
    let o5 = ((t5[0] - e5[0]) * (s5[0] - e5[0]) + (t5[1] - e5[1]) * (s5[1] - e5[1])) / n4;
    return o5 = Math.max(0, Math.min(1, o5)), N2(t5, J2(e5, s5, o5));
  }
  function J2(t5, e5, s5) {
    return [t5[0] + (e5[0] - t5[0]) * s5, t5[1] + (e5[1] - t5[1]) * s5];
  }
  function K2(t5, e5, s5, n4) {
    const o5 = n4 || [];
    if ((function(t6, e6) {
      const s6 = t6[e6 + 0], n5 = t6[e6 + 1], o6 = t6[e6 + 2], a6 = t6[e6 + 3];
      let h6 = 3 * n5[0] - 2 * s6[0] - a6[0];
      h6 *= h6;
      let r5 = 3 * n5[1] - 2 * s6[1] - a6[1];
      r5 *= r5;
      let i5 = 3 * o6[0] - 2 * a6[0] - s6[0];
      i5 *= i5;
      let c5 = 3 * o6[1] - 2 * a6[1] - s6[1];
      return c5 *= c5, h6 < i5 && (h6 = i5), r5 < c5 && (r5 = c5), h6 + r5;
    })(t5, e5) < s5) {
      const s6 = t5[e5 + 0];
      if (o5.length) {
        (a5 = o5[o5.length - 1], h5 = s6, Math.sqrt(N2(a5, h5))) > 1 && o5.push(s6);
      } else o5.push(s6);
      o5.push(t5[e5 + 3]);
    } else {
      const n5 = 0.5, a6 = t5[e5 + 0], h6 = t5[e5 + 1], r5 = t5[e5 + 2], i5 = t5[e5 + 3], c5 = J2(a6, h6, n5), l7 = J2(h6, r5, n5), u6 = J2(r5, i5, n5), p5 = J2(c5, l7, n5), f7 = J2(l7, u6, n5), d5 = J2(p5, f7, n5);
      K2([a6, c5, p5, d5], 0, s5, o5), K2([d5, f7, u6, i5], 0, s5, o5);
    }
    var a5, h5;
    return o5;
  }
  function U(t5, e5) {
    return X(t5, 0, t5.length, e5);
  }
  function X(t5, e5, s5, n4, o5) {
    const a5 = o5 || [], h5 = t5[e5], r5 = t5[s5 - 1];
    let i5 = 0, c5 = 1;
    for (let n5 = e5 + 1; n5 < s5 - 1; ++n5) {
      const e6 = B3(t5[n5], h5, r5);
      e6 > i5 && (i5 = e6, c5 = n5);
    }
    return Math.sqrt(i5) > n4 ? (X(t5, e5, c5 + 1, n4, a5), X(t5, c5, s5, n4, a5)) : (a5.length || a5.push(h5), a5.push(r5)), a5;
  }
  function Y(t5, e5 = 0.15, s5) {
    const n4 = [], o5 = (t5.length - 1) / 3;
    for (let s6 = 0; s6 < o5; s6++) {
      K2(t5, 3 * s6, e5, n4);
    }
    return s5 && s5 > 0 ? X(n4, 0, n4.length, s5) : n4;
  }
  var tt = "none";
  var et = class {
    constructor(t5) {
      this.defaultOptions = { maxRandomnessOffset: 2, roughness: 1, bowing: 1, stroke: "#000", strokeWidth: 1, curveTightness: 0, curveFitting: 0.95, curveStepCount: 9, fillStyle: "hachure", fillWeight: -1, hachureAngle: -41, hachureGap: -1, dashOffset: -1, dashGap: -1, zigzagOffset: -1, seed: 0, disableMultiStroke: false, disableMultiStrokeFill: false, preserveVertices: false, fillShapeRoughnessGain: 0.8 }, this.config = t5 || {}, this.config.options && (this.defaultOptions = this._o(this.config.options));
    }
    static newSeed() {
      return Math.floor(Math.random() * 2 ** 31);
    }
    _o(t5) {
      return t5 ? Object.assign({}, this.defaultOptions, t5) : this.defaultOptions;
    }
    _d(t5, e5, s5) {
      return { shape: t5, sets: e5 || [], options: s5 || this.defaultOptions };
    }
    line(t5, e5, s5, n4, o5) {
      const a5 = this._o(o5);
      return this._d("line", [v3(t5, e5, s5, n4, a5)], a5);
    }
    rectangle(t5, e5, s5, n4, o5) {
      const a5 = this._o(o5), h5 = [], r5 = O2(t5, e5, s5, n4, a5);
      if (a5.fill) {
        const o6 = [[t5, e5], [t5 + s5, e5], [t5 + s5, e5 + n4], [t5, e5 + n4]];
        "solid" === a5.fillStyle ? h5.push(I2([o6], a5)) : h5.push(C3([o6], a5));
      }
      return a5.stroke !== tt && h5.push(r5), this._d("rectangle", h5, a5);
    }
    ellipse(t5, e5, s5, n4, o5) {
      const a5 = this._o(o5), h5 = [], r5 = T3(s5, n4, a5), i5 = D3(t5, e5, a5, r5);
      if (a5.fill) if ("solid" === a5.fillStyle) {
        const s6 = D3(t5, e5, a5, r5).opset;
        s6.type = "fillPath", h5.push(s6);
      } else h5.push(C3([i5.estimatedPoints], a5));
      return a5.stroke !== tt && h5.push(i5.opset), this._d("ellipse", h5, a5);
    }
    circle(t5, e5, s5, n4) {
      const o5 = this.ellipse(t5, e5, s5, s5, n4);
      return o5.shape = "circle", o5;
    }
    linearPath(t5, e5) {
      const s5 = this._o(e5);
      return this._d("linearPath", [S2(t5, false, s5)], s5);
    }
    arc(t5, e5, s5, n4, o5, a5, h5 = false, r5) {
      const i5 = this._o(r5), c5 = [], l7 = A3(t5, e5, s5, n4, o5, a5, h5, true, i5);
      if (h5 && i5.fill) if ("solid" === i5.fillStyle) {
        const h6 = Object.assign({}, i5);
        h6.disableMultiStroke = true;
        const r6 = A3(t5, e5, s5, n4, o5, a5, true, false, h6);
        r6.type = "fillPath", c5.push(r6);
      } else c5.push((function(t6, e6, s6, n5, o6, a6, h6) {
        const r6 = t6, i6 = e6;
        let c6 = Math.abs(s6 / 2), l8 = Math.abs(n5 / 2);
        c6 += G2(0.01 * c6, h6), l8 += G2(0.01 * l8, h6);
        let u6 = o6, p5 = a6;
        for (; u6 < 0; ) u6 += 2 * Math.PI, p5 += 2 * Math.PI;
        p5 - u6 > 2 * Math.PI && (u6 = 0, p5 = 2 * Math.PI);
        const f7 = (p5 - u6) / h6.curveStepCount, d5 = [];
        for (let t7 = u6; t7 <= p5; t7 += f7) d5.push([r6 + c6 * Math.cos(t7), i6 + l8 * Math.sin(t7)]);
        return d5.push([r6 + c6 * Math.cos(p5), i6 + l8 * Math.sin(p5)]), d5.push([r6, i6]), C3([d5], h6);
      })(t5, e5, s5, n4, o5, a5, i5));
      return i5.stroke !== tt && c5.push(l7), this._d("arc", c5, i5);
    }
    curve(t5, e5) {
      const s5 = this._o(e5), n4 = [], o5 = L2(t5, s5);
      if (s5.fill && s5.fill !== tt) if ("solid" === s5.fillStyle) {
        const e6 = L2(t5, Object.assign(Object.assign({}, s5), { disableMultiStroke: true, roughness: s5.roughness ? s5.roughness + s5.fillShapeRoughnessGain : 0 }));
        n4.push({ type: "fillPath", ops: this._mergedShape(e6.ops) });
      } else {
        const e6 = [], o6 = t5;
        if (o6.length) {
          const t6 = "number" == typeof o6[0][0] ? [o6] : o6;
          for (const n5 of t6) n5.length < 3 ? e6.push(...n5) : 3 === n5.length ? e6.push(...Y(H2([n5[0], n5[0], n5[1], n5[2]]), 10, (1 + s5.roughness) / 2)) : e6.push(...Y(H2(n5), 10, (1 + s5.roughness) / 2));
        }
        e6.length && n4.push(C3([e6], s5));
      }
      return s5.stroke !== tt && n4.push(o5), this._d("curve", n4, s5);
    }
    polygon(t5, e5) {
      const s5 = this._o(e5), n4 = [], o5 = S2(t5, true, s5);
      return s5.fill && ("solid" === s5.fillStyle ? n4.push(I2([t5], s5)) : n4.push(C3([t5], s5))), s5.stroke !== tt && n4.push(o5), this._d("polygon", n4, s5);
    }
    path(t5, e5) {
      const s5 = this._o(e5), n4 = [];
      if (!t5) return this._d("path", n4, s5);
      t5 = (t5 || "").replace(/\n/g, " ").replace(/(-\s)/g, "-").replace("/(ss)/g", " ");
      const o5 = s5.fill && "transparent" !== s5.fill && s5.fill !== tt, a5 = s5.stroke !== tt, h5 = !!(s5.simplification && s5.simplification < 1), r5 = (function(t6, e6, s6) {
        const n5 = m3(y3(b2(t6))), o6 = [];
        let a6 = [], h6 = [0, 0], r6 = [];
        const i6 = () => {
          r6.length >= 4 && a6.push(...Y(r6, e6)), r6 = [];
        }, c5 = () => {
          i6(), a6.length && (o6.push(a6), a6 = []);
        };
        for (const { key: t7, data: e7 } of n5) switch (t7) {
          case "M":
            c5(), h6 = [e7[0], e7[1]], a6.push(h6);
            break;
          case "L":
            i6(), a6.push([e7[0], e7[1]]);
            break;
          case "C":
            if (!r6.length) {
              const t8 = a6.length ? a6[a6.length - 1] : h6;
              r6.push([t8[0], t8[1]]);
            }
            r6.push([e7[0], e7[1]]), r6.push([e7[2], e7[3]]), r6.push([e7[4], e7[5]]);
            break;
          case "Z":
            i6(), a6.push([h6[0], h6[1]]);
        }
        if (c5(), !s6) return o6;
        const l7 = [];
        for (const t7 of o6) {
          const e7 = U(t7, s6);
          e7.length && l7.push(e7);
        }
        return l7;
      })(t5, 1, h5 ? 4 - 4 * (s5.simplification || 1) : (1 + s5.roughness) / 2), i5 = _3(t5, s5);
      if (o5) if ("solid" === s5.fillStyle) if (1 === r5.length) {
        const e6 = _3(t5, Object.assign(Object.assign({}, s5), { disableMultiStroke: true, roughness: s5.roughness ? s5.roughness + s5.fillShapeRoughnessGain : 0 }));
        n4.push({ type: "fillPath", ops: this._mergedShape(e6.ops) });
      } else n4.push(I2(r5, s5));
      else n4.push(C3(r5, s5));
      return a5 && (h5 ? r5.forEach(((t6) => {
        n4.push(S2(t6, false, s5));
      })) : n4.push(i5)), this._d("path", n4, s5);
    }
    opsToPath(t5, e5) {
      let s5 = "";
      for (const n4 of t5.ops) {
        const t6 = "number" == typeof e5 && e5 >= 0 ? n4.data.map(((t7) => +t7.toFixed(e5))) : n4.data;
        switch (n4.op) {
          case "move":
            s5 += `M${t6[0]} ${t6[1]} `;
            break;
          case "bcurveTo":
            s5 += `C${t6[0]} ${t6[1]}, ${t6[2]} ${t6[3]}, ${t6[4]} ${t6[5]} `;
            break;
          case "lineTo":
            s5 += `L${t6[0]} ${t6[1]} `;
        }
      }
      return s5.trim();
    }
    toPaths(t5) {
      const e5 = t5.sets || [], s5 = t5.options || this.defaultOptions, n4 = [];
      for (const t6 of e5) {
        let e6 = null;
        switch (t6.type) {
          case "path":
            e6 = { d: this.opsToPath(t6), stroke: s5.stroke, strokeWidth: s5.strokeWidth, fill: tt };
            break;
          case "fillPath":
            e6 = { d: this.opsToPath(t6), stroke: tt, strokeWidth: 0, fill: s5.fill || tt };
            break;
          case "fillSketch":
            e6 = this.fillSketch(t6, s5);
        }
        e6 && n4.push(e6);
      }
      return n4;
    }
    fillSketch(t5, e5) {
      let s5 = e5.fillWeight;
      return s5 < 0 && (s5 = e5.strokeWidth / 2), { d: this.opsToPath(t5), stroke: e5.fill || tt, strokeWidth: s5, fill: tt };
    }
    _mergedShape(t5) {
      return t5.filter(((t6, e5) => 0 === e5 || "move" !== t6.op));
    }
  };
  var st = class {
    constructor(t5, e5) {
      this.canvas = t5, this.ctx = this.canvas.getContext("2d"), this.gen = new et(e5);
    }
    draw(t5) {
      const e5 = t5.sets || [], s5 = t5.options || this.getDefaultOptions(), n4 = this.ctx, o5 = t5.options.fixedDecimalPlaceDigits;
      for (const a5 of e5) switch (a5.type) {
        case "path":
          n4.save(), n4.strokeStyle = "none" === s5.stroke ? "transparent" : s5.stroke, n4.lineWidth = s5.strokeWidth, s5.strokeLineDash && n4.setLineDash(s5.strokeLineDash), s5.strokeLineDashOffset && (n4.lineDashOffset = s5.strokeLineDashOffset), this._drawToContext(n4, a5, o5), n4.restore();
          break;
        case "fillPath": {
          n4.save(), n4.fillStyle = s5.fill || "";
          const e6 = "curve" === t5.shape || "polygon" === t5.shape || "path" === t5.shape ? "evenodd" : "nonzero";
          this._drawToContext(n4, a5, o5, e6), n4.restore();
          break;
        }
        case "fillSketch":
          this.fillSketch(n4, a5, s5);
      }
    }
    fillSketch(t5, e5, s5) {
      let n4 = s5.fillWeight;
      n4 < 0 && (n4 = s5.strokeWidth / 2), t5.save(), s5.fillLineDash && t5.setLineDash(s5.fillLineDash), s5.fillLineDashOffset && (t5.lineDashOffset = s5.fillLineDashOffset), t5.strokeStyle = s5.fill || "", t5.lineWidth = n4, this._drawToContext(t5, e5, s5.fixedDecimalPlaceDigits), t5.restore();
    }
    _drawToContext(t5, e5, s5, n4 = "nonzero") {
      t5.beginPath();
      for (const n5 of e5.ops) {
        const e6 = "number" == typeof s5 && s5 >= 0 ? n5.data.map(((t6) => +t6.toFixed(s5))) : n5.data;
        switch (n5.op) {
          case "move":
            t5.moveTo(e6[0], e6[1]);
            break;
          case "bcurveTo":
            t5.bezierCurveTo(e6[0], e6[1], e6[2], e6[3], e6[4], e6[5]);
            break;
          case "lineTo":
            t5.lineTo(e6[0], e6[1]);
        }
      }
      "fillPath" === e5.type ? t5.fill(n4) : t5.stroke();
    }
    get generator() {
      return this.gen;
    }
    getDefaultOptions() {
      return this.gen.defaultOptions;
    }
    line(t5, e5, s5, n4, o5) {
      const a5 = this.gen.line(t5, e5, s5, n4, o5);
      return this.draw(a5), a5;
    }
    rectangle(t5, e5, s5, n4, o5) {
      const a5 = this.gen.rectangle(t5, e5, s5, n4, o5);
      return this.draw(a5), a5;
    }
    ellipse(t5, e5, s5, n4, o5) {
      const a5 = this.gen.ellipse(t5, e5, s5, n4, o5);
      return this.draw(a5), a5;
    }
    circle(t5, e5, s5, n4) {
      const o5 = this.gen.circle(t5, e5, s5, n4);
      return this.draw(o5), o5;
    }
    linearPath(t5, e5) {
      const s5 = this.gen.linearPath(t5, e5);
      return this.draw(s5), s5;
    }
    polygon(t5, e5) {
      const s5 = this.gen.polygon(t5, e5);
      return this.draw(s5), s5;
    }
    arc(t5, e5, s5, n4, o5, a5, h5 = false, r5) {
      const i5 = this.gen.arc(t5, e5, s5, n4, o5, a5, h5, r5);
      return this.draw(i5), i5;
    }
    curve(t5, e5) {
      const s5 = this.gen.curve(t5, e5);
      return this.draw(s5), s5;
    }
    path(t5, e5) {
      const s5 = this.gen.path(t5, e5);
      return this.draw(s5), s5;
    }
  };
  var nt = "http://www.w3.org/2000/svg";
  var ot = class {
    constructor(t5, e5) {
      this.svg = t5, this.gen = new et(e5);
    }
    draw(t5) {
      const e5 = t5.sets || [], s5 = t5.options || this.getDefaultOptions(), n4 = this.svg.ownerDocument || window.document, o5 = n4.createElementNS(nt, "g"), a5 = t5.options.fixedDecimalPlaceDigits;
      for (const h5 of e5) {
        let e6 = null;
        switch (h5.type) {
          case "path":
            e6 = n4.createElementNS(nt, "path"), e6.setAttribute("d", this.opsToPath(h5, a5)), e6.setAttribute("stroke", s5.stroke), e6.setAttribute("stroke-width", s5.strokeWidth + ""), e6.setAttribute("fill", "none"), s5.strokeLineDash && e6.setAttribute("stroke-dasharray", s5.strokeLineDash.join(" ").trim()), s5.strokeLineDashOffset && e6.setAttribute("stroke-dashoffset", `${s5.strokeLineDashOffset}`);
            break;
          case "fillPath":
            e6 = n4.createElementNS(nt, "path"), e6.setAttribute("d", this.opsToPath(h5, a5)), e6.setAttribute("stroke", "none"), e6.setAttribute("stroke-width", "0"), e6.setAttribute("fill", s5.fill || ""), "curve" !== t5.shape && "polygon" !== t5.shape || e6.setAttribute("fill-rule", "evenodd");
            break;
          case "fillSketch":
            e6 = this.fillSketch(n4, h5, s5);
        }
        e6 && o5.appendChild(e6);
      }
      return o5;
    }
    fillSketch(t5, e5, s5) {
      let n4 = s5.fillWeight;
      n4 < 0 && (n4 = s5.strokeWidth / 2);
      const o5 = t5.createElementNS(nt, "path");
      return o5.setAttribute("d", this.opsToPath(e5, s5.fixedDecimalPlaceDigits)), o5.setAttribute("stroke", s5.fill || ""), o5.setAttribute("stroke-width", n4 + ""), o5.setAttribute("fill", "none"), s5.fillLineDash && o5.setAttribute("stroke-dasharray", s5.fillLineDash.join(" ").trim()), s5.fillLineDashOffset && o5.setAttribute("stroke-dashoffset", `${s5.fillLineDashOffset}`), o5;
    }
    get generator() {
      return this.gen;
    }
    getDefaultOptions() {
      return this.gen.defaultOptions;
    }
    opsToPath(t5, e5) {
      return this.gen.opsToPath(t5, e5);
    }
    line(t5, e5, s5, n4, o5) {
      const a5 = this.gen.line(t5, e5, s5, n4, o5);
      return this.draw(a5);
    }
    rectangle(t5, e5, s5, n4, o5) {
      const a5 = this.gen.rectangle(t5, e5, s5, n4, o5);
      return this.draw(a5);
    }
    ellipse(t5, e5, s5, n4, o5) {
      const a5 = this.gen.ellipse(t5, e5, s5, n4, o5);
      return this.draw(a5);
    }
    circle(t5, e5, s5, n4) {
      const o5 = this.gen.circle(t5, e5, s5, n4);
      return this.draw(o5);
    }
    linearPath(t5, e5) {
      const s5 = this.gen.linearPath(t5, e5);
      return this.draw(s5);
    }
    polygon(t5, e5) {
      const s5 = this.gen.polygon(t5, e5);
      return this.draw(s5);
    }
    arc(t5, e5, s5, n4, o5, a5, h5 = false, r5) {
      const i5 = this.gen.arc(t5, e5, s5, n4, o5, a5, h5, r5);
      return this.draw(i5);
    }
    curve(t5, e5) {
      const s5 = this.gen.curve(t5, e5);
      return this.draw(s5);
    }
    path(t5, e5) {
      const s5 = this.gen.path(t5, e5);
      return this.draw(s5);
    }
  };
  var at = { canvas: (t5, e5) => new st(t5, e5), svg: (t5, e5) => new ot(t5, e5), generator: (t5) => new et(t5), newSeed: () => et.newSeed() };

  // node_modules/perfect-freehand/dist/esm/index.mjs
  var { PI: e4 } = Math;
  var t4 = e4 + 1e-4;
  var n3 = 0.5;
  var r4 = [1, 1];
  function i4(e5, t5, n4, r5 = (e6) => e6) {
    return e5 * r5(0.5 - t5 * (0.5 - n4));
  }
  var { min: a4 } = Math;
  function o4(e5, t5, n4) {
    let r5 = a4(1, t5 / n4);
    return a4(1, e5 + (a4(1, 1 - r5) - e5) * (r5 * 0.275));
  }
  function s4(e5) {
    return [-e5[0], -e5[1]];
  }
  function c4(e5, t5) {
    return [e5[0] + t5[0], e5[1] + t5[1]];
  }
  function l4(e5, t5, n4) {
    return e5[0] = t5[0] + n4[0], e5[1] = t5[1] + n4[1], e5;
  }
  function u4(e5, t5) {
    return [e5[0] - t5[0], e5[1] - t5[1]];
  }
  function d4(e5, t5, n4) {
    return e5[0] = t5[0] - n4[0], e5[1] = t5[1] - n4[1], e5;
  }
  function f4(e5, t5) {
    return [e5[0] * t5, e5[1] * t5];
  }
  function p4(e5, t5, n4) {
    return e5[0] = t5[0] * n4, e5[1] = t5[1] * n4, e5;
  }
  function m4(e5, t5) {
    return [e5[0] / t5, e5[1] / t5];
  }
  function h4(e5) {
    return [e5[1], -e5[0]];
  }
  function g3(e5, t5) {
    let n4 = t5[0];
    return e5[0] = t5[1], e5[1] = -n4, e5;
  }
  function ee(e5, t5) {
    return e5[0] * t5[0] + e5[1] * t5[1];
  }
  function _4(e5, t5) {
    return e5[0] === t5[0] && e5[1] === t5[1];
  }
  function v4(e5) {
    return Math.hypot(e5[0], e5[1]);
  }
  function y4(e5, t5) {
    let n4 = e5[0] - t5[0], r5 = e5[1] - t5[1];
    return n4 * n4 + r5 * r5;
  }
  function b3(e5) {
    return m4(e5, v4(e5));
  }
  function x3(e5, t5) {
    return Math.hypot(e5[1] - t5[1], e5[0] - t5[0]);
  }
  function S3(e5, t5, n4) {
    let r5 = Math.sin(n4), i5 = Math.cos(n4), a5 = e5[0] - t5[0], o5 = e5[1] - t5[1], s5 = a5 * i5 - o5 * r5, c5 = a5 * r5 + o5 * i5;
    return [s5 + t5[0], c5 + t5[1]];
  }
  function C4(e5, t5, n4, r5) {
    let i5 = Math.sin(r5), a5 = Math.cos(r5), o5 = t5[0] - n4[0], s5 = t5[1] - n4[1], c5 = o5 * a5 - s5 * i5, l7 = o5 * i5 + s5 * a5;
    return e5[0] = c5 + n4[0], e5[1] = l7 + n4[1], e5;
  }
  function w4(e5, t5, n4) {
    return c4(e5, f4(u4(t5, e5), n4));
  }
  function te(e5, t5, n4, r5) {
    let i5 = n4[0] - t5[0], a5 = n4[1] - t5[1];
    return e5[0] = t5[0] + i5 * r5, e5[1] = t5[1] + a5 * r5, e5;
  }
  function T4(e5, t5, n4) {
    return c4(e5, f4(t5, n4));
  }
  var E3 = [0, 0];
  var D4 = [0, 0];
  var O3 = [0, 0];
  function k4(e5, n4) {
    let r5 = T4(e5, b3(h4(u4(e5, c4(e5, [1, 1])))), -n4), i5 = [], a5 = 1 / 13;
    for (let n5 = a5; n5 <= 1; n5 += a5) i5.push(S3(r5, e5, t4 * 2 * n5));
    return i5;
  }
  function A4(e5, n4, r5) {
    let i5 = [], a5 = 1 / r5;
    for (let r6 = a5; r6 <= 1; r6 += a5) i5.push(S3(n4, e5, t4 * r6));
    return i5;
  }
  function j4(e5, t5, n4) {
    let r5 = u4(t5, n4), i5 = f4(r5, 0.5), a5 = f4(r5, 0.51);
    return [u4(e5, i5), u4(e5, a5), c4(e5, a5), c4(e5, i5)];
  }
  function M2(e5, n4, r5, i5) {
    let a5 = [], o5 = T4(e5, n4, r5), s5 = 1 / i5;
    for (let n5 = s5; n5 < 1; n5 += s5) a5.push(S3(o5, e5, t4 * 3 * n5));
    return a5;
  }
  function ne(e5, t5, n4) {
    return [c4(e5, f4(t5, n4)), c4(e5, f4(t5, n4 * 0.99)), u4(e5, f4(t5, n4 * 0.99)), u4(e5, f4(t5, n4))];
  }
  function N3(e5, t5, n4) {
    return e5 === false || e5 === void 0 ? 0 : e5 === true ? Math.max(t5, n4) : e5;
  }
  function re(e5, t5, n4) {
    return e5.slice(0, 10).reduce((e6, r5) => {
      let i5 = r5.pressure;
      return t5 && (i5 = o4(e6, r5.distance, n4)), (e6 + i5) / 2;
    }, e5[0].pressure);
  }
  function P3(e5, n4 = {}) {
    let { size: r5 = 16, smoothing: a5 = 0.5, thinning: f7 = 0.5, simulatePressure: m6 = true, easing: _6 = (e6) => e6, start: v6 = {}, end: b5 = {}, last: x5 = false } = n4, { cap: S5 = true, easing: w5 = (e6) => e6 * (2 - e6) } = v6, { cap: T6 = true, easing: P5 = (e6) => --e6 * e6 * e6 + 1 } = b5;
    if (e5.length === 0 || r5 <= 0) return [];
    let F4 = e5[e5.length - 1].runningLength, I5 = N3(v6.taper, r5, F4), L5 = N3(b5.taper, r5, F4), R5 = (r5 * a5) ** 2, z5 = [], B5 = [], V4 = re(e5, m6, r5), H4 = i4(r5, f7, e5[e5.length - 1].pressure, _6), U3, W3 = e5[0].vector, G4 = e5[0].point, K4 = G4, q5 = G4, J4 = K4, Y3 = false;
    for (let n5 = 0; n5 < e5.length; n5++) {
      let { pressure: a6 } = e5[n5], { point: s5, vector: h5, distance: v7, runningLength: b6 } = e5[n5], x6 = n5 === e5.length - 1;
      if (!x6 && F4 - b6 < 3) continue;
      f7 ? (m6 && (a6 = o4(V4, v7, r5)), H4 = i4(r5, f7, a6, _6)) : H4 = r5 / 2, U3 === void 0 && (U3 = H4);
      let S6 = b6 < I5 ? w5(b6 / I5) : 1, T7 = F4 - b6 < L5 ? P5((F4 - b6) / L5) : 1;
      H4 = Math.max(0.01, H4 * Math.min(S6, T7));
      let k6 = (x6 ? e5[n5] : e5[n5 + 1]).vector, A6 = x6 ? 1 : ee(h5, k6), j6 = ee(h5, W3) < 0 && !Y3, M4 = A6 !== null && A6 < 0;
      if (j6 || M4) {
        g3(E3, W3), p4(E3, E3, H4);
        for (let e6 = 0; e6 <= 1; e6 += 0.07692307692307693) d4(D4, s5, E3), C4(D4, D4, s5, t4 * e6), q5 = [D4[0], D4[1]], z5.push(q5), l4(O3, s5, E3), C4(O3, O3, s5, t4 * -e6), J4 = [O3[0], O3[1]], B5.push(J4);
        G4 = q5, K4 = J4, M4 && (Y3 = true);
        continue;
      }
      if (Y3 = false, x6) {
        g3(E3, h5), p4(E3, E3, H4), z5.push(u4(s5, E3)), B5.push(c4(s5, E3));
        continue;
      }
      te(E3, k6, h5, A6), g3(E3, E3), p4(E3, E3, H4), d4(D4, s5, E3), q5 = [D4[0], D4[1]], (n5 <= 1 || y4(G4, q5) > R5) && (z5.push(q5), G4 = q5), l4(O3, s5, E3), J4 = [O3[0], O3[1]], (n5 <= 1 || y4(K4, J4) > R5) && (B5.push(J4), K4 = J4), V4 = a6, W3 = h5;
    }
    let X3 = [e5[0].point[0], e5[0].point[1]], Z3 = e5.length > 1 ? [e5[e5.length - 1].point[0], e5[e5.length - 1].point[1]] : c4(e5[0].point, [1, 1]), Q4 = [], $4 = [];
    if (e5.length === 1) {
      if (!(I5 || L5) || x5) return k4(X3, U3 || H4);
    } else {
      I5 || L5 && e5.length === 1 || (S5 ? Q4.push(...A4(X3, B5[0], 13)) : Q4.push(...j4(X3, z5[0], B5[0])));
      let t5 = h4(s4(e5[e5.length - 1].vector));
      L5 || I5 && e5.length === 1 ? $4.push(Z3) : T6 ? $4.push(...M2(Z3, t5, H4, 29)) : $4.push(...ne(Z3, t5, H4));
    }
    return z5.concat($4, B5.reverse(), Q4);
  }
  var F2 = [0, 0];
  function I3(e5) {
    return e5 != null && e5 >= 0;
  }
  function L3(e5, t5 = {}) {
    let { streamline: i5 = 0.5, size: a5 = 16, last: o5 = false } = t5;
    if (e5.length === 0) return [];
    let s5 = 0.15 + (1 - i5) * 0.85, l7 = Array.isArray(e5[0]) ? e5 : e5.map(({ x: e6, y: t6, pressure: r5 = n3 }) => [e6, t6, r5]);
    if (l7.length === 2) {
      let e6 = l7[1];
      l7 = l7.slice(0, -1);
      for (let t6 = 1; t6 < 5; t6++) l7.push(w4(l7[0], e6, t6 / 4));
    }
    l7.length === 1 && (l7 = [...l7, [...c4(l7[0], r4), ...l7[0].slice(2)]]);
    let u6 = [{ point: [l7[0][0], l7[0][1]], pressure: I3(l7[0][2]) ? l7[0][2] : 0.25, vector: [...r4], distance: 0, runningLength: 0 }], f7 = false, p5 = 0, m6 = u6[0], h5 = l7.length - 1;
    for (let e6 = 1; e6 < l7.length; e6++) {
      let t6 = o5 && e6 === h5 ? [l7[e6][0], l7[e6][1]] : w4(m6.point, l7[e6], s5);
      if (_4(m6.point, t6)) continue;
      let r5 = x3(t6, m6.point);
      if (p5 += r5, e6 < h5 && !f7) {
        if (p5 < a5) continue;
        f7 = true;
      }
      d4(F2, m6.point, t6), m6 = { point: t6, pressure: I3(l7[e6][2]) ? l7[e6][2] : n3, vector: b3(F2), distance: r5, runningLength: p5 }, u6.push(m6);
    }
    return u6[0].vector = u6[1]?.vector || [0, 0], u6;
  }
  function R3(e5, t5 = {}) {
    return P3(L3(e5, t5), t5);
  }

  // src/drawing.ts
  var STROKE_HEX = {
    chalk: "#e8e8ec",
    coral: "#f87171",
    amber: "#fbbf24",
    sage: "#4ade80",
    azure: "#60a5fa",
    violet: "#c084fc"
  };
  var INK_OPTIONS = {
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
    last: true
  };
  var ROUGHNESS = 1.1;
  var ARROWHEAD_MAX = 36;
  var ARROWHEAD_SHARE = 0.32;
  var ARROWHEAD_SPREAD = Math.PI / 7;
  var ANGLE_SNAP_DEGREES = 15;
  var ELLIPSE_SAMPLES = 48;
  var PATH_DECIMALS = 2;
  var generator = at.generator();
  function inkPath(points, size) {
    if (points.length === 0) return "";
    const outline = R3(points, { size: STROKE_PX[size], ...INK_OPTIONS });
    return outlinePath(outline);
  }
  function shapePaths(item) {
    const options = {
      seed: item.seed,
      roughness: ROUGHNESS,
      strokeWidth: STROKE_PX[item.size]
    };
    const { a: a5, b: b5 } = item;
    switch (item.shape) {
      case "rectangle": {
        const rect = normalize(a5, b5);
        return toPaths([generator.rectangle(rect.x, rect.y, rect.width, rect.height, options)]);
      }
      case "ellipse": {
        const rect = normalize(a5, b5);
        return toPaths([
          generator.ellipse(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
            rect.width,
            rect.height,
            options
          )
        ]);
      }
      case "line":
        return toPaths([generator.line(a5.x, a5.y, b5.x, b5.y, options)]);
      case "arrow": {
        const shaft = generator.line(a5.x, a5.y, b5.x, b5.y, options);
        const wings = arrowhead(a5, b5);
        if (!wings) return toPaths([shaft]);
        return toPaths([shaft, generator.linearPath(wings, options)]);
      }
    }
  }
  function arrowhead(a5, b5) {
    const length = Math.hypot(b5.x - a5.x, b5.y - a5.y);
    if (length < 1) return null;
    const angle = Math.atan2(b5.y - a5.y, b5.x - a5.x);
    const reach = Math.min(ARROWHEAD_MAX, length * ARROWHEAD_SHARE);
    const wing = (spread) => [
      b5.x - reach * Math.cos(angle + spread),
      b5.y - reach * Math.sin(angle + spread)
    ];
    return [wing(ARROWHEAD_SPREAD), [b5.x, b5.y], wing(-ARROWHEAD_SPREAD)];
  }
  function constrain(kind, a5, b5) {
    const dx = b5.x - a5.x;
    const dy = b5.y - a5.y;
    if (kind === "rectangle" || kind === "ellipse") {
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      return { x: a5.x + Math.sign(dx || 1) * side, y: a5.y + Math.sign(dy || 1) * side };
    }
    const length = Math.hypot(dx, dy);
    if (length === 0) return { ...b5 };
    const step = ANGLE_SNAP_DEGREES * Math.PI / 180;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: a5.x + length * Math.cos(angle), y: a5.y + length * Math.sin(angle) };
  }
  function simplifyStroke(points, minDistance) {
    const kept = [];
    for (const [index, point] of points.entries()) {
      const last = kept.at(-1);
      const isLast = index === points.length - 1;
      if (last && !isLast && Math.hypot(point[0] - last[0], point[1] - last[1]) < minDistance) {
        continue;
      }
      kept.push([round(point[0]), round(point[1])]);
    }
    return kept;
  }
  function erasedAlong(items, from, to, tolerance) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.min(MAX_ERASER_SAMPLES, Math.max(1, Math.ceil(distance / tolerance)));
    const hit = [];
    for (const item of items) {
      for (let step = 0; step <= steps; step += 1) {
        const at3 = {
          x: from.x + (to.x - from.x) * step / steps,
          y: from.y + (to.y - from.y) * step / steps
        };
        if (hits(item, at3, tolerance)) {
          hit.push(item.id);
          break;
        }
      }
    }
    return hit;
  }
  var MAX_ERASER_SAMPLES = 64;
  function hits(item, point, tolerance) {
    if (item.type === "text") {
      const box = labelBounds(item);
      return point.x >= box.x - tolerance && point.x <= box.x + box.width + tolerance && point.y >= box.y - tolerance && point.y <= box.y + box.height + tolerance;
    }
    const reach = tolerance + STROKE_PX[item.size] / 2;
    if (item.type === "stroke") {
      return nearPolyline(
        item.points.map(([x5, y6]) => ({ x: x5, y: y6 })),
        point,
        reach
      );
    }
    return outlineOf(item).some((line) => nearPolyline(line, point, reach));
  }
  function outlineOf(item) {
    const { a: a5, b: b5 } = item;
    if (item.shape === "line" || item.shape === "arrow") return [[a5, b5]];
    const rect = normalize(a5, b5);
    if (item.shape === "rectangle") {
      const right = rect.x + rect.width;
      const bottom = rect.y + rect.height;
      return [
        [
          { x: rect.x, y: rect.y },
          { x: right, y: rect.y },
          { x: right, y: bottom },
          { x: rect.x, y: bottom },
          { x: rect.x, y: rect.y }
        ]
      ];
    }
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const points = [];
    for (let step = 0; step <= ELLIPSE_SAMPLES; step += 1) {
      const angle = step / ELLIPSE_SAMPLES * Math.PI * 2;
      points.push({
        x: cx + rect.width / 2 * Math.cos(angle),
        y: cy + rect.height / 2 * Math.sin(angle)
      });
    }
    return [points];
  }
  function nearPolyline(points, point, reach) {
    const first = points[0];
    if (!first) return false;
    if (points.length === 1) return Math.hypot(point.x - first.x, point.y - first.y) <= reach;
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      if (start && end && distanceToSegment(point, start, end) <= reach) return true;
    }
    return false;
  }
  function distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const along = Math.max(
      0,
      Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)
    );
    return Math.hypot(point.x - (start.x + along * dx), point.y - (start.y + along * dy));
  }
  function normalize(a5, b5) {
    return {
      x: Math.min(a5.x, b5.x),
      y: Math.min(a5.y, b5.y),
      width: Math.abs(b5.x - a5.x),
      height: Math.abs(b5.y - a5.y)
    };
  }
  function toPaths(drawables) {
    const paths = [];
    for (const drawable of drawables) {
      for (const path of generator.toPaths(drawable)) {
        paths.push({ d: path.d, strokeWidth: path.strokeWidth });
      }
    }
    return paths;
  }
  function outlinePath(outline) {
    const first = outline[0];
    if (!first || first[0] === void 0 || first[1] === void 0) return "";
    const parts = [`M ${round(first[0])} ${round(first[1])} Q`];
    for (const [index, point] of outline.entries()) {
      const next = outline[(index + 1) % outline.length];
      const x5 = point[0];
      const y6 = point[1];
      if (x5 === void 0 || y6 === void 0 || !next) continue;
      const nx = next[0];
      const ny = next[1];
      if (nx === void 0 || ny === void 0) continue;
      parts.push(`${round(x5)} ${round(y6)} ${round((x5 + nx) / 2)} ${round((y6 + ny) / 2)}`);
    }
    parts.push("Z");
    return parts.join(" ");
  }
  function round(value) {
    const factor = 10 ** PATH_DECIMALS;
    return Math.round(value * factor) / factor;
  }

  // src/export.ts
  function boardExport(document2, name) {
    return {
      schemaVersion: document2.schemaVersion,
      id: document2.id,
      name,
      items: document2.items,
      viewport: document2.viewport
    };
  }
  function formatBoardExport(document2, name) {
    return `${JSON.stringify(boardExport(document2, name), null, 2)}
`;
  }
  async function copyText(text3, host = document) {
    const api = host.defaultView?.navigator?.clipboard;
    if (api) {
      try {
        await api.writeText(text3);
        return true;
      } catch {
      }
    }
    return copyBySelection(text3, host);
  }
  function copyBySelection(text3, host) {
    const exec = host.execCommand;
    if (typeof exec !== "function") return false;
    const field = host.createElement("textarea");
    field.value = text3;
    field.setAttribute("aria-hidden", "true");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    field.style.opacity = "0";
    host.body.append(field);
    field.focus();
    field.select();
    try {
      return exec.call(host, "copy");
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f5 = 0;
  function u5(e5, t5, n4, o5, i5, u6) {
    t5 || (t5 = {});
    var a5, c5, p5 = t5;
    if ("ref" in p5) for (c5 in p5 = {}, t5) "ref" == c5 ? a5 = t5[c5] : p5[c5] = t5[c5];
    var l7 = { type: e5, props: p5, key: n4, ref: a5, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f5, __i: -1, __u: 0, __source: i5, __self: u6 };
    if ("function" == typeof e5 && (a5 = e5.defaultProps)) for (c5 in a5) void 0 === p5[c5] && (p5[c5] = a5[c5]);
    return l.vnode && l.vnode(l7), l7;
  }

  // src/ink.tsx
  var SELECTION_PAD_PX = 4;
  var SELECTION_STROKE_PX = 1.5;
  function Ink({ items, draft, selection, zoom }) {
    return /* @__PURE__ */ u5("svg", { class: "canvas__ink", "aria-hidden": "true", width: "1", height: "1", children: [
      items.map(
        (item) => item.type === "stroke" ? /* @__PURE__ */ u5(Stroke, { item }, item.id) : item.type === "shape" ? /* @__PURE__ */ u5(Shape, { item }, item.id) : null
      ),
      draft?.type === "stroke" ? /* @__PURE__ */ u5(Stroke, { item: draft }) : null,
      draft?.type === "shape" ? /* @__PURE__ */ u5(Shape, { item: draft }) : null,
      items.map(
        (item) => (item.type === "stroke" || item.type === "shape") && selection.includes(item.id) ? /* @__PURE__ */ u5(SelectionBox, { item, zoom }, `selected:${item.id}`) : null
      )
    ] });
  }
  function SelectionBox({ item, zoom }) {
    const bounds = itemBounds(item);
    const pad = SELECTION_PAD_PX / zoom;
    return /* @__PURE__ */ u5(
      "rect",
      {
        class: "ink__selection",
        x: bounds.x - pad,
        y: bounds.y - pad,
        width: bounds.width + pad * 2,
        height: bounds.height + pad * 2,
        rx: pad / 2,
        "stroke-width": SELECTION_STROKE_PX / zoom
      }
    );
  }
  function Stroke({ item }) {
    const d5 = T2(() => inkPath(item.points, item.size), [item.points, item.size]);
    return /* @__PURE__ */ u5("path", { class: "ink__stroke", d: d5, fill: STROKE_HEX[item.color] });
  }
  function Shape({ item }) {
    const paths = T2(() => shapePaths(item), [item]);
    const stroke = STROKE_HEX[item.color];
    return /* @__PURE__ */ u5("g", { class: "ink__shape", children: paths.map((path, index) => (
      // Paths of one sketch have no identity of their own; their order is it.
      /* @__PURE__ */ u5("path", { d: path.d, stroke, "stroke-width": path.strokeWidth, fill: "none" }, index)
    )) });
  }

  // src/toolbar.tsx
  var TOOLS = [
    { name: "select", label: "Select", keys: ["V", "1"] },
    { name: "pen", label: "Pen", keys: ["P", "7"] },
    { name: "rectangle", label: "Rect", keys: ["R", "2"] },
    { name: "ellipse", label: "Ellipse", keys: ["O", "4"] },
    { name: "line", label: "Line", keys: ["L", "6"] },
    { name: "arrow", label: "Arrow", keys: ["A", "5"] },
    { name: "text", label: "Text", keys: ["T", "8"] },
    { name: "eraser", label: "Eraser", keys: ["E", "0"] }
  ];
  var DEFAULT_TOOL = "select";
  function isShapeTool(tool) {
    return SHAPE_KINDS.includes(tool);
  }
  function usesStroke(tool) {
    return tool === "pen" || tool === "text" || isShapeTool(tool);
  }
  function isDrawingTool(tool) {
    return tool !== "select";
  }
  function Toolbar(props) {
    const { tool, color, size } = props;
    return /* @__PURE__ */ u5("div", { class: "tools", onPointerDown: (event) => event.stopPropagation(), children: [
      /* @__PURE__ */ u5("div", { class: "toolbar", role: "toolbar", "aria-label": "Tools", children: [
        TOOLS.map((entry) => /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: `toolbar__button${tool === entry.name ? " toolbar__button--on" : ""}`,
            "aria-label": entry.label,
            "aria-pressed": tool === entry.name,
            title: `${entry.label} (${entry.keys.join(" or ")})`,
            onClick: () => props.onTool(entry.name),
            children: entry.label
          },
          entry.name
        )),
        /* @__PURE__ */ u5("span", { class: "toolbar__separator", "aria-hidden": "true" }),
        /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: "toolbar__button",
            "aria-label": "Add note",
            onClick: props.onAddNote,
            children: "Note"
          }
        )
      ] }),
      usesStroke(tool) ? /* @__PURE__ */ u5("div", { class: "toolbar toolbar--style", role: "toolbar", "aria-label": "Stroke", children: [
        STROKE_COLORS.map((entry) => /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: `toolbar__swatch${entry === color ? " toolbar__swatch--on" : ""}`,
            style: { background: STROKE_HEX[entry] },
            "aria-label": `Ink ${entry}`,
            "aria-pressed": entry === color,
            onClick: () => props.onColor(entry)
          },
          entry
        )),
        /* @__PURE__ */ u5("span", { class: "toolbar__separator", "aria-hidden": "true" }),
        STROKE_WIDTHS.map((entry) => /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: `toolbar__width${entry === size ? " toolbar__width--on" : ""}`,
            "aria-label": `${entry} stroke`,
            "aria-pressed": entry === size,
            onClick: () => props.onSize(entry),
            children: /* @__PURE__ */ u5(
              "span",
              {
                class: "toolbar__dot",
                style: { width: `${STROKE_PX[entry]}px`, height: `${STROKE_PX[entry]}px` }
              }
            )
          },
          entry
        ))
      ] }) : null
    ] });
  }

  // src/interactions.ts
  var CLICK_SLOP_PX = 3;
  var MIDDLE_BUTTON = 1;
  var PRIMARY_BUTTON = 0;
  var LINE_HEIGHT_PX = 16;
  var PAGE_HEIGHT_PX = 100;
  var NUDGE = 1;
  var NUDGE_FAST = 5;
  var TOOL_KEYS = new Map(
    TOOLS.flatMap((tool) => tool.keys.map((key) => [key.toLowerCase(), tool.name]))
  );
  var ARROWS = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  };
  function attachCanvasInteractions(surface, host) {
    const ownerDocument = surface.ownerDocument;
    const ownerWindow = ownerDocument.defaultView ?? window;
    let spaceHeld = false;
    let panPointerId = null;
    let lastPanPoint = { x: 0, y: 0 };
    function anchorOf(event) {
      const rect = surface.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    function centerAnchor() {
      const size = host.getSurfaceSize();
      return { x: size.width / 2, y: size.height / 2 };
    }
    function scrollPixels(delta, deltaMode) {
      if (deltaMode === 1) return delta * LINE_HEIGHT_PX;
      if (deltaMode === 2) return delta * PAGE_HEIGHT_PX;
      return delta;
    }
    function onWheel(event) {
      if (insideChrome(event.target)) return;
      event.preventDefault();
      const viewport = host.getViewport();
      if (event.ctrlKey || event.metaKey) {
        host.setViewport(zoomByWheel(viewport, anchorOf(event), scrollPixels(event.deltaY, event.deltaMode)));
        return;
      }
      host.setViewport(
        panBy(
          viewport,
          -scrollPixels(event.deltaX, event.deltaMode),
          -scrollPixels(event.deltaY, event.deltaMode)
        )
      );
    }
    function onPointerDown(event) {
      const wantsPan = event.button === MIDDLE_BUTTON || event.button === PRIMARY_BUTTON && spaceHeld;
      if (!wantsPan || panPointerId !== null) return;
      event.preventDefault();
      panPointerId = event.pointerId;
      lastPanPoint = { x: event.clientX, y: event.clientY };
      surface.setPointerCapture?.(event.pointerId);
      host.setPanning(true);
    }
    function onPointerMove(event) {
      if (panPointerId !== event.pointerId) return;
      const dx = event.clientX - lastPanPoint.x;
      const dy = event.clientY - lastPanPoint.y;
      lastPanPoint = { x: event.clientX, y: event.clientY };
      if (dx === 0 && dy === 0) return;
      host.setViewport(panBy(host.getViewport(), dx, dy));
    }
    function endPan(event) {
      if (panPointerId !== event.pointerId) return;
      panPointerId = null;
      if (surface.hasPointerCapture?.(event.pointerId)) {
        surface.releasePointerCapture(event.pointerId);
      }
      host.setPanning(false);
    }
    function onKeyDown(event) {
      if (isTextEntry(event.target) || insideChrome(event.target)) return;
      if (event.code === "Space" && !event.repeat) {
        spaceHeld = true;
        host.setSpaceHeld(true);
        event.preventDefault();
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) host.redo();
          else host.undo();
        } else if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          host.selectAll();
        } else if (event.key === "=" || event.key === "+") {
          event.preventDefault();
          host.setViewport(zoomInAt(host.getViewport(), centerAnchor()));
        } else if (event.key === "-" || event.key === "_") {
          event.preventDefault();
          host.setViewport(zoomOutAt(host.getViewport(), centerAnchor()));
        } else if (event.key === "0") {
          event.preventDefault();
          host.setViewport(resetZoomAt(host.getViewport(), centerAnchor()));
        }
        return;
      }
      if (event.shiftKey && event.key === "!") {
        event.preventDefault();
        host.fitToBoard();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        host.deleteSelection();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        host.escape();
        return;
      }
      const arrow = ARROWS[event.key];
      if (arrow) {
        event.preventDefault();
        const step = event.shiftKey ? NUDGE_FAST : NUDGE;
        host.nudgeSelection(arrow[0] * step, arrow[1] * step, event.repeat);
        return;
      }
      if (event.altKey) return;
      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        host.cycleNoteColor();
        return;
      }
      if (event.shiftKey) return;
      const tool = TOOL_KEYS.get(event.key.toLowerCase());
      if (tool) {
        event.preventDefault();
        host.setTool(tool);
      }
    }
    function onKeyUp(event) {
      if (event.code !== "Space") return;
      spaceHeld = false;
      host.setSpaceHeld(false);
    }
    function releaseSpace() {
      if (!spaceHeld) return;
      spaceHeld = false;
      host.setSpaceHeld(false);
    }
    surface.addEventListener("wheel", onWheel, { passive: false });
    surface.addEventListener("pointerdown", onPointerDown);
    surface.addEventListener("pointermove", onPointerMove);
    surface.addEventListener("pointerup", endPan);
    surface.addEventListener("pointercancel", endPan);
    ownerDocument.addEventListener("keydown", onKeyDown);
    ownerDocument.addEventListener("keyup", onKeyUp);
    ownerWindow.addEventListener("blur", releaseSpace);
    return () => {
      surface.removeEventListener("wheel", onWheel);
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", endPan);
      surface.removeEventListener("pointercancel", endPan);
      ownerDocument.removeEventListener("keydown", onKeyDown);
      ownerDocument.removeEventListener("keyup", onKeyUp);
      ownerWindow.removeEventListener("blur", releaseSpace);
    };
  }
  function insideChrome(target) {
    return target instanceof Element && target.closest("[data-chrome]") !== null;
  }
  function isTextEntry(target) {
    if (!(target instanceof Element)) return false;
    if (target instanceof HTMLElement && target.isContentEditable) return true;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  }

  // src/history.ts
  var HISTORY_LIMIT = 100;
  function createSession(document2) {
    return { document: document2, past: [], future: [], selection: [], gesture: null };
  }
  function sessionReducer(state, action) {
    switch (action.type) {
      case "history/undo": {
        const previous = state.past.at(-1);
        if (!previous) return state;
        return {
          document: keepView(previous.document, state.document),
          past: state.past.slice(0, -1),
          future: [...state.future, entryOf(state)],
          selection: onBoard(previous.selection, previous.document),
          gesture: null
        };
      }
      case "history/redo": {
        const next = state.future.at(-1);
        if (!next) return state;
        return {
          document: keepView(next.document, state.document),
          past: [...state.past, entryOf(state)],
          future: state.future.slice(0, -1),
          selection: onBoard(next.selection, next.document),
          gesture: null
        };
      }
      case "selection/changed": {
        const selection = onBoard(action.ids, state.document);
        if (sameIds(selection, state.selection)) return state;
        return { ...state, selection };
      }
      case "selection/toggled": {
        if (!onBoard([action.id], state.document).length) return state;
        const selection = state.selection.includes(action.id) ? state.selection.filter((id) => id !== action.id) : [...state.selection, action.id];
        return { ...state, selection };
      }
      // Opening another board is not an edit of this one: its history starts empty.
      case "board/loaded":
        return createSession(action.document);
      default:
        return applyEdit(state, action);
    }
  }
  function keepView(restored, current) {
    if (restored.viewport === current.viewport) return restored;
    return { ...restored, viewport: current.viewport };
  }
  function applyEdit(state, action) {
    const document2 = boardReducer(state.document, action);
    if (document2 === state.document) return state;
    if (!isUndoable(action)) return { ...state, document: document2 };
    const gesture = gestureOf(action);
    const folds = gesture !== null && gesture === state.gesture;
    return {
      document: document2,
      past: folds ? state.past : [...state.past, entryOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      selection: onBoard(state.selection, document2),
      gesture
    };
  }
  function entryOf(state) {
    return { document: state.document, selection: state.selection };
  }
  function gestureOf(action) {
    return "gesture" in action && typeof action.gesture === "string" ? action.gesture : null;
  }
  function onBoard(ids, document2) {
    return ids.filter((id) => document2.items.some((item) => item.id === id));
  }
  function sameIds(a5, b5) {
    return a5.length === b5.length && a5.every((id, index) => id === b5[index]);
  }

  // src/label.tsx
  var OUTLINE_PX = 2;
  function Label({
    item,
    selected,
    editing,
    zoom,
    locked,
    onEdit,
    onText,
    onEditEnd
  }) {
    const editor = A2(null);
    h2(() => {
      const field = editor.current;
      if (!editing || !field) return;
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }, [editing]);
    const style = {
      left: `${item.x}px`,
      top: `${item.y}px`,
      fontSize: `${LABEL_PX[item.size]}px`,
      color: STROKE_HEX[item.color]
    };
    if (editing) {
      return /* @__PURE__ */ u5("div", { class: "label label--editing", "data-testid": "label", "data-label-id": item.id, style, children: /* @__PURE__ */ u5("div", { class: "label__grow", "data-value": item.text, children: /* @__PURE__ */ u5(
        "textarea",
        {
          ref: editor,
          class: "label__editor",
          "aria-label": "Label text",
          value: item.text,
          onInput: (event) => onText(item.id, event.currentTarget.value),
          onPointerDown: (event) => event.stopPropagation(),
          onDblClick: (event) => event.stopPropagation(),
          onKeyDown: (event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            onEditEnd();
          },
          onBlur: () => onEditEnd()
        }
      ) }) });
    }
    return /* @__PURE__ */ u5(
      "div",
      {
        class: `label${selected ? " label--selected" : ""}`,
        "data-testid": "label",
        "data-label-id": item.id,
        style: {
          ...style,
          outlineWidth: `${OUTLINE_PX / zoom}px`,
          outlineOffset: `${OUTLINE_PX / zoom}px`
        },
        onDblClick: (event) => {
          if (locked) return;
          event.stopPropagation();
          onEdit(item.id);
        },
        children: item.text
      }
    );
  }

  // src/format.ts
  function applyFormat(kind, current) {
    switch (kind) {
      case "bold":
        return wrap2(current, "**", "bold");
      case "italic":
        return wrap2(current, "*", "italic");
      case "code":
        return wrap2(current, "`", "code");
      case "heading":
        return editLines(current, heading);
      case "bullet":
        return editLines(current, (lines) => list(lines, "- ", isBullet));
      case "task":
        return editLines(current, (lines) => list(lines, "- [ ] ", isTask));
      case "codeblock":
        return fence(current);
      case "link":
        return link(current);
    }
  }
  var BULLET = /^[-*+] +/;
  var TASK = /^[-*+] +\[[ xX]\] +/;
  var HEADING = /^(#{1,6}) +/;
  var MAX_HEADING = 3;
  function wrap2(current, marker, placeholder) {
    const { text: text3, start, end } = current;
    const char = marker[0] ?? "";
    const wrapped = start !== end && run(text3, start, -1, char) === marker.length && run(text3, end, 1, char) === marker.length;
    if (wrapped) {
      const stripped = text3.slice(0, start - marker.length) + text3.slice(start, end) + text3.slice(end + marker.length);
      return { text: stripped, start: start - marker.length, end: end - marker.length };
    }
    const inner = start === end ? placeholder : text3.slice(start, end);
    return {
      text: `${text3.slice(0, start)}${marker}${inner}${marker}${text3.slice(end)}`,
      start: start + marker.length,
      end: start + marker.length + inner.length
    };
  }
  function run(text3, index, step, char) {
    let count = 0;
    for (; ; ) {
      const at3 = step === -1 ? index - count - 1 : index + count;
      if (at3 < 0 || at3 >= text3.length || text3[at3] !== char) return count;
      count += 1;
    }
  }
  function lineRange({ text: text3, start, end }) {
    const from = start === 0 ? 0 : text3.lastIndexOf("\n", start - 1) + 1;
    const last = end > start && text3[end - 1] === "\n" ? end - 1 : end;
    const breakAfter = text3.indexOf("\n", last);
    return { from, to: breakAfter === -1 ? text3.length : breakAfter };
  }
  function editLines(current, transform) {
    const { text: text3, start, end } = current;
    const { from, to } = lineRange(current);
    const before = text3.slice(from, to).split("\n");
    const after = transform(before);
    const replaced = after.join("\n");
    const rewritten = text3.slice(0, from) + replaced + text3.slice(to);
    if (start !== end) return { text: rewritten, start: from, end: from + replaced.length };
    const shift = (after[0]?.length ?? 0) - (before[0]?.length ?? 0);
    const caret = Math.max(from, start + shift);
    return { text: rewritten, start: caret, end: caret };
  }
  function heading(lines) {
    const current = HEADING.exec(indented(lines[0] ?? "").body)?.[1]?.length ?? 0;
    const level = current >= MAX_HEADING ? 0 : current + 1;
    return lines.map((line, index) => {
      if (!marks(lines, index)) return line;
      const { indent, body } = indented(line);
      const prefix = level === 0 ? "" : `${"#".repeat(level)} `;
      return `${indent}${prefix}${plain(body)}`;
    });
  }
  function list(lines, prefix, has) {
    const marked = lines.filter((line, index) => marks(lines, index));
    const clear = marked.length > 0 && marked.every((line) => has(indented(line).body));
    return lines.map((line, index) => {
      if (!marks(lines, index)) return line;
      const { indent, body } = indented(line);
      return `${indent}${clear ? "" : prefix}${plain(body)}`;
    });
  }
  function plain(body) {
    return body.replace(HEADING, "").replace(TASK, "").replace(BULLET, "");
  }
  function isBullet(body) {
    return BULLET.test(body) && !TASK.test(body);
  }
  function isTask(body) {
    return TASK.test(body);
  }
  function marks(lines, index) {
    return lines.length === 1 || (lines[index] ?? "").trim().length > 0;
  }
  function indented(line) {
    const indent = /^[ \t]*/.exec(line)?.[0] ?? "";
    return { indent, body: line.slice(indent.length) };
  }
  function fence(current) {
    const { text: text3 } = current;
    const { from, to } = lineRange(current);
    const block = text3.slice(from, to);
    const inner = block.length > 0 ? block : "code";
    const opened = "```\n";
    const body = `${opened}${inner}
\`\`\``;
    return {
      text: text3.slice(0, from) + body + text3.slice(to),
      start: from + opened.length,
      end: from + opened.length + inner.length
    };
  }
  function link(current) {
    const { text: text3, start, end } = current;
    const named = start !== end;
    const label = named ? text3.slice(start, end) : "text";
    const url = "url";
    const rewritten = `${text3.slice(0, start)}[${label}](${url})${text3.slice(end)}`;
    const at3 = named ? start + label.length + 3 : start + 1;
    return { text: rewritten, start: at3, end: at3 + (named ? url.length : label.length) };
  }

  // node_modules/dompurify/dist/purify.es.mjs
  function _arrayLikeToArray(r5, a5) {
    (null == a5 || a5 > r5.length) && (a5 = r5.length);
    for (var e5 = 0, n4 = Array(a5); e5 < a5; e5++) n4[e5] = r5[e5];
    return n4;
  }
  function _arrayWithHoles(r5) {
    if (Array.isArray(r5)) return r5;
  }
  function _iterableToArrayLimit(r5, l7) {
    var t5 = null == r5 ? null : "undefined" != typeof Symbol && r5[Symbol.iterator] || r5["@@iterator"];
    if (null != t5) {
      var e5, n4, i5, u6, a5 = [], f7 = true, o5 = false;
      try {
        if (i5 = (t5 = t5.call(r5)).next, 0 === l7) ;
        else for (; !(f7 = (e5 = i5.call(t5)).done) && (a5.push(e5.value), a5.length !== l7); f7 = true) ;
      } catch (r6) {
        o5 = true, n4 = r6;
      } finally {
        try {
          if (!f7 && null != t5.return && (u6 = t5.return(), Object(u6) !== u6)) return;
        } finally {
          if (o5) throw n4;
        }
      }
      return a5;
    }
  }
  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _slicedToArray(r5, e5) {
    return _arrayWithHoles(r5) || _iterableToArrayLimit(r5, e5) || _unsupportedIterableToArray(r5, e5) || _nonIterableRest();
  }
  function _unsupportedIterableToArray(r5, a5) {
    if (r5) {
      if ("string" == typeof r5) return _arrayLikeToArray(r5, a5);
      var t5 = {}.toString.call(r5).slice(8, -1);
      return "Object" === t5 && r5.constructor && (t5 = r5.constructor.name), "Map" === t5 || "Set" === t5 ? Array.from(r5) : "Arguments" === t5 || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t5) ? _arrayLikeToArray(r5, a5) : void 0;
    }
  }
  var entries = Object.entries;
  var setPrototypeOf = Object.setPrototypeOf;
  var isFrozen = Object.isFrozen;
  var getPrototypeOf = Object.getPrototypeOf;
  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var freeze = Object.freeze;
  var seal = Object.seal;
  var create = Object.create;
  var _ref = typeof Reflect !== "undefined" && Reflect;
  var apply = _ref.apply;
  var construct = _ref.construct;
  if (!freeze) {
    freeze = function freeze2(x5) {
      return x5;
    };
  }
  if (!seal) {
    seal = function seal2(x5) {
      return x5;
    };
  }
  if (!apply) {
    apply = function apply2(func, thisArg) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }
      return func.apply(thisArg, args);
    };
  }
  if (!construct) {
    construct = function construct2(Func) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      return new Func(...args);
    };
  }
  var arrayForEach = unapply(Array.prototype.forEach);
  var arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
  var arrayPop = unapply(Array.prototype.pop);
  var arrayPush = unapply(Array.prototype.push);
  var arraySplice = unapply(Array.prototype.splice);
  var arrayIsArray = Array.isArray;
  var stringToLowerCase = unapply(String.prototype.toLowerCase);
  var stringToString = unapply(String.prototype.toString);
  var stringMatch = unapply(String.prototype.match);
  var stringReplace = unapply(String.prototype.replace);
  var stringIndexOf = unapply(String.prototype.indexOf);
  var stringTrim = unapply(String.prototype.trim);
  var numberToString = unapply(Number.prototype.toString);
  var booleanToString = unapply(Boolean.prototype.toString);
  var bigintToString = typeof BigInt === "undefined" ? null : unapply(BigInt.prototype.toString);
  var symbolToString = typeof Symbol === "undefined" ? null : unapply(Symbol.prototype.toString);
  var objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
  var objectToString = unapply(Object.prototype.toString);
  var regExpTest = unapply(RegExp.prototype.test);
  var typeErrorCreate = unconstruct(TypeError);
  function unapply(func) {
    return function(thisArg) {
      if (thisArg instanceof RegExp) {
        thisArg.lastIndex = 0;
      }
      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }
      return apply(func, thisArg, args);
    };
  }
  function unconstruct(Func) {
    return function() {
      for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }
      return construct(Func, args);
    };
  }
  function addToSet(set, array) {
    let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
    if (setPrototypeOf) {
      setPrototypeOf(set, null);
    }
    if (!arrayIsArray(array)) {
      return set;
    }
    let l7 = array.length;
    while (l7--) {
      let element = array[l7];
      if (typeof element === "string") {
        const lcElement = transformCaseFunc(element);
        if (lcElement !== element) {
          if (!isFrozen(array)) {
            array[l7] = lcElement;
          }
          element = lcElement;
        }
      }
      set[element] = true;
    }
    return set;
  }
  function cleanArray(array) {
    for (let index = 0; index < array.length; index++) {
      const isPropertyExist = objectHasOwnProperty(array, index);
      if (!isPropertyExist) {
        array[index] = null;
      }
    }
    return array;
  }
  function clone(object) {
    const newObject = create(null);
    for (const _ref2 of entries(object)) {
      var _ref3 = _slicedToArray(_ref2, 2);
      const property = _ref3[0];
      const value = _ref3[1];
      const isPropertyExist = objectHasOwnProperty(object, property);
      if (isPropertyExist) {
        if (arrayIsArray(value)) {
          newObject[property] = cleanArray(value);
        } else if (value && typeof value === "object" && value.constructor === Object) {
          newObject[property] = clone(value);
        } else {
          newObject[property] = value;
        }
      }
    }
    return newObject;
  }
  function stringifyValue(value) {
    switch (typeof value) {
      case "string": {
        return value;
      }
      case "number": {
        return numberToString(value);
      }
      case "boolean": {
        return booleanToString(value);
      }
      case "bigint": {
        return bigintToString ? bigintToString(value) : "0";
      }
      case "symbol": {
        return symbolToString ? symbolToString(value) : "Symbol()";
      }
      case "undefined": {
        return objectToString(value);
      }
      case "function":
      case "object": {
        if (value === null) {
          return objectToString(value);
        }
        const valueAsRecord = value;
        const valueToString = lookupGetter(valueAsRecord, "toString");
        if (typeof valueToString === "function") {
          const stringified = valueToString(valueAsRecord);
          return typeof stringified === "string" ? stringified : objectToString(stringified);
        }
        return objectToString(value);
      }
      default: {
        return objectToString(value);
      }
    }
  }
  function lookupGetter(object, prop) {
    while (object !== null) {
      const desc = getOwnPropertyDescriptor(object, prop);
      if (desc) {
        if (desc.get) {
          return unapply(desc.get);
        }
        if (typeof desc.value === "function") {
          return unapply(desc.value);
        }
      }
      object = getPrototypeOf(object);
    }
    function fallbackValue() {
      return null;
    }
    return fallbackValue;
  }
  function isRegex(value) {
    try {
      regExpTest(value, "");
      return true;
    } catch (_unused) {
      return false;
    }
  }
  var html$1 = freeze(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]);
  var svg$1 = freeze(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]);
  var svgFilters = freeze(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]);
  var svgDisallowed = freeze(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]);
  var mathMl$1 = freeze(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]);
  var mathMlDisallowed = freeze(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]);
  var text2 = freeze(["#text"]);
  var html = freeze(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "command", "commandfor", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns"]);
  var svg = freeze(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dominant-baseline", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "pointer-events", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-orientation", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "vector-effect", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]);
  var mathMl = freeze(["accent", "accentunder", "align", "bevelled", "close", "columnalign", "columnlines", "columnspacing", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lquote", "lspace", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]);
  var xml = freeze(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]);
  var MUSTACHE_EXPR = seal(/{{[\w\W]*|^[\w\W]*}}/g);
  var ERB_EXPR = seal(/<%[\w\W]*|^[\w\W]*%>/g);
  var TMPLIT_EXPR = seal(/\${[\w\W]*/g);
  var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
  var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
  var IS_ALLOWED_URI = seal(
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    // eslint-disable-line no-useless-escape
  );
  var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
  var ATTR_WHITESPACE = seal(
    /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
    // eslint-disable-line no-control-regex
  );
  var DOCTYPE_NAME = seal(/^html$/i);
  var CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
  var ELEMENT_MARKUP_PROBE = seal(/<[/\w!]/g);
  var COMMENT_MARKUP_PROBE = seal(/<[/\w]/g);
  var FALLBACK_TAG_CLOSE = seal(/<\/no(script|embed|frames)/i);
  var SELF_CLOSING_TAG = seal(/\/>/i);
  var NODE_TYPE = {
    element: 1,
    attribute: 2,
    text: 3,
    cdataSection: 4,
    entityReference: 5,
    // Deprecated
    entityNode: 6,
    // Deprecated
    processingInstruction: 7,
    comment: 8,
    document: 9,
    documentType: 10,
    documentFragment: 11,
    notation: 12
    // Deprecated
  };
  var LITERAL_TEXT_ELEMENT_NAMES = ["style", "script", "xmp", "iframe", "noembed", "noframes", "plaintext", "noscript"];
  var LITERAL_TEXT_ELEMENTS = freeze(addToSet({}, LITERAL_TEXT_ELEMENT_NAMES));
  var LITERAL_TEXT_CLOSE = (function() {
    const map = {};
    arrayForEach(LITERAL_TEXT_ELEMENT_NAMES, (name) => {
      map[name] = seal(new RegExp("</" + name + "(?=[\\t\\n\\f\\r />])", "i"));
    });
    return freeze(map);
  })();
  var getGlobal = function getGlobal2() {
    return typeof window === "undefined" ? null : window;
  };
  var _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, purifyHostElement) {
    if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") {
      return null;
    }
    let suffix = null;
    const ATTR_NAME = "data-tt-policy-suffix";
    if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) {
      suffix = purifyHostElement.getAttribute(ATTR_NAME);
    }
    const policyName = "dompurify" + (suffix ? "#" + suffix : "");
    try {
      return trustedTypes.createPolicy(policyName, {
        createHTML(html2) {
          return html2;
        },
        createScriptURL(scriptUrl) {
          return scriptUrl;
        }
      });
    } catch (_6) {
      console.warn("TrustedTypes policy " + policyName + " could not be created.");
      return null;
    }
  };
  var _createHooksMap = function _createHooksMap2() {
    return {
      afterSanitizeAttributes: [],
      afterSanitizeElements: [],
      afterSanitizeShadowDOM: [],
      beforeSanitizeAttributes: [],
      beforeSanitizeElements: [],
      beforeSanitizeShadowDOM: [],
      uponSanitizeAttribute: [],
      uponSanitizeElement: [],
      uponSanitizeShadowNode: []
    };
  };
  var _resolveSetOption = function _resolveSetOption2(cfg, key, fallback, options) {
    return objectHasOwnProperty(cfg, key) && arrayIsArray(cfg[key]) ? addToSet(options.base ? clone(options.base) : {}, cfg[key], options.transform) : fallback;
  };
  var _resolveObjectOption = function _resolveObjectOption2(cfg, key, makeFallback) {
    const value = objectHasOwnProperty(cfg, key) ? cfg[key] : void 0;
    return value && typeof value === "object" ? clone(value) : makeFallback();
  };
  function createDOMPurify() {
    let window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
    const DOMPurify = (root2) => createDOMPurify(root2);
    DOMPurify.version = "3.4.14";
    DOMPurify.removed = [];
    if (!window2 || !window2.document || window2.document.nodeType !== NODE_TYPE.document || !window2.Element) {
      DOMPurify.isSupported = false;
      return DOMPurify;
    }
    let document2 = window2.document;
    const originalDocument = document2;
    const currentScript = originalDocument.currentScript;
    window2.DocumentFragment;
    const HTMLTemplateElement = window2.HTMLTemplateElement, Node2 = window2.Node, Element2 = window2.Element, NodeFilter = window2.NodeFilter, _window$NamedNodeMap = window2.NamedNodeMap;
    _window$NamedNodeMap === void 0 ? window2.NamedNodeMap || window2.MozNamedAttrMap : _window$NamedNodeMap;
    window2.HTMLFormElement;
    const DOMParser = window2.DOMParser, trustedTypes = window2.trustedTypes;
    const ElementPrototype = Element2.prototype;
    const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
    const remove = lookupGetter(ElementPrototype, "remove");
    const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
    const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
    const getParentNode = lookupGetter(ElementPrototype, "parentNode");
    const getShadowRoot = lookupGetter(ElementPrototype, "shadowRoot");
    const getAttributes = lookupGetter(ElementPrototype, "attributes");
    const getNodeType = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "nodeType") : null;
    const getNodeName = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "nodeName") : null;
    const getOwnerDocument = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "ownerDocument") : null;
    const _readNodeType = function _readNodeType2(node) {
      return getNodeType ? getNodeType(node) : node.nodeType;
    };
    const _readNodeName = function _readNodeName2(node) {
      return getNodeName ? getNodeName(node) : node.nodeName;
    };
    if (typeof HTMLTemplateElement === "function") {
      const template = document2.createElement("template");
      if (template.content && template.content.ownerDocument) {
        document2 = template.content.ownerDocument;
      }
    }
    let trustedTypesPolicy;
    let emptyHTML = "";
    let defaultTrustedTypesPolicy;
    let defaultTrustedTypesPolicyResolved = false;
    let IN_TRUSTED_TYPES_POLICY = 0;
    const _assertNotInTrustedTypesPolicy = function _assertNotInTrustedTypesPolicy2() {
      if (IN_TRUSTED_TYPES_POLICY > 0) {
        throw typeErrorCreate('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
      }
    };
    const _createTrustedHTML = function _createTrustedHTML2(html2) {
      _assertNotInTrustedTypesPolicy();
      IN_TRUSTED_TYPES_POLICY++;
      try {
        return trustedTypesPolicy.createHTML(html2);
      } finally {
        IN_TRUSTED_TYPES_POLICY--;
      }
    };
    const _createTrustedScriptURL = function _createTrustedScriptURL2(scriptUrl) {
      _assertNotInTrustedTypesPolicy();
      IN_TRUSTED_TYPES_POLICY++;
      try {
        return trustedTypesPolicy.createScriptURL(scriptUrl);
      } finally {
        IN_TRUSTED_TYPES_POLICY--;
      }
    };
    const _getDefaultTrustedTypesPolicy = function _getDefaultTrustedTypesPolicy2() {
      if (!defaultTrustedTypesPolicyResolved) {
        defaultTrustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
        defaultTrustedTypesPolicyResolved = true;
      }
      return defaultTrustedTypesPolicy;
    };
    const _document = document2, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, createDocumentFragment = _document.createDocumentFragment, getElementsByTagName = _document.getElementsByTagName;
    const importNode = originalDocument.importNode;
    let hooks = _createHooksMap();
    DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
    const MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE, CUSTOM_ELEMENT$1 = CUSTOM_ELEMENT;
    let IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
    let ALLOWED_TAGS = null;
    const DEFAULT_ALLOWED_TAGS = addToSet({}, [...html$1, ...svg$1, ...svgFilters, ...mathMl$1, ...text2]);
    let ALLOWED_ATTR = null;
    const DEFAULT_ALLOWED_ATTR = addToSet({}, [...html, ...svg, ...mathMl, ...xml]);
    let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
      tagNameCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      attributeNameCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      allowCustomizedBuiltInElements: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: false
      }
    }));
    let FORBID_TAGS = null;
    let FORBID_ATTR = null;
    const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
      tagCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      attributeCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      }
    }));
    let ALLOW_ARIA_ATTR = true;
    let ALLOW_DATA_ATTR = true;
    let ALLOW_UNKNOWN_PROTOCOLS = false;
    let ALLOW_SELF_CLOSE_IN_ATTR = true;
    let SAFE_FOR_TEMPLATES = false;
    let SAFE_FOR_XML = true;
    let WHOLE_DOCUMENT = false;
    let SET_CONFIG = false;
    let SET_CONFIG_ALLOWED_TAGS = null;
    let SET_CONFIG_ALLOWED_ATTR = null;
    let FORCE_BODY = false;
    let RETURN_DOM = false;
    let RETURN_DOM_FRAGMENT = false;
    let RETURN_TRUSTED_TYPE = false;
    let SANITIZE_DOM = true;
    let SANITIZE_NAMED_PROPS = false;
    const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
    let KEEP_CONTENT = true;
    let IN_PLACE = false;
    let USE_PROFILES = {};
    let FORBID_CONTENTS = null;
    const DEFAULT_FORBID_CONTENTS = addToSet({}, [
      "annotation-xml",
      "audio",
      "colgroup",
      "desc",
      "foreignobject",
      "head",
      "iframe",
      "math",
      "mi",
      "mn",
      "mo",
      "ms",
      "mtext",
      "noembed",
      "noframes",
      "noscript",
      "plaintext",
      "script",
      // <selectedcontent> mirrors the selected <option>'s subtree, cloned by
      // the UA (customizable <select>) — including any on* handlers — and the
      // engine re-mirrors synchronously whenever a removal changes which
      // option/selectedcontent is current, even inside DOMPurify's inert
      // DOMParser document. Hoisting its children on removal re-inserts a fresh
      // mirror target ahead of the walk, which the engine refills, looping
      // forever (DoS) and amplifying output. Dropping its content on removal
      // (rather than hoisting) breaks that cascade; the content is a duplicate
      // of the option, which is sanitized on its own. See campaign-3 F1/F6.
      "selectedcontent",
      "style",
      "svg",
      "template",
      "thead",
      "title",
      "video",
      "xmp"
    ]);
    let DATA_URI_TAGS = null;
    const DEFAULT_DATA_URI_TAGS = addToSet({}, ["audio", "video", "img", "source", "image", "track"]);
    let URI_SAFE_ATTRIBUTES = null;
    const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]);
    const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
    let NAMESPACE = HTML_NAMESPACE;
    let IS_EMPTY_INPUT = false;
    let ALLOWED_NAMESPACES = null;
    const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);
    const DEFAULT_MATHML_TEXT_INTEGRATION_POINTS = freeze(["mi", "mo", "mn", "ms", "mtext"]);
    let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
    const DEFAULT_HTML_INTEGRATION_POINTS = freeze(["annotation-xml"]);
    let HTML_INTEGRATION_POINTS = addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
    const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ["title", "style", "font", "a", "script"]);
    let PARSER_MEDIA_TYPE = null;
    const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
    const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
    let transformCaseFunc = null;
    let CONFIG = null;
    const formElement = document2.createElement("form");
    const isRegexOrFunction = function isRegexOrFunction2(testValue) {
      return testValue instanceof RegExp || testValue instanceof Function;
    };
    const _parseConfig = function _parseConfig2() {
      let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      if (CONFIG && CONFIG === cfg) {
        return;
      }
      if (!cfg || typeof cfg !== "object") {
        cfg = {};
      }
      cfg = clone(cfg);
      PARSER_MEDIA_TYPE = // eslint-disable-next-line unicorn/prefer-includes
      SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
      transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
      ALLOWED_TAGS = _resolveSetOption(cfg, "ALLOWED_TAGS", DEFAULT_ALLOWED_TAGS, {
        transform: transformCaseFunc
      });
      ALLOWED_ATTR = _resolveSetOption(cfg, "ALLOWED_ATTR", DEFAULT_ALLOWED_ATTR, {
        transform: transformCaseFunc
      });
      ALLOWED_NAMESPACES = _resolveSetOption(cfg, "ALLOWED_NAMESPACES", DEFAULT_ALLOWED_NAMESPACES, {
        transform: stringToString
      });
      URI_SAFE_ATTRIBUTES = _resolveSetOption(cfg, "ADD_URI_SAFE_ATTR", DEFAULT_URI_SAFE_ATTRIBUTES, {
        transform: transformCaseFunc,
        base: DEFAULT_URI_SAFE_ATTRIBUTES
      });
      DATA_URI_TAGS = _resolveSetOption(cfg, "ADD_DATA_URI_TAGS", DEFAULT_DATA_URI_TAGS, {
        transform: transformCaseFunc,
        base: DEFAULT_DATA_URI_TAGS
      });
      FORBID_CONTENTS = _resolveSetOption(cfg, "FORBID_CONTENTS", DEFAULT_FORBID_CONTENTS, {
        transform: transformCaseFunc
      });
      FORBID_TAGS = _resolveSetOption(cfg, "FORBID_TAGS", clone({}), {
        transform: transformCaseFunc
      });
      FORBID_ATTR = _resolveSetOption(cfg, "FORBID_ATTR", clone({}), {
        transform: transformCaseFunc
      });
      USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES && typeof cfg.USE_PROFILES === "object" ? clone(cfg.USE_PROFILES) : cfg.USE_PROFILES : false;
      ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
      ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
      ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
      ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
      SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
      SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
      WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
      RETURN_DOM = cfg.RETURN_DOM || false;
      RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
      RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
      FORCE_BODY = cfg.FORCE_BODY || false;
      SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
      SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
      KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
      IN_PLACE = cfg.IN_PLACE || false;
      IS_ALLOWED_URI$1 = isRegex(cfg.ALLOWED_URI_REGEXP) ? cfg.ALLOWED_URI_REGEXP : IS_ALLOWED_URI;
      NAMESPACE = typeof cfg.NAMESPACE === "string" ? cfg.NAMESPACE : HTML_NAMESPACE;
      MATHML_TEXT_INTEGRATION_POINTS = _resolveObjectOption(
        cfg,
        "MATHML_TEXT_INTEGRATION_POINTS",
        () => addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS)
        // Default built-in map
      );
      HTML_INTEGRATION_POINTS = _resolveObjectOption(
        cfg,
        "HTML_INTEGRATION_POINTS",
        () => addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS)
        // Default built-in map
      );
      const customElementHandling = _resolveObjectOption(cfg, "CUSTOM_ELEMENT_HANDLING", () => create(null));
      CUSTOM_ELEMENT_HANDLING = create(null);
      if (objectHasOwnProperty(customElementHandling, "tagNameCheck") && isRegexOrFunction(customElementHandling.tagNameCheck)) {
        CUSTOM_ELEMENT_HANDLING.tagNameCheck = customElementHandling.tagNameCheck;
      }
      if (objectHasOwnProperty(customElementHandling, "attributeNameCheck") && isRegexOrFunction(customElementHandling.attributeNameCheck)) {
        CUSTOM_ELEMENT_HANDLING.attributeNameCheck = customElementHandling.attributeNameCheck;
      }
      if (objectHasOwnProperty(customElementHandling, "allowCustomizedBuiltInElements") && typeof customElementHandling.allowCustomizedBuiltInElements === "boolean") {
        CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = customElementHandling.allowCustomizedBuiltInElements;
      }
      seal(CUSTOM_ELEMENT_HANDLING);
      if (SAFE_FOR_TEMPLATES) {
        ALLOW_DATA_ATTR = false;
      }
      if (RETURN_DOM_FRAGMENT) {
        RETURN_DOM = true;
      }
      if (USE_PROFILES) {
        ALLOWED_TAGS = addToSet({}, text2);
        ALLOWED_ATTR = create(null);
        if (USE_PROFILES.html === true) {
          addToSet(ALLOWED_TAGS, html$1);
          addToSet(ALLOWED_ATTR, html);
        }
        if (USE_PROFILES.svg === true) {
          addToSet(ALLOWED_TAGS, svg$1);
          addToSet(ALLOWED_ATTR, svg);
          addToSet(ALLOWED_ATTR, xml);
        }
        if (USE_PROFILES.svgFilters === true) {
          addToSet(ALLOWED_TAGS, svgFilters);
          addToSet(ALLOWED_ATTR, svg);
          addToSet(ALLOWED_ATTR, xml);
        }
        if (USE_PROFILES.mathMl === true) {
          addToSet(ALLOWED_TAGS, mathMl$1);
          addToSet(ALLOWED_ATTR, mathMl);
          addToSet(ALLOWED_ATTR, xml);
        }
      }
      EXTRA_ELEMENT_HANDLING.tagCheck = null;
      EXTRA_ELEMENT_HANDLING.attributeCheck = null;
      if (objectHasOwnProperty(cfg, "ADD_TAGS")) {
        if (typeof cfg.ADD_TAGS === "function") {
          EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
        } else if (arrayIsArray(cfg.ADD_TAGS)) {
          if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
            ALLOWED_TAGS = clone(ALLOWED_TAGS);
          }
          addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
        }
      }
      if (objectHasOwnProperty(cfg, "ADD_ATTR")) {
        if (typeof cfg.ADD_ATTR === "function") {
          EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
        } else if (arrayIsArray(cfg.ADD_ATTR)) {
          if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
            ALLOWED_ATTR = clone(ALLOWED_ATTR);
          }
          addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
        }
      }
      if (objectHasOwnProperty(cfg, "ADD_FORBID_CONTENTS") && arrayIsArray(cfg.ADD_FORBID_CONTENTS)) {
        if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
          FORBID_CONTENTS = clone(FORBID_CONTENTS);
        }
        addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
      }
      if (KEEP_CONTENT) {
        ALLOWED_TAGS["#text"] = true;
      }
      if (WHOLE_DOCUMENT) {
        addToSet(ALLOWED_TAGS, ["html", "head", "body"]);
      }
      if (ALLOWED_TAGS.table) {
        addToSet(ALLOWED_TAGS, ["tbody"]);
        delete FORBID_TAGS.tbody;
      }
      if (cfg.TRUSTED_TYPES_POLICY) {
        if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") {
          throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        }
        if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") {
          throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        }
        const previousTrustedTypesPolicy = trustedTypesPolicy;
        trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
        try {
          emptyHTML = _createTrustedHTML("");
        } catch (error) {
          trustedTypesPolicy = previousTrustedTypesPolicy;
          throw error;
        }
      } else if (cfg.TRUSTED_TYPES_POLICY === null) {
        trustedTypesPolicy = void 0;
        emptyHTML = "";
      } else {
        if (trustedTypesPolicy === void 0) {
          trustedTypesPolicy = _getDefaultTrustedTypesPolicy();
        }
        if (trustedTypesPolicy && typeof emptyHTML === "string") {
          emptyHTML = _createTrustedHTML("");
        }
      }
      if (freeze) {
        freeze(cfg);
      }
      CONFIG = cfg;
    };
    const ALL_SVG_TAGS = addToSet({}, [...svg$1, ...svgFilters, ...svgDisallowed]);
    const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
    const _checkSvgNamespace = function _checkSvgNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === "svg";
      }
      if (parent.namespaceURI === MATHML_NAMESPACE) {
        return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
      }
      return Boolean(ALL_SVG_TAGS[tagName]);
    };
    const _checkMathMlNamespace = function _checkMathMlNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === "math";
      }
      if (parent.namespaceURI === SVG_NAMESPACE) {
        return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
      }
      return Boolean(ALL_MATHML_TAGS[tagName]);
    };
    const _checkHtmlNamespace = function _checkHtmlNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
    };
    const _checkValidNamespace = function _checkValidNamespace2(element) {
      let parent = getParentNode(element);
      if (!parent || !parent.tagName) {
        parent = {
          namespaceURI: NAMESPACE,
          tagName: "template"
        };
      }
      const tagName = stringToLowerCase(element.tagName);
      const parentTagName = stringToLowerCase(parent.tagName);
      if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
        return false;
      }
      if (element.namespaceURI === SVG_NAMESPACE) {
        return _checkSvgNamespace(tagName, parent, parentTagName);
      }
      if (element.namespaceURI === MATHML_NAMESPACE) {
        return _checkMathMlNamespace(tagName, parent, parentTagName);
      }
      if (element.namespaceURI === HTML_NAMESPACE) {
        return _checkHtmlNamespace(tagName, parent, parentTagName);
      }
      if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI]) {
        return true;
      }
      return false;
    };
    const _forceRemove = function _forceRemove2(node) {
      arrayPush(DOMPurify.removed, {
        element: node
      });
      try {
        getParentNode(node).removeChild(node);
      } catch (_6) {
        remove(node);
        if (!getParentNode(node)) {
          throw typeErrorCreate("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
        }
      }
    };
    const _stripAttributeNode = function _stripAttributeNode2(element, attribute, name) {
      try {
        element.removeAttributeNode(attribute);
      } catch (_6) {
        try {
          element.removeAttribute(name);
        } catch (_7) {
        }
      }
    };
    const _neutralizeRoot = function _neutralizeRoot2(root2) {
      _neutralizeSubtree(root2);
      const childNodes = getChildNodes(root2);
      if (childNodes) {
        const snapshot = [];
        arrayForEach(childNodes, (child) => {
          arrayPush(snapshot, child);
        });
        arrayForEach(snapshot, (child) => {
          try {
            remove(child);
          } catch (_6) {
          }
        });
      }
      const attributes = getAttributes(root2);
      if (attributes) {
        for (let i5 = attributes.length - 1; i5 >= 0; --i5) {
          const attribute = attributes[i5];
          const name = attribute && attribute.name;
          if (typeof name === "string") {
            _stripAttributeNode(root2, attribute, name);
          }
        }
      }
    };
    const _removeAttribute = function _removeAttribute2(name, element, attr) {
      if (!attr) {
        try {
          attr = element.getAttributeNode(name);
        } catch (_6) {
          attr = null;
        }
      }
      arrayPush(DOMPurify.removed, {
        attribute: attr || null,
        from: element
      });
      try {
        if (attr) {
          element.removeAttributeNode(attr);
        } else {
          element.removeAttribute(name);
        }
      } catch (_6) {
        try {
          element.removeAttribute(name);
        } catch (_7) {
        }
      }
      if (name === "is") {
        if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
          try {
            _forceRemove(element);
          } catch (_6) {
          }
        } else {
          try {
            element.setAttribute(name, "");
          } catch (_6) {
          }
        }
      }
    };
    const _stripDisallowedAttributes = function _stripDisallowedAttributes2(element) {
      const attributes = getAttributes(element);
      if (!attributes) {
        return;
      }
      for (let i5 = attributes.length - 1; i5 >= 0; --i5) {
        const attribute = attributes[i5];
        const name = attribute && attribute.name;
        if (typeof name !== "string" || ALLOWED_ATTR[transformCaseFunc(name)]) {
          continue;
        }
        _stripAttributeNode(element, attribute, name);
      }
    };
    const _neutralizeSubtree = function _neutralizeSubtree2(root2) {
      const stack = [root2];
      while (stack.length > 0) {
        const node = stack.pop();
        const nodeType = _readNodeType(node);
        if (nodeType === NODE_TYPE.element) {
          _stripDisallowedAttributes(node);
        }
        const childNodes = getChildNodes(node);
        if (childNodes) {
          for (let i5 = childNodes.length - 1; i5 >= 0; --i5) {
            stack.push(childNodes[i5]);
          }
        }
      }
    };
    const _isPatchLinkageAttribute = function _isPatchLinkageAttribute2(lcName, lcTag) {
      if (!SAFE_FOR_XML) {
        return false;
      }
      if (lcName === "patchsrc") {
        return true;
      }
      return lcName === "for" && lcTag !== "label" && lcTag !== "output";
    };
    const _neutralizePatchLinkage = function _neutralizePatchLinkage2(root2) {
      if (!SAFE_FOR_XML) {
        return;
      }
      const stack = [root2];
      while (stack.length > 0) {
        const node = stack.pop();
        const nodeType = _readNodeType(node);
        if (nodeType === NODE_TYPE.processingInstruction || nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, node.data)) {
          try {
            remove(node);
          } catch (_6) {
          }
          continue;
        }
        if (nodeType === NODE_TYPE.element) {
          const element = node;
          const lcTag = transformCaseFunc(_readNodeName(node));
          try {
            if (element.hasAttribute && element.hasAttribute("patchsrc")) {
              element.removeAttribute("patchsrc");
            }
            if (element.hasAttribute && element.hasAttribute("for") && _isPatchLinkageAttribute("for", lcTag)) {
              element.removeAttribute("for");
            }
          } catch (_6) {
          }
        }
        const childNodes = getChildNodes(node);
        if (childNodes) {
          for (let i5 = childNodes.length - 1; i5 >= 0; --i5) {
            stack.push(childNodes[i5]);
          }
        }
      }
    };
    const _initDocument = function _initDocument2(dirty) {
      let doc = null;
      let leadingWhitespace = null;
      if (FORCE_BODY) {
        dirty = "<remove></remove>" + dirty;
      } else {
        const matches = stringMatch(dirty, /^[\r\n\t ]+/);
        leadingWhitespace = matches && matches[0];
      }
      if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) {
        dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
      }
      const dirtyPayload = trustedTypesPolicy ? _createTrustedHTML(dirty) : dirty;
      if (NAMESPACE === HTML_NAMESPACE) {
        try {
          doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
        } catch (_6) {
        }
      }
      if (!doc || !doc.documentElement) {
        doc = implementation.createDocument(NAMESPACE, "template", null);
        try {
          doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
        } catch (_6) {
        }
      }
      const body = doc.body || doc.documentElement;
      if (dirty && leadingWhitespace) {
        body.insertBefore(document2.createTextNode(leadingWhitespace), body.childNodes[0] || null);
      }
      if (NAMESPACE === HTML_NAMESPACE) {
        return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
      }
      return WHOLE_DOCUMENT ? doc.documentElement : body;
    };
    const _createNodeIterator = function _createNodeIterator2(root2) {
      const doc = getOwnerDocument ? getOwnerDocument(root2) : root2.ownerDocument;
      return createNodeIterator.call(
        doc || root2,
        root2,
        // eslint-disable-next-line no-bitwise
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION,
        null
      );
    };
    const _stripTemplateExpressions = function _stripTemplateExpressions2(value) {
      value = stringReplace(value, MUSTACHE_EXPR$1, " ");
      value = stringReplace(value, ERB_EXPR$1, " ");
      value = stringReplace(value, TMPLIT_EXPR$1, " ");
      return value;
    };
    const _scrubTemplateExpressions2 = function _scrubTemplateExpressions(node) {
      var _node$querySelectorAl;
      node.normalize();
      const doc = getOwnerDocument ? getOwnerDocument(node) : node.ownerDocument;
      const walker = createNodeIterator.call(
        doc || node,
        node,
        // eslint-disable-next-line no-bitwise
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_PROCESSING_INSTRUCTION,
        null
      );
      let currentNode = walker.nextNode();
      while (currentNode) {
        currentNode.data = _stripTemplateExpressions(currentNode.data);
        currentNode = walker.nextNode();
      }
      const templates = (_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === void 0 ? void 0 : _node$querySelectorAl.call(node, "template");
      if (templates) {
        arrayForEach(templates, (tmpl) => {
          if (_isDocumentFragment(tmpl.content)) {
            _scrubTemplateExpressions2(tmpl.content);
          }
        });
      }
    };
    const _isClobbered = function _isClobbered2(element) {
      const realTagName = getNodeName ? getNodeName(element) : null;
      if (typeof realTagName !== "string") {
        return false;
      }
      if (transformCaseFunc(realTagName) !== "form") {
        return false;
      }
      return typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || // Realm-safe NamedNodeMap detection: equality against the cached
      // prototype getter. Clobbered .attributes (e.g. <input name="attributes">)
      // makes the direct read diverge from the cached read; a clean form
      // (same-realm OR foreign-realm) has both reads pointing at the same
      // canonical NamedNodeMap.
      element.attributes !== getAttributes(element) || typeof element.removeAttribute !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function" || // NodeType clobbering probe. Cached Node.prototype.nodeType getter
      // returns the integer 1 for any Element regardless of realm; direct
      // read on a clobbered form (e.g. <input name="nodeType">) returns
      // the named child element. Cheap addition — nodeType is read from
      // an internal slot, no serialization cost — and removes a residual
      // clobbering surface used by several mXSS / PI / comment branches
      // in _sanitizeElements that compare currentNode.nodeType directly.
      element.nodeType !== getNodeType(element) || // HTMLFormElement has [LegacyOverrideBuiltIns]: a descendant named
      // "childNodes" shadows the prototype getter. Direct reads of
      // form.childNodes from a clobbered form return the named child
      // instead of the real NodeList, so any walk that reads it directly
      // skips the form's real children. Compare the direct read to the
      // cached Node.prototype getter — when the form's named-property
      // getter intercepts the read, the two values differ and we flag
      // the form. This catches every clobbering child type (input,
      // select, etc.) regardless of whether the named child happens to
      // carry a numeric .length, which a typeof-based probe would miss
      // (e.g. HTMLSelectElement.length is a defined unsigned-long).
      element.childNodes !== getChildNodes(element);
    };
    const _isDocumentFragment = function _isDocumentFragment2(value) {
      if (!getNodeType || typeof value !== "object" || value === null) {
        return false;
      }
      try {
        return getNodeType(value) === NODE_TYPE.documentFragment;
      } catch (_6) {
        return false;
      }
    };
    const _isNode = function _isNode2(value) {
      if (!getNodeType || typeof value !== "object" || value === null) {
        return false;
      }
      try {
        return typeof getNodeType(value) === "number";
      } catch (_6) {
        return false;
      }
    };
    function _executeHooks(hooks2, currentNode, data) {
      if (hooks2.length === 0) {
        return;
      }
      arrayForEach(hooks2, (hook) => {
        hook.call(DOMPurify, currentNode, data, CONFIG);
      });
    }
    const _isUnsafeNode = function _isUnsafeNode2(currentNode, tagName) {
      if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.innerHTML)) {
        return true;
      }
      if (SAFE_FOR_XML && currentNode.namespaceURI === HTML_NAMESPACE && LITERAL_TEXT_ELEMENTS[tagName] && (_isNode(currentNode.firstElementChild) || typeof currentNode.textContent === "string" && regExpTest(LITERAL_TEXT_CLOSE[tagName], currentNode.textContent))) {
        return true;
      }
      if (currentNode.nodeType === NODE_TYPE.processingInstruction) {
        return true;
      }
      if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, currentNode.data)) {
        return true;
      }
      return false;
    };
    const _matchesNameCheck = function _matchesNameCheck2(check, name) {
      if (check instanceof RegExp) {
        return regExpTest(check, name);
      }
      if (check instanceof Function) {
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return Boolean(check(name, ...args));
      }
      return false;
    };
    const _sanitizeDisallowedNode = function _sanitizeDisallowedNode2(currentNode, tagName, root2) {
      if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) {
        return false;
      }
      if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
        const parentNode = getParentNode(currentNode);
        const childNodes = getChildNodes(currentNode);
        if (childNodes && parentNode) {
          const childCount = childNodes.length;
          for (let i5 = childCount - 1; i5 >= 0; --i5) {
            const hoisted = currentNode === root2 ? cloneNode(childNodes[i5], true) : childNodes[i5];
            parentNode.insertBefore(hoisted, getNextSibling(currentNode));
          }
        }
      }
      _forceRemove(currentNode);
      return true;
    };
    const _forkSharedAllowlist = function _forkSharedAllowlist2(hookList, set, defaultSet, setConfigSet) {
      if (hookList.length === 0) {
        return set;
      }
      return set === defaultSet || set === setConfigSet ? clone(set) : set;
    };
    const _handleHookDetachedNode = function _handleHookDetachedNode2(currentNode, root2) {
      if (currentNode === root2 || getParentNode(currentNode) !== null) {
        return false;
      }
      if (IN_PLACE) {
        _neutralizeSubtree(currentNode);
      }
      return true;
    };
    const _sanitizeElements = function _sanitizeElements2(currentNode, root2) {
      _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
      if (_handleHookDetachedNode(currentNode, root2)) {
        return true;
      }
      if (_isClobbered(currentNode)) {
        _forceRemove(currentNode);
        return true;
      }
      const tagName = transformCaseFunc(_readNodeName(currentNode));
      ALLOWED_TAGS = _forkSharedAllowlist(hooks.uponSanitizeElement, ALLOWED_TAGS, DEFAULT_ALLOWED_TAGS, SET_CONFIG_ALLOWED_TAGS);
      _executeHooks(hooks.uponSanitizeElement, currentNode, {
        tagName,
        allowedTags: ALLOWED_TAGS
      });
      if (_handleHookDetachedNode(currentNode, root2)) {
        return true;
      }
      if (_isUnsafeNode(currentNode, tagName)) {
        _forceRemove(currentNode);
        return true;
      }
      if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
        const removed = _sanitizeDisallowedNode(currentNode, tagName, root2);
        if (removed === false) {
          _executeHooks(hooks.afterSanitizeElements, currentNode, null);
        }
        return removed;
      }
      const nt3 = _readNodeType(currentNode);
      if (nt3 === NODE_TYPE.element && !_checkValidNamespace(currentNode)) {
        _forceRemove(currentNode);
        return true;
      }
      if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(FALLBACK_TAG_CLOSE, currentNode.innerHTML)) {
        _forceRemove(currentNode);
        return true;
      }
      if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
        const content = _stripTemplateExpressions(currentNode.textContent);
        if (currentNode.textContent !== content) {
          arrayPush(DOMPurify.removed, {
            element: currentNode.cloneNode()
          });
          currentNode.textContent = content;
        }
      }
      _executeHooks(hooks.afterSanitizeElements, currentNode, null);
      return false;
    };
    const _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
      if (FORBID_ATTR[lcName]) {
        return false;
      }
      if (_isPatchLinkageAttribute(lcName, lcTag)) {
        return false;
      }
      if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document2 || value in formElement)) {
        return false;
      }
      const nameIsPermitted = ALLOWED_ATTR[lcName] || EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag);
      if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$1, lcName)) {
        return true;
      }
      if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName)) {
        return true;
      }
      if (!nameIsPermitted) {
        return (
          // Condition a) covers a basically valid custom element tag name whose
          // tag passes the configured tagNameCheck and whose attribute name
          // passes the configured attributeNameCheck ...
          _isBasicCustomElement(lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName, lcTag) || // Condition b) covers an `is` attribute whose value passes the
          // configured tagNameCheck while customized built-in elements are
          // allowed.
          lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value)
        );
      }
      if (URI_SAFE_ATTRIBUTES[lcName]) {
        return true;
      }
      if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) {
        return true;
      }
      if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]) {
        return true;
      }
      if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) {
        return true;
      }
      return !value;
    };
    const RESERVED_CUSTOM_ELEMENT_NAMES = addToSet({}, ["annotation-xml", "color-profile", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "missing-glyph"]);
    const _isBasicCustomElement = function _isBasicCustomElement2(tagName) {
      return !RESERVED_CUSTOM_ELEMENT_NAMES[stringToLowerCase(tagName)] && regExpTest(CUSTOM_ELEMENT$1, tagName);
    };
    const _applyTrustedTypesToAttribute = function _applyTrustedTypesToAttribute2(lcTag, lcName, namespaceURI, value) {
      if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function" && !namespaceURI) {
        switch (trustedTypes.getAttributeType(lcTag, lcName)) {
          case "TrustedHTML": {
            return _createTrustedHTML(value);
          }
          case "TrustedScriptURL": {
            return _createTrustedScriptURL(value);
          }
        }
      }
      return value;
    };
    const _setAttributeValue = function _setAttributeValue2(currentNode, name, namespaceURI, value) {
      try {
        if (namespaceURI) {
          currentNode.setAttributeNS(namespaceURI, name, value);
        } else {
          currentNode.setAttribute(name, value);
        }
        if (_isClobbered(currentNode)) {
          _forceRemove(currentNode);
        } else {
          arrayPop(DOMPurify.removed);
        }
      } catch (_6) {
        _removeAttribute(name, currentNode);
      }
    };
    const _sanitizeAttributes = function _sanitizeAttributes2(currentNode) {
      _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
      const attributes = currentNode.attributes;
      if (!attributes || _isClobbered(currentNode)) {
        return;
      }
      ALLOWED_ATTR = _forkSharedAllowlist(hooks.uponSanitizeAttribute, ALLOWED_ATTR, DEFAULT_ALLOWED_ATTR, SET_CONFIG_ALLOWED_ATTR);
      const hookEvent = {
        attrName: "",
        attrValue: "",
        keepAttr: true,
        allowedAttributes: ALLOWED_ATTR,
        forceKeepAttr: void 0
      };
      let l7 = attributes.length;
      const lcTag = transformCaseFunc(currentNode.nodeName);
      while (l7--) {
        const attr = attributes[l7];
        const name = attr.name, namespaceURI = attr.namespaceURI, attrValue = attr.value;
        const lcName = transformCaseFunc(name);
        const initValue = attrValue;
        let value = name === "value" ? initValue : stringTrim(initValue);
        hookEvent.attrName = lcName;
        hookEvent.attrValue = value;
        hookEvent.keepAttr = true;
        hookEvent.forceKeepAttr = void 0;
        _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
        value = hookEvent.attrValue;
        if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name") && stringIndexOf(value, SANITIZE_NAMED_PROPS_PREFIX) !== 0) {
          _removeAttribute(name, currentNode, attr);
          value = SANITIZE_NAMED_PROPS_PREFIX + value;
        }
        if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        if (lcName === "attributename" && stringMatch(value, "href")) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        if (hookEvent.forceKeepAttr) {
          continue;
        }
        if (!hookEvent.keepAttr) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value)) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        if (SAFE_FOR_TEMPLATES) {
          value = _stripTemplateExpressions(value);
        }
        if (!_isValidAttribute(lcTag, lcName, value)) {
          _removeAttribute(name, currentNode, attr);
          continue;
        }
        value = _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value);
        if (value !== initValue) {
          _setAttributeValue(currentNode, name, namespaceURI, value);
        }
      }
      _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
    };
    const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment) {
      let shadowNode = null;
      const shadowIterator = _createNodeIterator(fragment);
      _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
      while (shadowNode = shadowIterator.nextNode()) {
        _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
        _sanitizeElements(shadowNode, fragment);
        _sanitizeAttributes(shadowNode);
        if (_isDocumentFragment(shadowNode.content)) {
          _sanitizeShadowDOM2(shadowNode.content);
        }
        if (_readNodeType(shadowNode) === NODE_TYPE.element) {
          const innerSr = getShadowRoot(shadowNode);
          if (_isDocumentFragment(innerSr)) {
            _sanitizeAttachedShadowRoots(innerSr);
            _sanitizeShadowDOM2(innerSr);
          }
        }
      }
      _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
    };
    const _sanitizeAttachedShadowRoots = function _sanitizeAttachedShadowRoots2(root2) {
      const stack = [{
        node: root2,
        shadow: null
      }];
      while (stack.length > 0) {
        const item = stack.pop();
        if (item.shadow) {
          _sanitizeShadowDOM2(item.shadow);
          continue;
        }
        const node = item.node;
        const nodeType = _readNodeType(node);
        const isElement = nodeType === NODE_TYPE.element;
        const childNodes = getChildNodes(node);
        if (childNodes) {
          for (let i5 = childNodes.length - 1; i5 >= 0; --i5) {
            stack.push({
              node: childNodes[i5],
              shadow: null
            });
          }
        }
        if (isElement) {
          const rootName = getNodeName ? getNodeName(node) : null;
          if (typeof rootName === "string" && transformCaseFunc(rootName) === "template") {
            const content = node.content;
            if (_isDocumentFragment(content)) {
              stack.push({
                node: content,
                shadow: null
              });
            }
          }
        }
        if (isElement) {
          const sr = getShadowRoot(node);
          if (_isDocumentFragment(sr)) {
            stack.push({
              node: null,
              shadow: sr
            }, {
              node: sr,
              shadow: null
            });
          }
        }
      }
    };
    DOMPurify.sanitize = function(dirty) {
      let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let body = null;
      let importedNode = null;
      let currentNode = null;
      let returnNode = null;
      IS_EMPTY_INPUT = !dirty;
      if (IS_EMPTY_INPUT) {
        dirty = "<!-->";
      }
      if (typeof dirty !== "string" && !_isNode(dirty)) {
        dirty = stringifyValue(dirty);
        if (typeof dirty !== "string") {
          throw typeErrorCreate("dirty is not a string, aborting");
        }
      }
      if (!DOMPurify.isSupported) {
        return dirty;
      }
      if (SET_CONFIG) {
        ALLOWED_TAGS = SET_CONFIG_ALLOWED_TAGS;
        ALLOWED_ATTR = SET_CONFIG_ALLOWED_ATTR;
      } else {
        _parseConfig(cfg);
      }
      if (hooks.uponSanitizeElement.length > 0 || hooks.uponSanitizeAttribute.length > 0) {
        ALLOWED_TAGS = clone(ALLOWED_TAGS);
      }
      if (hooks.uponSanitizeAttribute.length > 0) {
        ALLOWED_ATTR = clone(ALLOWED_ATTR);
      }
      DOMPurify.removed = [];
      const inPlace = IN_PLACE && typeof dirty !== "string" && _isNode(dirty);
      if (inPlace) {
        _neutralizePatchLinkage(dirty);
        const nn2 = _readNodeName(dirty);
        if (typeof nn2 === "string") {
          const tagName = transformCaseFunc(nn2);
          if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
            _neutralizeRoot(dirty);
            throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
          }
        }
        if (_isClobbered(dirty)) {
          _neutralizeRoot(dirty);
          throw typeErrorCreate("root node is clobbered and cannot be sanitized in-place");
        }
        try {
          _sanitizeAttachedShadowRoots(dirty);
        } catch (error) {
          _neutralizeRoot(dirty);
          throw error;
        }
      } else if (_isNode(dirty)) {
        body = _initDocument("<!---->");
        importedNode = body.ownerDocument.importNode(dirty, true);
        if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") {
          body = importedNode;
        } else if (importedNode.nodeName === "HTML") {
          body = importedNode;
        } else {
          body.appendChild(importedNode);
        }
        _sanitizeAttachedShadowRoots(importedNode);
      } else {
        if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && // eslint-disable-next-line unicorn/prefer-includes
        dirty.indexOf("<") === -1) {
          return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(dirty) : dirty;
        }
        body = _initDocument(dirty);
        if (!body) {
          return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
        }
      }
      if (body && FORCE_BODY) {
        _forceRemove(body.firstChild);
      }
      const walkRoot = inPlace ? dirty : body;
      try {
        const nodeIterator = _createNodeIterator(walkRoot);
        while (currentNode = nodeIterator.nextNode()) {
          _sanitizeElements(currentNode, walkRoot);
          _sanitizeAttributes(currentNode);
          if (_isDocumentFragment(currentNode.content)) {
            _sanitizeShadowDOM2(currentNode.content);
          }
        }
      } catch (error) {
        if (inPlace) {
          _neutralizeRoot(dirty);
          arrayForEach(DOMPurify.removed, (entry) => {
            if (entry.element) {
              _neutralizeSubtree(entry.element);
            }
          });
        }
        throw error;
      }
      if (inPlace) {
        arrayForEach(DOMPurify.removed, (entry) => {
          if (entry.element) {
            _neutralizeSubtree(entry.element);
          }
        });
        if (SAFE_FOR_TEMPLATES) {
          _scrubTemplateExpressions2(dirty);
        }
        return dirty;
      }
      if (RETURN_DOM) {
        if (SAFE_FOR_TEMPLATES) {
          _scrubTemplateExpressions2(body);
        }
        if (RETURN_DOM_FRAGMENT) {
          returnNode = createDocumentFragment.call(body.ownerDocument);
          while (body.firstChild) {
            returnNode.appendChild(body.firstChild);
          }
        } else {
          returnNode = body;
        }
        if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) {
          returnNode = importNode.call(originalDocument, returnNode, true);
        }
        return returnNode;
      }
      let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
      if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
        serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
      }
      if (SAFE_FOR_TEMPLATES) {
        serializedHTML = _stripTemplateExpressions(serializedHTML);
      }
      return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(serializedHTML) : serializedHTML;
    };
    DOMPurify.setConfig = function() {
      let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      _parseConfig(cfg);
      SET_CONFIG = true;
      SET_CONFIG_ALLOWED_TAGS = ALLOWED_TAGS;
      SET_CONFIG_ALLOWED_ATTR = ALLOWED_ATTR;
    };
    DOMPurify.clearConfig = function() {
      CONFIG = null;
      SET_CONFIG = false;
      SET_CONFIG_ALLOWED_TAGS = null;
      SET_CONFIG_ALLOWED_ATTR = null;
      trustedTypesPolicy = defaultTrustedTypesPolicy;
      emptyHTML = "";
    };
    DOMPurify.isValidAttribute = function(tag, attr, value) {
      if (!CONFIG) {
        _parseConfig({});
      }
      const lcTag = transformCaseFunc(tag);
      const lcName = transformCaseFunc(attr);
      return _isValidAttribute(lcTag, lcName, value);
    };
    DOMPurify.addHook = function(entryPoint, hookFunction) {
      if (typeof hookFunction !== "function") {
        return;
      }
      if (!objectHasOwnProperty(hooks, entryPoint)) {
        return;
      }
      arrayPush(hooks[entryPoint], hookFunction);
    };
    DOMPurify.removeHook = function(entryPoint, hookFunction) {
      if (!objectHasOwnProperty(hooks, entryPoint)) {
        return void 0;
      }
      if (hookFunction !== void 0) {
        const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
        return index === -1 ? void 0 : arraySplice(hooks[entryPoint], index, 1)[0];
      }
      return arrayPop(hooks[entryPoint]);
    };
    DOMPurify.removeHooks = function(entryPoint) {
      if (!objectHasOwnProperty(hooks, entryPoint)) {
        return;
      }
      hooks[entryPoint] = [];
    };
    DOMPurify.removeAllHooks = function() {
      hooks = _createHooksMap();
    };
    return DOMPurify;
  }
  var purify = createDOMPurify();

  // node_modules/marked/lib/marked.esm.js
  function A5() {
    return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
  }
  var R4 = A5();
  function j5(l7) {
    R4 = l7;
  }
  var z4 = { exec: () => null };
  function I4(l7) {
    let e5 = [];
    return (t5) => {
      let n4 = Math.max(0, Math.min(3, t5 - 1)), s5 = e5[n4];
      return s5 || (s5 = l7(n4), e5[n4] = s5), s5;
    };
  }
  function k5(l7, e5 = "") {
    let t5 = typeof l7 == "string" ? l7 : l7.source, n4 = { replace: (s5, r5) => {
      let i5 = typeof r5 == "string" ? r5 : r5.source;
      return i5 = i5.replace(m5.caret, "$1"), t5 = t5.replace(s5, i5), n4;
    }, getRegex: () => new RegExp(t5, e5) };
    return n4;
  }
  var Oe = ((l7 = "") => {
    try {
      return !!new RegExp("(?<=1)(?<!1)" + l7);
    } catch {
      return false;
    }
  })();
  var m5 = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (l7) => new RegExp(`^( {0,3}${l7})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: I4((l7) => new RegExp(`^ {0,${l7}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)), hrRegex: I4((l7) => new RegExp(`^ {0,${l7}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)), fencesBeginRegex: I4((l7) => new RegExp(`^ {0,${l7}}(?:\`\`\`|~~~)`)), headingBeginRegex: I4((l7) => new RegExp(`^ {0,${l7}}#`)), htmlBeginRegex: I4((l7) => new RegExp(`^ {0,${l7}}<(?:[a-z].*>|!--)`, "i")), blockquoteBeginRegex: I4((l7) => new RegExp(`^ {0,${l7}}>`)) };
  var Te = /^(?:[ \t]*(?:\n|$))+/;
  var we = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
  var ye = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
  var q4 = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
  var Pe = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
  var U2 = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
  var oe = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
  var ae = k5(oe).replace(/bull/g, U2).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
  var Se = k5(oe).replace(/bull/g, U2).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
  var K3 = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
  var _e = /^[^\n]+/;
  var W2 = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
  var $e = k5(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", W2).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
  var Le = k5(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, U2).getRegex();
  var Q3 = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
  var X2 = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
  var Ee = k5("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", X2).replace("tag", Q3).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
  var le = (l7) => k5(K3).replace("hr", q4).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", l7).replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q3).getRegex();
  var ze = le(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
  var Me = le(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/);
  var Ae = k5(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", Me).getRegex();
  var J3 = { blockquote: Ae, code: we, def: $e, fences: ye, heading: Pe, hr: q4, html: Ee, lheading: ae, list: Le, newline: Te, paragraph: ze, table: z4, text: _e };
  var se = k5("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", q4).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q3).getRegex();
  var Ie = { ...J3, lheading: Se, table: se, paragraph: k5(K3).replace("hr", q4).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", se).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q3).getRegex() };
  var Ce = { ...J3, html: k5(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", X2).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: z4, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: k5(K3).replace("hr", q4).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", ae).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
  var Be = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
  var De = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
  var ue = /^( {2,}|\\)\n(?!\s*$)/;
  var qe = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
  var _5 = /[\p{P}\p{S}]/u;
  var C5 = /[\s\p{P}\p{S}]/u;
  var v5 = /[^\s\p{P}\p{S}]/u;
  var ve = k5(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, C5).getRegex();
  var He = /[\p{Pi}\p{Ps}"']/u;
  var pe = /(?!~)[\p{P}\p{S}]/u;
  var Ze = /(?!~)[\s\p{P}\p{S}]/u;
  var Ge = /(?:[^\s\p{P}\p{S}]|~)/u;
  var Qe = k5(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Oe ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
  var ce = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
  var Ne = k5(ce, "u").replace(/punct/g, _5).getRegex();
  var je = k5(ce, "u").replace(/punct/g, pe).getRegex();
  var Fe = /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
  var Ue = k5(Fe, "u").replace(/openQuote/g, He).replace(/punct/g, _5).getRegex();
  var he = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
  var Ke = k5(he, "gu").replace(/notPunctSpace/g, v5).replace(/punctSpace/g, C5).replace(/punct/g, _5).getRegex();
  var We = k5(he, "gu").replace(/notPunctSpace/g, Ge).replace(/punctSpace/g, Ze).replace(/punct/g, pe).getRegex();
  var Xe = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
  var Je = k5(Xe, "gu").replace(/notPunctSpace/g, v5).replace(/punctSpace/g, C5).replace(/punct/g, _5).getRegex();
  var Ve = k5("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, v5).replace(/punctSpace/g, C5).replace(/punct/g, _5).getRegex();
  var Ye = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
  var et2 = k5(Ye, "gu").replace(/notPunctSpace/g, v5).replace(/punctSpace/g, C5).replace(/punct/g, _5).getRegex();
  var tt2 = k5(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, _5).getRegex();
  var nt2 = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
  var rt = k5(nt2, "gu").replace(/notPunctSpace/g, v5).replace(/punctSpace/g, C5).replace(/punct/g, _5).getRegex();
  var st2 = k5(/\\(punct)/, "gu").replace(/punct/g, _5).getRegex();
  var it = k5(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
  var ot2 = k5(X2).replace("(?:-->|$)", "-->").getRegex();
  var at2 = k5("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", ot2).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
  var G3 = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/;
  var lt = k5(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", G3).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
  var ke = k5(/^!?\[(label)\]\[(ref)\]/).replace("label", G3).replace("ref", W2).getRegex();
  var de = k5(/^!?\[(ref)\](?:\[\])?/).replace("ref", W2).getRegex();
  var ut = k5("reflink|nolink(?!\\()", "g").replace("reflink", ke).replace("nolink", de).getRegex();
  var ie = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
  var V3 = { _backpedal: z4, anyPunctuation: st2, autolink: it, blockSkip: Qe, br: ue, code: De, del: z4, delLDelim: z4, delRDelim: z4, emStrongLDelim: Ne, emStrongRDelimAst: Ke, emStrongRDelimUnd: Ve, escape: Be, link: lt, nolink: de, punctuation: ve, reflink: ke, reflinkSearch: ut, tag: at2, text: qe, url: z4 };
  var pt = { ...V3, emStrongLDelim: Ue, emStrongRDelimAst: Je, emStrongRDelimUnd: et2, link: k5(/^!?\[(label)\]\((.*?)\)/).replace("label", G3).getRegex(), reflink: k5(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", G3).getRegex() };
  var F3 = { ...V3, emStrongRDelimAst: We, emStrongLDelim: je, delLDelim: tt2, delRDelim: rt, url: k5(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", ie).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: k5(/^(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", ie).getRegex() };
  var ct = { ...F3, br: k5(ue).replace("{2,}", "*").getRegex(), text: k5(F3.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
  var H3 = { normal: J3, gfm: Ie, pedantic: Ce };
  var B4 = { normal: V3, gfm: F3, breaks: ct, pedantic: pt };
  var ht = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var ge = (l7) => ht[l7];
  function T5(l7, e5) {
    if (e5) {
      if (m5.escapeTest.test(l7)) return l7.replace(m5.escapeReplace, ge);
    } else if (m5.escapeTestNoEncode.test(l7)) return l7.replace(m5.escapeReplaceNoEncode, ge);
    return l7;
  }
  function Y2(l7) {
    try {
      l7 = encodeURI(l7).replace(m5.percentDecode, "%");
    } catch {
      return null;
    }
    return l7;
  }
  function ee2(l7, e5) {
    let t5 = l7.replace(m5.findPipe, (r5, i5, o5) => {
      let u6 = false, a5 = i5;
      for (; --a5 >= 0 && o5[a5] === "\\"; ) u6 = !u6;
      return u6 ? "|" : " |";
    }), n4 = t5.split(m5.splitPipe), s5 = 0;
    if (n4[0].trim() || n4.shift(), n4.length > 0 && !n4.at(-1)?.trim() && n4.pop(), e5) if (n4.length > e5) n4.splice(e5);
    else for (; n4.length < e5; ) n4.push("");
    for (; s5 < n4.length; s5++) n4[s5] = n4[s5].trim().replace(m5.slashPipe, "|");
    return n4;
  }
  function $3(l7, e5, t5) {
    let n4 = l7.length;
    if (n4 === 0) return "";
    let s5 = 0;
    for (; s5 < n4; ) {
      let r5 = l7.charAt(n4 - s5 - 1);
      if (r5 === e5 && !t5) s5++;
      else if (r5 !== e5 && t5) s5++;
      else break;
    }
    return l7.slice(0, n4 - s5);
  }
  function te2(l7) {
    let e5 = l7.split(`
`), t5 = e5.length - 1;
    for (; t5 >= 0 && m5.blankLine.test(e5[t5]); ) t5--;
    return e5.length - t5 <= 2 ? l7 : e5.slice(0, t5 + 1).join(`
`);
  }
  function fe(l7, e5) {
    if (l7.indexOf(e5[1]) === -1) return -1;
    let t5 = 0;
    for (let n4 = 0; n4 < l7.length; n4++) if (l7[n4] === "\\") n4++;
    else if (l7[n4] === e5[0]) t5++;
    else if (l7[n4] === e5[1] && (t5--, t5 < 0)) return n4;
    return t5 > 0 ? -2 : -1;
  }
  function me(l7, e5 = 0) {
    let t5 = e5, n4 = "";
    for (let s5 of l7) if (s5 === "	") {
      let r5 = 4 - t5 % 4;
      n4 += " ".repeat(r5), t5 += r5;
    } else n4 += s5, t5++;
    return n4;
  }
  function xe(l7, e5, t5, n4, s5) {
    let r5 = e5.href, i5 = e5.title || null, o5 = l7[1].replace(s5.other.outputLinkReplace, "$1"), u6 = l7[0].charAt(0) === "!";
    n4.state.inLink = true;
    let a5 = n4.state.linkEmitted, p5 = n4.state.inRawBlock;
    n4.state.linkEmitted = false;
    let c5 = n4.inlineTokens(o5), h5 = n4.state.linkEmitted;
    if (n4.state.linkEmitted = a5, n4.state.inLink = false, !u6) {
      if (h5) {
        n4.state.inRawBlock = p5;
        return;
      }
      n4.state.linkEmitted = true;
    }
    return { type: u6 ? "image" : "link", raw: t5, href: r5, title: i5, text: o5, tokens: c5 };
  }
  function kt(l7, e5, t5) {
    let n4 = l7.match(t5.other.indentCodeCompensation);
    if (n4 === null) return e5;
    let s5 = n4[1];
    return e5.split(`
`).map((r5) => {
      let i5 = r5.match(t5.other.beginningSpace);
      if (i5 === null) return r5;
      let [o5] = i5;
      return o5.length >= s5.length ? r5.slice(s5.length) : r5;
    }).join(`
`);
  }
  var y5 = class {
    options;
    rules;
    lexer;
    constructor(e5) {
      this.options = e5 || R4;
    }
    space(e5) {
      let t5 = this.rules.block.newline.exec(e5);
      if (t5 && t5[0].length > 0) return { type: "space", raw: t5[0] };
    }
    code(e5) {
      let t5 = this.rules.block.code.exec(e5);
      if (t5) {
        let n4 = this.options.pedantic ? t5[0] : te2(t5[0]), s5 = n4.replace(this.rules.other.codeRemoveIndent, "");
        return { type: "code", raw: n4, codeBlockStyle: "indented", text: s5 };
      }
    }
    fences(e5) {
      let t5 = this.rules.block.fences.exec(e5);
      if (t5) {
        let n4 = t5[0], s5 = kt(n4, t5[3] || "", this.rules);
        return { type: "code", raw: n4, lang: t5[2] ? t5[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t5[2], text: s5 };
      }
    }
    heading(e5) {
      let t5 = this.rules.block.heading.exec(e5);
      if (t5) {
        let n4 = t5[2].trim();
        if (this.rules.other.endingHash.test(n4)) {
          let s5 = $3(n4, "#");
          (this.options.pedantic || !s5 || this.rules.other.endingSpaceChar.test(s5)) && (n4 = s5.trim());
        }
        return { type: "heading", raw: $3(t5[0], `
`), depth: t5[1].length, text: n4, tokens: this.lexer.inline(n4) };
      }
    }
    hr(e5) {
      let t5 = this.rules.block.hr.exec(e5);
      if (t5) return { type: "hr", raw: $3(t5[0], `
`) };
    }
    blockquote(e5) {
      let t5 = this.rules.block.blockquote.exec(e5);
      if (t5) {
        let n4 = $3(t5[0], `
`).split(`
`), s5 = "", r5 = "", i5 = [];
        for (; n4.length > 0; ) {
          let o5 = false, u6 = [], a5;
          for (a5 = 0; a5 < n4.length; a5++) if (this.rules.other.blockquoteStart.test(n4[a5])) u6.push(n4[a5]), o5 = true;
          else if (!o5) u6.push(n4[a5]);
          else break;
          n4 = n4.slice(a5);
          let p5 = u6.join(`
`), c5 = p5.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
          s5 = s5 ? `${s5}
${p5}` : p5, r5 = r5 ? `${r5}
${c5}` : c5;
          let h5 = this.lexer.state.top;
          if (this.lexer.state.top = true, this.lexer.blockTokens(c5, i5, true), this.lexer.state.top = h5, n4.length === 0) break;
          let d5 = i5.at(-1);
          if (d5?.type === "code") break;
          if (d5?.type === "blockquote") {
            let O4 = d5, g4 = n4.join(`
`), w5 = O4.raw + `
` + g4.replace(this.rules.other.blockquoteSetextReplace2, ""), E4 = this.blockquote(w5);
            i5[i5.length - 1] = E4, s5 = `${s5}
${g4}`, r5 = r5.substring(0, r5.length - O4.text.length) + E4.text;
            break;
          } else if (d5?.type === "list") {
            let O4 = d5, g4 = O4.raw + `
` + n4.join(`
`), w5 = this.list(g4);
            i5[i5.length - 1] = w5, s5 = s5.substring(0, s5.length - d5.raw.length) + w5.raw, r5 = r5.substring(0, r5.length - O4.raw.length) + w5.raw, n4 = g4.substring(i5.at(-1).raw.length).split(`
`);
            continue;
          }
        }
        return { type: "blockquote", raw: s5, tokens: i5, text: r5 };
      }
    }
    list(e5) {
      let t5 = this.rules.block.list.exec(e5);
      if (t5) {
        let n4 = t5[1].trim(), s5 = n4.length > 1, r5 = { type: "list", raw: "", ordered: s5, start: s5 ? +n4.slice(0, -1) : "", loose: false, items: [] };
        n4 = s5 ? `\\d{1,9}\\${n4.slice(-1)}` : `\\${n4}`, this.options.pedantic && (n4 = s5 ? n4 : "[*+-]");
        let i5 = this.rules.other.listItemRegex(n4), o5 = false;
        for (; e5; ) {
          let a5 = false, p5 = "", c5 = "";
          if (!(t5 = i5.exec(e5)) || this.rules.block.hr.test(e5)) break;
          p5 = t5[0], e5 = e5.substring(p5.length);
          let h5 = me(t5[2].split(`
`, 1)[0], t5[1].length), d5 = e5.split(`
`, 1)[0], O4 = !h5.trim(), g4 = 0;
          if (this.options.pedantic ? (g4 = 2, c5 = h5.trimStart()) : O4 ? g4 = t5[1].length + 1 : (g4 = h5.search(this.rules.other.nonSpaceChar), g4 = g4 > 4 ? 1 : g4, c5 = h5.slice(g4), g4 += t5[1].length), O4 && this.rules.other.blankLine.test(d5) && (p5 += d5 + `
`, e5 = e5.substring(d5.length + 1), a5 = true), !a5) {
            let w5 = this.rules.other.nextBulletRegex(g4), E4 = this.rules.other.hrRegex(g4), ne2 = this.rules.other.fencesBeginRegex(g4), re2 = this.rules.other.headingBeginRegex(g4), be = this.rules.other.htmlBeginRegex(g4), Re = this.rules.other.blockquoteBeginRegex(g4);
            for (; e5; ) {
              let N4 = e5.split(`
`, 1)[0], D5;
              if (d5 = N4, this.options.pedantic ? (d5 = d5.replace(this.rules.other.listReplaceNesting, "  "), D5 = d5) : D5 = d5.replace(this.rules.other.tabCharGlobal, "    "), ne2.test(d5) || re2.test(d5) || be.test(d5) || Re.test(d5) || w5.test(d5) || E4.test(d5)) break;
              if (D5.search(this.rules.other.nonSpaceChar) >= g4 || !d5.trim()) c5 += `
` + D5.slice(g4);
              else {
                if (O4 || h5.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || ne2.test(h5) || re2.test(h5) || E4.test(h5)) break;
                c5 += `
` + d5;
              }
              O4 = !d5.trim(), p5 += N4 + `
`, e5 = e5.substring(N4.length + 1), h5 = D5.slice(g4);
            }
          }
          r5.loose || (o5 ? r5.loose = true : this.rules.other.doubleBlankLine.test(p5) && (o5 = true)), r5.items.push({ type: "list_item", raw: p5, task: !!this.options.gfm && this.rules.other.listIsTask.test(c5), loose: false, text: c5, tokens: [] }), r5.raw += p5;
        }
        let u6 = r5.items.at(-1);
        if (u6) u6.raw = u6.raw.trimEnd(), u6.text = u6.text.trimEnd();
        else return;
        r5.raw = r5.raw.trimEnd();
        for (let a5 of r5.items) if (this.lexer.state.top = false, a5.tokens = this.lexer.blockTokens(a5.text, []), !r5.loose) {
          let p5 = a5.tokens.filter((h5) => h5.type === "space"), c5 = p5.length > 0 && p5.some((h5) => this.rules.other.anyLine.test(h5.raw));
          r5.loose = c5;
        }
        for (let a5 of r5.items) {
          let p5 = a5.tokens[0];
          if (a5.task && (p5?.type === "text" || p5?.type === "paragraph")) {
            a5.text = a5.text.replace(this.rules.other.listReplaceTask, ""), p5.raw = p5.raw.replace(this.rules.other.listReplaceTask, ""), p5.text = p5.text.replace(this.rules.other.listReplaceTask, "");
            for (let h5 = this.lexer.inlineQueue.length - 1; h5 >= 0; h5--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[h5].src)) {
              this.lexer.inlineQueue[h5].src = this.lexer.inlineQueue[h5].src.replace(this.rules.other.listReplaceTask, "");
              break;
            }
            let c5 = this.rules.other.listTaskCheckbox.exec(a5.raw);
            if (c5) {
              let h5 = { type: "checkbox", raw: c5[0] + " ", checked: c5[0] !== "[ ]" };
              a5.checked = h5.checked, r5.loose ? a5.tokens[0] && ["paragraph", "text"].includes(a5.tokens[0].type) && "tokens" in a5.tokens[0] && a5.tokens[0].tokens ? (a5.tokens[0].raw = h5.raw + a5.tokens[0].raw, a5.tokens[0].text = h5.raw + a5.tokens[0].text, a5.tokens[0].tokens.unshift(h5)) : a5.tokens.unshift({ type: "paragraph", raw: h5.raw, text: h5.raw, tokens: [h5] }) : a5.tokens.unshift(h5);
            }
          } else a5.task && (a5.task = false);
        }
        if (r5.loose) for (let a5 of r5.items) {
          a5.loose = true;
          for (let p5 of a5.tokens) p5.type === "text" && (p5.type = "paragraph");
        }
        return r5;
      }
    }
    html(e5) {
      let t5 = this.rules.block.html.exec(e5);
      if (t5) {
        let n4 = te2(t5[0]);
        return { type: "html", block: true, raw: n4, pre: t5[1] === "pre" || t5[1] === "script" || t5[1] === "style", text: n4 };
      }
    }
    def(e5) {
      let t5 = this.rules.block.def.exec(e5);
      if (t5) {
        let n4 = t5[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), s5 = t5[2] ? t5[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r5 = t5[3] ? t5[3].substring(1, t5[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t5[3];
        return { type: "def", tag: n4, raw: $3(t5[0], `
`), href: s5, title: r5 };
      }
    }
    table(e5) {
      let t5 = this.rules.block.table.exec(e5);
      if (!t5 || !this.rules.other.tableDelimiter.test(t5[2])) return;
      let n4 = ee2(t5[1]), s5 = t5[2].replace(this.rules.other.tableAlignChars, "").split("|"), r5 = t5[3]?.trim() ? t5[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], i5 = { type: "table", raw: $3(t5[0], `
`), header: [], align: [], rows: [] };
      if (n4.length === s5.length) {
        for (let o5 of s5) this.rules.other.tableAlignRight.test(o5) ? i5.align.push("right") : this.rules.other.tableAlignCenter.test(o5) ? i5.align.push("center") : this.rules.other.tableAlignLeft.test(o5) ? i5.align.push("left") : i5.align.push(null);
        for (let o5 = 0; o5 < n4.length; o5++) i5.header.push({ text: n4[o5], tokens: this.lexer.inline(n4[o5]), header: true, align: i5.align[o5] });
        for (let o5 of r5) i5.rows.push(ee2(o5, i5.header.length).map((u6, a5) => ({ text: u6, tokens: this.lexer.inline(u6), header: false, align: i5.align[a5] })));
        return i5;
      }
    }
    lheading(e5) {
      let t5 = this.rules.block.lheading.exec(e5);
      if (t5) {
        let n4 = t5[1].trim();
        return { type: "heading", raw: $3(t5[0], `
`), depth: t5[2].charAt(0) === "=" ? 1 : 2, text: n4, tokens: this.lexer.inline(n4) };
      }
    }
    paragraph(e5) {
      let t5 = this.rules.block.paragraph.exec(e5);
      if (t5) {
        let n4 = t5[1].charAt(t5[1].length - 1) === `
` ? t5[1].slice(0, -1) : t5[1];
        return { type: "paragraph", raw: t5[0], text: n4, tokens: this.lexer.inline(n4) };
      }
    }
    text(e5) {
      let t5 = this.rules.block.text.exec(e5);
      if (t5) return { type: "text", raw: t5[0], text: t5[0], tokens: this.lexer.inline(t5[0]) };
    }
    escape(e5) {
      let t5 = this.rules.inline.escape.exec(e5);
      if (t5) return { type: "escape", raw: t5[0], text: t5[1] };
    }
    tag(e5) {
      let t5 = this.rules.inline.tag.exec(e5);
      if (t5) return !this.lexer.state.inLink && this.rules.other.startATag.test(t5[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t5[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t5[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t5[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t5[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t5[0] };
    }
    link(e5) {
      let t5 = this.rules.inline.link.exec(e5);
      if (t5) {
        let n4 = t5[2].trim();
        if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n4)) {
          if (!this.rules.other.endAngleBracket.test(n4)) return;
          let i5 = $3(n4.slice(0, -1), "\\");
          if ((n4.length - i5.length) % 2 === 0) return;
        } else {
          let i5 = fe(t5[2], "()");
          if (i5 === -2) return;
          if (i5 > -1) {
            let u6 = (t5[0].indexOf("!") === 0 ? 5 : 4) + t5[1].length + i5;
            t5[2] = t5[2].substring(0, i5), t5[0] = t5[0].substring(0, u6).trim(), t5[3] = "";
          }
        }
        let s5 = t5[2], r5 = "";
        if (this.options.pedantic) {
          let i5 = this.rules.other.pedanticHrefTitle.exec(s5);
          i5 && (s5 = i5[1], r5 = i5[3]);
        } else r5 = t5[3] ? t5[3].slice(1, -1) : "";
        return s5 = s5.trim(), this.rules.other.startAngleBracket.test(s5) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n4) ? s5 = s5.slice(1) : s5 = s5.slice(1, -1)), xe(t5, { href: s5 && s5.replace(this.rules.inline.anyPunctuation, "$1"), title: r5 && r5.replace(this.rules.inline.anyPunctuation, "$1") }, t5[0], this.lexer, this.rules);
      }
    }
    reflink(e5, t5) {
      let n4;
      if ((n4 = this.rules.inline.reflink.exec(e5)) || (n4 = this.rules.inline.nolink.exec(e5))) {
        let s5 = (n4[2] || n4[1]).replace(this.rules.other.multipleSpaceGlobal, " "), r5 = t5[s5.toLowerCase()];
        if (!r5) {
          let i5 = n4[0].charAt(0);
          return { type: "text", raw: i5, text: i5 };
        }
        return xe(n4, r5, n4[0], this.lexer, this.rules);
      }
    }
    emStrong(e5, t5, n4 = "") {
      let s5 = this.rules.inline.emStrongLDelim.exec(e5);
      if (!s5 || !s5[1] && !s5[2] && !s5[3] && !s5[4] || s5[4] && n4.match(this.rules.other.unicodeAlphaNumeric)) return;
      if (!(s5[1] || s5[3] || "") || !n4 || this.rules.inline.punctuation.exec(n4)) {
        let i5 = [...s5[0]].length - 1, o5, u6, a5 = i5, p5 = 0, c5 = s5[0][0], h5 = n4 === c5, d5 = c5 === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
        for (d5.lastIndex = 0, t5 = t5.slice(-1 * e5.length + i5); (s5 = d5.exec(t5)) !== null; ) {
          if (o5 = s5[1] || s5[2] || s5[3] || s5[4] || s5[5] || s5[6], !o5) continue;
          if (u6 = [...o5].length, s5[3] || s5[4]) {
            a5 += u6;
            continue;
          } else if (s5[5] || s5[6]) {
            if (i5 % 3 && !((i5 + u6) % 3)) {
              p5 += u6;
              continue;
            }
            if (h5) break;
          }
          if (a5 -= u6, a5 > 0) continue;
          u6 = Math.min(u6, u6 + a5 + p5);
          let O4 = [...s5[0]][0].length, g4 = e5.slice(0, i5 + s5.index + O4 + u6);
          if (Math.min(i5, u6) % 2) {
            let E4 = g4.slice(1, -1);
            return { type: "em", raw: g4, text: E4, tokens: this.lexer.inlineTokens(E4) };
          }
          let w5 = g4.slice(2, -2);
          return { type: "strong", raw: g4, text: w5, tokens: this.lexer.inlineTokens(w5) };
        }
      }
    }
    codespan(e5) {
      let t5 = this.rules.inline.code.exec(e5);
      if (t5) {
        let n4 = t5[2].replace(this.rules.other.newLineCharGlobal, " "), s5 = this.rules.other.nonSpaceChar.test(n4), r5 = this.rules.other.startingSpaceChar.test(n4) && this.rules.other.endingSpaceChar.test(n4);
        return s5 && r5 && (n4 = n4.substring(1, n4.length - 1)), { type: "codespan", raw: t5[0], text: n4 };
      }
    }
    br(e5) {
      let t5 = this.rules.inline.br.exec(e5);
      if (t5) return { type: "br", raw: t5[0] };
    }
    del(e5, t5, n4 = "") {
      let s5 = this.rules.inline.delLDelim.exec(e5);
      if (!s5) return;
      if (!(s5[1] || "") || !n4 || this.rules.inline.punctuation.exec(n4)) {
        let i5 = [...s5[0]].length - 1, o5, u6, a5 = i5, p5 = this.rules.inline.delRDelim;
        for (p5.lastIndex = 0, t5 = t5.slice(-1 * e5.length + i5); (s5 = p5.exec(t5)) !== null; ) {
          if (o5 = s5[1] || s5[2] || s5[3] || s5[4] || s5[5] || s5[6], !o5 || (u6 = [...o5].length, u6 !== i5)) continue;
          if (s5[3] || s5[4]) {
            a5 += u6;
            continue;
          }
          if (a5 -= u6, a5 > 0) continue;
          u6 = Math.min(u6, u6 + a5);
          let c5 = [...s5[0]][0].length, h5 = e5.slice(0, i5 + s5.index + c5 + u6), d5 = h5.slice(i5, -i5);
          return { type: "del", raw: h5, text: d5, tokens: this.lexer.inlineTokens(d5) };
        }
      }
    }
    autolink(e5) {
      let t5 = this.rules.inline.autolink.exec(e5);
      if (t5) {
        let n4, s5;
        return t5[2] === "@" ? (n4 = t5[1], s5 = "mailto:" + n4) : (n4 = t5[1], s5 = n4), { type: "link", raw: t5[0], text: n4, href: s5, tokens: [{ type: "text", raw: n4, text: n4 }] };
      }
    }
    url(e5) {
      let t5;
      if (t5 = this.rules.inline.url.exec(e5)) {
        let n4, s5;
        if (t5[2] === "@") n4 = t5[0], s5 = "mailto:" + n4;
        else {
          let r5;
          do
            r5 = t5[0], t5[0] = this.rules.inline._backpedal.exec(t5[0])?.[0] ?? "";
          while (r5 !== t5[0]);
          n4 = t5[0], t5[1] === "www." ? s5 = "http://" + t5[0] : s5 = t5[0];
        }
        return { type: "link", raw: t5[0], text: n4, href: s5, tokens: [{ type: "text", raw: n4, text: n4 }] };
      }
    }
    inlineText(e5) {
      let t5 = this.rules.inline.text.exec(e5);
      if (t5) {
        let n4 = this.lexer.state.inRawBlock;
        return { type: "text", raw: t5[0], text: t5[0], escaped: n4 };
      }
    }
  };
  var x4 = class l5 {
    tokens;
    options;
    state;
    inlineQueue;
    tokenizer;
    constructor(e5) {
      this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e5 || R4, this.options.tokenizer = this.options.tokenizer || new y5(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, linkEmitted: false, top: true };
      let t5 = { other: m5, block: H3.normal, inline: B4.normal };
      this.options.pedantic ? (t5.block = H3.pedantic, t5.inline = B4.pedantic) : this.options.gfm && (t5.block = H3.gfm, this.options.breaks ? t5.inline = B4.breaks : t5.inline = B4.gfm), this.tokenizer.rules = t5;
    }
    static get rules() {
      return { block: H3, inline: B4 };
    }
    static lex(e5, t5) {
      return new l5(t5).lex(e5);
    }
    static lexInline(e5, t5) {
      return new l5(t5).inlineTokens(e5);
    }
    lex(e5) {
      e5 = e5.replace(m5.carriageReturn, `
`), this.blockTokens(e5, this.tokens);
      for (let t5 = 0; t5 < this.inlineQueue.length; t5++) {
        let n4 = this.inlineQueue[t5];
        this.inlineTokens(n4.src, n4.tokens);
      }
      return this.inlineQueue = [], this.tokens;
    }
    blockTokens(e5, t5 = [], n4 = false) {
      this.tokenizer.lexer = this, this.options.pedantic && (e5 = e5.replace(m5.tabCharGlobal, "    ").replace(m5.spaceLine, ""));
      let s5 = 1 / 0;
      for (; e5; ) {
        if (e5.length < s5) s5 = e5.length;
        else {
          this.infiniteLoopError(e5.charCodeAt(0));
          break;
        }
        let r5;
        if (this.options.extensions?.block?.some((o5) => (r5 = o5.call({ lexer: this }, e5, t5)) ? (e5 = e5.substring(r5.raw.length), t5.push(r5), true) : false)) continue;
        if (r5 = this.tokenizer.space(e5)) {
          e5 = e5.substring(r5.raw.length);
          let o5 = t5.at(-1);
          r5.raw.length === 1 && o5 !== void 0 ? o5.raw += `
` : t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.code(e5)) {
          e5 = e5.substring(r5.raw.length);
          let o5 = t5.at(-1);
          o5?.type === "paragraph" || o5?.type === "text" ? (o5.raw += (o5.raw.endsWith(`
`) ? "" : `
`) + r5.raw, o5.text += `
` + r5.text, this.inlineQueue.at(-1).src = o5.text) : t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.fences(e5)) {
          e5 = e5.substring(r5.raw.length), t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.heading(e5)) {
          e5 = e5.substring(r5.raw.length), t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.hr(e5)) {
          e5 = e5.substring(r5.raw.length), t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.blockquote(e5)) {
          e5 = e5.substring(r5.raw.length), t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.list(e5)) {
          e5 = e5.substring(r5.raw.length), t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.html(e5)) {
          e5 = e5.substring(r5.raw.length), t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.def(e5)) {
          e5 = e5.substring(r5.raw.length);
          let o5 = t5.at(-1);
          o5?.type === "paragraph" || o5?.type === "text" ? (o5.raw += (o5.raw.endsWith(`
`) ? "" : `
`) + r5.raw, o5.text += `
` + r5.raw, this.inlineQueue.at(-1).src = o5.text) : this.tokens.links[r5.tag] || (this.tokens.links[r5.tag] = { href: r5.href, title: r5.title }, t5.push(r5));
          continue;
        }
        if (r5 = this.tokenizer.table(e5)) {
          e5 = e5.substring(r5.raw.length), t5.push(r5);
          continue;
        }
        if (r5 = this.tokenizer.lheading(e5)) {
          e5 = e5.substring(r5.raw.length), t5.push(r5);
          continue;
        }
        let i5 = e5;
        if (this.options.extensions?.startBlock) {
          let o5 = 1 / 0, u6 = e5.slice(1), a5;
          this.options.extensions.startBlock.forEach((p5) => {
            a5 = p5.call({ lexer: this }, u6), typeof a5 == "number" && a5 >= 0 && (o5 = Math.min(o5, a5));
          }), o5 < 1 / 0 && o5 >= 0 && (i5 = e5.substring(0, o5 + 1));
        }
        if (this.state.top && (r5 = this.tokenizer.paragraph(i5))) {
          let o5 = t5.at(-1);
          n4 && o5?.type === "paragraph" ? (o5.raw += (o5.raw.endsWith(`
`) ? "" : `
`) + r5.raw, o5.text += `
` + r5.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = o5.text) : t5.push(r5), n4 = i5.length !== e5.length, e5 = e5.substring(r5.raw.length);
          continue;
        }
        if (r5 = this.tokenizer.text(e5)) {
          e5 = e5.substring(r5.raw.length);
          let o5 = t5.at(-1);
          o5?.type === "text" ? (o5.raw += (o5.raw.endsWith(`
`) ? "" : `
`) + r5.raw, o5.text += `
` + r5.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = o5.text) : t5.push(r5);
          continue;
        }
        if (e5) {
          this.infiniteLoopError(e5.charCodeAt(0));
          break;
        }
      }
      return this.state.top = true, t5;
    }
    inline(e5, t5 = []) {
      return this.inlineQueue.push({ src: e5, tokens: t5 }), t5;
    }
    linkInText(e5) {
      if (!e5.includes("[")) return false;
      let t5 = this.tokenizer.rules.inline.link;
      for (let n4 of e5.matchAll(this.tokenizer.rules.inline.blockSkip)) if (t5.test(n4[0]) && e5.charAt(n4.index - 1) !== "!") return true;
      for (let n4 of e5.matchAll(this.tokenizer.rules.inline.reflinkSearch)) {
        let s5 = n4[0], r5 = s5.lastIndexOf("[");
        if (!(s5.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, s5.slice(r5 + 1, -1))) && !(r5 > 1 && this.linkInText(s5.slice(1, r5 - 1)))) return true;
      }
      return false;
    }
    inlineTokens(e5, t5 = []) {
      this.tokenizer.lexer = this;
      let n4 = e5;
      if (this.tokens.links && e5.includes("[")) {
        let o5 = this.tokenizer.rules.inline.reflinkSearch, u6 = (a5) => {
          let p5 = a5.lastIndexOf("[");
          if (!Object.hasOwn(this.tokens.links, a5.slice(p5 + 1, -1))) return a5;
          if (p5 > 1 && a5.charAt(0) !== "!") {
            let c5 = a5.slice(1, p5 - 1);
            if (this.linkInText(c5)) return "[" + c5.replace(o5, u6) + "][" + "a".repeat(a5.length - p5 - 2) + "]";
          }
          return "[" + "a".repeat(a5.length - 2) + "]";
        };
        n4 = n4.replace(o5, u6);
      }
      n4 = n4.replace(this.tokenizer.rules.inline.anyPunctuation, (o5) => "+".repeat(o5.length)), n4 = n4.replace(this.tokenizer.rules.inline.blockSkip, (o5, u6, a5) => {
        let p5 = a5 ? a5.length : 0;
        return o5.slice(0, p5) + "[" + "a".repeat(o5.length - p5 - 2) + "]";
      }), n4 = this.options.hooks?.emStrongMask?.call({ lexer: this }, n4) ?? n4;
      let s5 = false, r5 = "", i5 = 1 / 0;
      for (; e5; ) {
        if (e5.length < i5) i5 = e5.length;
        else {
          this.infiniteLoopError(e5.charCodeAt(0));
          break;
        }
        s5 || (r5 = ""), s5 = false;
        let o5;
        if (this.options.extensions?.inline?.some((a5) => (o5 = a5.call({ lexer: this }, e5, t5)) ? (e5 = e5.substring(o5.raw.length), t5.push(o5), true) : false)) continue;
        if (o5 = this.tokenizer.escape(e5)) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        if (o5 = this.tokenizer.tag(e5)) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        if (o5 = this.tokenizer.link(e5)) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        if (o5 = this.tokenizer.reflink(e5, this.tokens.links)) {
          e5 = e5.substring(o5.raw.length);
          let a5 = t5.at(-1);
          o5.type === "text" && a5?.type === "text" ? (a5.raw += o5.raw, a5.text += o5.text) : t5.push(o5);
          continue;
        }
        if (o5 = this.tokenizer.emStrong(e5, n4, r5)) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        if (o5 = this.tokenizer.codespan(e5)) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        if (o5 = this.tokenizer.br(e5)) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        if (o5 = this.tokenizer.del(e5, n4, r5)) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        if (o5 = this.tokenizer.autolink(e5)) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        if (!this.state.inLink && (o5 = this.tokenizer.url(e5))) {
          e5 = e5.substring(o5.raw.length), t5.push(o5);
          continue;
        }
        let u6 = e5;
        if (this.options.extensions?.startInline) {
          let a5 = 1 / 0, p5 = e5.slice(1), c5;
          this.options.extensions.startInline.forEach((h5) => {
            c5 = h5.call({ lexer: this }, p5), typeof c5 == "number" && c5 >= 0 && (a5 = Math.min(a5, c5));
          }), a5 < 1 / 0 && a5 >= 0 && (u6 = e5.substring(0, a5 + 1));
        }
        if (o5 = this.tokenizer.inlineText(u6)) {
          e5 = e5.substring(o5.raw.length), o5.raw.slice(-1) !== "_" && (r5 = o5.raw.slice(-1)), s5 = true;
          let a5 = t5.at(-1);
          a5?.type === "text" ? (a5.raw += o5.raw, a5.text += o5.text) : t5.push(o5);
          continue;
        }
        if (e5) {
          this.infiniteLoopError(e5.charCodeAt(0));
          break;
        }
      }
      return t5;
    }
    infiniteLoopError(e5) {
      let t5 = "Infinite loop on byte: " + e5;
      if (this.options.silent) console.error(t5);
      else throw new Error(t5);
    }
  };
  var P4 = class {
    options;
    parser;
    constructor(e5) {
      this.options = e5 || R4;
    }
    space(e5) {
      return "";
    }
    code({ text: e5, lang: t5, escaped: n4 }) {
      let s5 = (t5 || "").match(m5.notSpaceStart)?.[0], r5 = e5.replace(m5.endingNewline, "") + `
`;
      return s5 ? '<pre><code class="language-' + T5(s5) + '">' + (n4 ? r5 : T5(r5, true)) + `</code></pre>
` : "<pre><code>" + (n4 ? r5 : T5(r5, true)) + `</code></pre>
`;
    }
    blockquote({ tokens: e5 }) {
      return `<blockquote>
${this.parser.parse(e5)}</blockquote>
`;
    }
    html({ text: e5 }) {
      return e5;
    }
    def(e5) {
      return "";
    }
    heading({ tokens: e5, depth: t5 }) {
      return `<h${t5}>${this.parser.parseInline(e5)}</h${t5}>
`;
    }
    hr(e5) {
      return `<hr>
`;
    }
    list(e5) {
      let t5 = e5.ordered, n4 = e5.start, s5 = "";
      for (let o5 = 0; o5 < e5.items.length; o5++) {
        let u6 = e5.items[o5];
        s5 += this.listitem(u6);
      }
      let r5 = t5 ? "ol" : "ul", i5 = t5 && n4 !== 1 ? ' start="' + n4 + '"' : "";
      return "<" + r5 + i5 + `>
` + s5 + "</" + r5 + `>
`;
    }
    listitem(e5) {
      return `<li>${this.parser.parse(e5.tokens)}</li>
`;
    }
    checkbox({ checked: e5 }) {
      return "<input " + (e5 ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
    }
    paragraph({ tokens: e5 }) {
      return `<p>${this.parser.parseInline(e5)}</p>
`;
    }
    table(e5) {
      let t5 = "", n4 = "";
      for (let r5 = 0; r5 < e5.header.length; r5++) n4 += this.tablecell(e5.header[r5]);
      t5 += this.tablerow({ text: n4 });
      let s5 = "";
      for (let r5 = 0; r5 < e5.rows.length; r5++) {
        let i5 = e5.rows[r5];
        n4 = "";
        for (let o5 = 0; o5 < i5.length; o5++) n4 += this.tablecell(i5[o5]);
        s5 += this.tablerow({ text: n4 });
      }
      return s5 && (s5 = `<tbody>${s5}</tbody>`), `<table>
<thead>
` + t5 + `</thead>
` + s5 + `</table>
`;
    }
    tablerow({ text: e5 }) {
      return `<tr>
${e5}</tr>
`;
    }
    tablecell(e5) {
      let t5 = this.parser.parseInline(e5.tokens), n4 = e5.header ? "th" : "td";
      return (e5.align ? `<${n4} align="${e5.align}">` : `<${n4}>`) + t5 + `</${n4}>
`;
    }
    strong({ tokens: e5 }) {
      return `<strong>${this.parser.parseInline(e5)}</strong>`;
    }
    em({ tokens: e5 }) {
      return `<em>${this.parser.parseInline(e5)}</em>`;
    }
    codespan({ text: e5 }) {
      return `<code>${T5(e5, true)}</code>`;
    }
    br(e5) {
      return "<br>";
    }
    del({ tokens: e5 }) {
      return `<del>${this.parser.parseInline(e5)}</del>`;
    }
    link({ href: e5, title: t5, tokens: n4 }) {
      let s5 = this.parser.parseInline(n4), r5 = Y2(e5);
      if (r5 === null) return s5;
      e5 = r5;
      let i5 = '<a href="' + e5 + '"';
      return t5 && (i5 += ' title="' + T5(t5) + '"'), i5 += ">" + s5 + "</a>", i5;
    }
    image({ href: e5, title: t5, text: n4, tokens: s5 }) {
      s5 && (n4 = this.parser.parseInline(s5, this.parser.textRenderer));
      let r5 = Y2(e5);
      if (r5 === null) return T5(n4);
      e5 = r5;
      let i5 = `<img src="${e5}" alt="${T5(n4)}"`;
      return t5 && (i5 += ` title="${T5(t5)}"`), i5 += ">", i5;
    }
    text(e5) {
      return "tokens" in e5 && e5.tokens ? this.parser.parseInline(e5.tokens) : "escaped" in e5 && e5.escaped ? e5.text : T5(e5.text);
    }
  };
  var L4 = class {
    strong({ text: e5 }) {
      return e5;
    }
    em({ text: e5 }) {
      return e5;
    }
    codespan({ text: e5 }) {
      return e5;
    }
    del({ text: e5 }) {
      return e5;
    }
    html({ text: e5 }) {
      return e5;
    }
    text({ text: e5 }) {
      return e5;
    }
    link({ text: e5 }) {
      return "" + e5;
    }
    image({ text: e5 }) {
      return "" + e5;
    }
    br() {
      return "";
    }
    checkbox({ raw: e5 }) {
      return e5;
    }
  };
  var b4 = class l6 {
    options;
    renderer;
    textRenderer;
    constructor(e5) {
      this.options = e5 || R4, this.options.renderer = this.options.renderer || new P4(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new L4();
    }
    static parse(e5, t5) {
      return new l6(t5).parse(e5);
    }
    static parseInline(e5, t5) {
      return new l6(t5).parseInline(e5);
    }
    parse(e5) {
      this.renderer.parser = this;
      let t5 = "";
      for (let n4 = 0; n4 < e5.length; n4++) {
        let s5 = e5[n4];
        if (this.options.extensions?.renderers?.[s5.type]) {
          let i5 = s5, o5 = this.options.extensions.renderers[i5.type].call({ parser: this }, i5);
          if (o5 !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "checkbox", "html", "def", "paragraph", "text"].includes(i5.type)) {
            t5 += o5 || "";
            continue;
          }
        }
        let r5 = s5;
        switch (r5.type) {
          case "space": {
            t5 += this.renderer.space(r5);
            break;
          }
          case "hr": {
            t5 += this.renderer.hr(r5);
            break;
          }
          case "heading": {
            t5 += this.renderer.heading(r5);
            break;
          }
          case "code": {
            t5 += this.renderer.code(r5);
            break;
          }
          case "table": {
            t5 += this.renderer.table(r5);
            break;
          }
          case "blockquote": {
            t5 += this.renderer.blockquote(r5);
            break;
          }
          case "list": {
            t5 += this.renderer.list(r5);
            break;
          }
          case "checkbox": {
            t5 += this.renderer.checkbox(r5);
            break;
          }
          case "html": {
            t5 += this.renderer.html(r5);
            break;
          }
          case "def": {
            t5 += this.renderer.def(r5);
            break;
          }
          case "paragraph": {
            t5 += this.renderer.paragraph(r5);
            break;
          }
          case "text": {
            t5 += this.renderer.text(r5);
            break;
          }
          default: {
            let i5 = 'Token with "' + r5.type + '" type was not found.';
            if (this.options.silent) return console.error(i5), "";
            throw new Error(i5);
          }
        }
      }
      return t5;
    }
    parseInline(e5, t5 = this.renderer) {
      this.renderer.parser = this;
      let n4 = "";
      for (let s5 = 0; s5 < e5.length; s5++) {
        let r5 = e5[s5];
        if (this.options.extensions?.renderers?.[r5.type]) {
          let o5 = this.options.extensions.renderers[r5.type].call({ parser: this }, r5);
          if (o5 !== false || !["escape", "html", "link", "image", "checkbox", "strong", "em", "codespan", "br", "del", "text"].includes(r5.type)) {
            n4 += o5 || "";
            continue;
          }
        }
        let i5 = r5;
        switch (i5.type) {
          case "escape": {
            n4 += t5.text(i5);
            break;
          }
          case "html": {
            n4 += t5.html(i5);
            break;
          }
          case "link": {
            n4 += t5.link(i5);
            break;
          }
          case "image": {
            n4 += t5.image(i5);
            break;
          }
          case "checkbox": {
            n4 += t5.checkbox(i5);
            break;
          }
          case "strong": {
            n4 += t5.strong(i5);
            break;
          }
          case "em": {
            n4 += t5.em(i5);
            break;
          }
          case "codespan": {
            n4 += t5.codespan(i5);
            break;
          }
          case "br": {
            n4 += t5.br(i5);
            break;
          }
          case "del": {
            n4 += t5.del(i5);
            break;
          }
          case "text": {
            n4 += t5.text(i5);
            break;
          }
          default: {
            let o5 = 'Token with "' + i5.type + '" type was not found.';
            if (this.options.silent) return console.error(o5), "";
            throw new Error(o5);
          }
        }
      }
      return n4;
    }
  };
  var S4 = class {
    options;
    block;
    constructor(e5) {
      this.options = e5 || R4;
    }
    static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
    static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
    preprocess(e5) {
      return e5;
    }
    postprocess(e5) {
      return e5;
    }
    processAllTokens(e5) {
      return e5;
    }
    emStrongMask(e5) {
      return e5;
    }
    provideLexer(e5 = this.block) {
      return e5 ? x4.lex : x4.lexInline;
    }
    provideParser(e5 = this.block) {
      return e5 ? b4.parse : b4.parseInline;
    }
  };
  var Z2 = class {
    defaults = A5();
    options = this.setOptions;
    parse = this.parseMarkdown(true);
    parseInline = this.parseMarkdown(false);
    Parser = b4;
    Renderer = P4;
    TextRenderer = L4;
    Lexer = x4;
    Tokenizer = y5;
    Hooks = S4;
    constructor(...e5) {
      this.use(...e5);
    }
    walkTokens(e5, t5) {
      let n4 = [];
      for (let s5 of e5) switch (n4 = n4.concat(t5.call(this, s5)), s5.type) {
        case "table": {
          let r5 = s5;
          for (let i5 of r5.header) n4 = n4.concat(this.walkTokens(i5.tokens, t5));
          for (let i5 of r5.rows) for (let o5 of i5) n4 = n4.concat(this.walkTokens(o5.tokens, t5));
          break;
        }
        case "list": {
          let r5 = s5;
          n4 = n4.concat(this.walkTokens(r5.items, t5));
          break;
        }
        default: {
          let r5 = s5;
          this.defaults.extensions?.childTokens?.[r5.type] ? this.defaults.extensions.childTokens[r5.type].forEach((i5) => {
            let o5 = r5[i5].flat(1 / 0);
            n4 = n4.concat(this.walkTokens(o5, t5));
          }) : r5.tokens && (n4 = n4.concat(this.walkTokens(r5.tokens, t5)));
        }
      }
      return n4;
    }
    use(...e5) {
      let t5 = this.defaults.extensions || { renderers: {}, childTokens: {} };
      return e5.forEach((n4) => {
        let s5 = { ...n4 };
        if (s5.async = this.defaults.async || s5.async || false, n4.extensions && (n4.extensions.forEach((r5) => {
          if (!r5.name) throw new Error("extension name required");
          if ("renderer" in r5) {
            let i5 = t5.renderers[r5.name];
            i5 ? t5.renderers[r5.name] = function(...o5) {
              let u6 = r5.renderer.apply(this, o5);
              return u6 === false && (u6 = i5.apply(this, o5)), u6;
            } : t5.renderers[r5.name] = r5.renderer;
          }
          if ("tokenizer" in r5) {
            if (!r5.level || r5.level !== "block" && r5.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
            let i5 = t5[r5.level];
            i5 ? i5.unshift(r5.tokenizer) : t5[r5.level] = [r5.tokenizer], r5.start && (r5.level === "block" ? t5.startBlock ? t5.startBlock.push(r5.start) : t5.startBlock = [r5.start] : r5.level === "inline" && (t5.startInline ? t5.startInline.push(r5.start) : t5.startInline = [r5.start]));
          }
          "childTokens" in r5 && r5.childTokens && (t5.childTokens[r5.name] = r5.childTokens);
        }), s5.extensions = t5), n4.renderer) {
          let r5 = this.defaults.renderer || new P4(this.defaults);
          for (let i5 in n4.renderer) {
            if (!(i5 in r5)) throw new Error(`renderer '${i5}' does not exist`);
            if (["options", "parser"].includes(i5)) continue;
            let o5 = i5, u6 = n4.renderer[o5], a5 = r5[o5];
            r5[o5] = (...p5) => {
              let c5 = u6.apply(r5, p5);
              return c5 === false && (c5 = a5.apply(r5, p5)), c5 || "";
            };
          }
          s5.renderer = r5;
        }
        if (n4.tokenizer) {
          let r5 = this.defaults.tokenizer || new y5(this.defaults);
          for (let i5 in n4.tokenizer) {
            if (!(i5 in r5)) throw new Error(`tokenizer '${i5}' does not exist`);
            if (["options", "rules", "lexer"].includes(i5)) continue;
            let o5 = i5, u6 = n4.tokenizer[o5], a5 = r5[o5];
            r5[o5] = (...p5) => {
              let c5 = u6.apply(r5, p5);
              return c5 === false && (c5 = a5.apply(r5, p5)), c5;
            };
          }
          s5.tokenizer = r5;
        }
        if (n4.hooks) {
          let r5 = this.defaults.hooks || new S4();
          for (let i5 in n4.hooks) {
            if (!(i5 in r5)) throw new Error(`hook '${i5}' does not exist`);
            if (["options", "block"].includes(i5)) continue;
            let o5 = i5, u6 = n4.hooks[o5], a5 = r5[o5];
            S4.passThroughHooks.has(i5) ? r5[o5] = (p5) => {
              if (this.defaults.async && S4.passThroughHooksRespectAsync.has(i5)) return (async () => {
                let h5 = await u6.call(r5, p5);
                return a5.call(r5, h5);
              })();
              let c5 = u6.call(r5, p5);
              return a5.call(r5, c5);
            } : r5[o5] = (...p5) => {
              if (this.defaults.async) return (async () => {
                let h5 = await u6.apply(r5, p5);
                return h5 === false && (h5 = await a5.apply(r5, p5)), h5;
              })();
              let c5 = u6.apply(r5, p5);
              return c5 === false && (c5 = a5.apply(r5, p5)), c5;
            };
          }
          s5.hooks = r5;
        }
        if (n4.walkTokens) {
          let r5 = this.defaults.walkTokens, i5 = n4.walkTokens;
          s5.walkTokens = function(o5) {
            let u6 = [];
            return u6.push(i5.call(this, o5)), r5 && (u6 = u6.concat(r5.call(this, o5))), u6;
          };
        }
        this.defaults = { ...this.defaults, ...s5 };
      }), this;
    }
    setOptions(e5) {
      return this.defaults = { ...this.defaults, ...e5 }, this;
    }
    lexer(e5, t5) {
      return x4.lex(e5, t5 ?? this.defaults);
    }
    parser(e5, t5) {
      return b4.parse(e5, t5 ?? this.defaults);
    }
    parseMarkdown(e5) {
      return (n4, s5) => {
        let r5 = { ...s5 }, i5 = { ...this.defaults, ...r5 }, o5 = this.onError(!!i5.silent, !!i5.async);
        if (this.defaults.async === true && r5.async === false) return o5(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
        if (typeof n4 > "u" || n4 === null) return o5(new Error("marked(): input parameter is undefined or null"));
        if (typeof n4 != "string") return o5(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n4) + ", string expected"));
        if (i5.hooks && (i5.hooks.options = i5, i5.hooks.block = e5), i5.async) return (async () => {
          let u6 = i5.hooks ? await i5.hooks.preprocess(n4) : n4, p5 = await (i5.hooks ? await i5.hooks.provideLexer(e5) : e5 ? x4.lex : x4.lexInline)(u6, i5), c5 = i5.hooks ? await i5.hooks.processAllTokens(p5) : p5;
          i5.walkTokens && await Promise.all(this.walkTokens(c5, i5.walkTokens));
          let d5 = await (i5.hooks ? await i5.hooks.provideParser(e5) : e5 ? b4.parse : b4.parseInline)(c5, i5);
          return i5.hooks ? await i5.hooks.postprocess(d5) : d5;
        })().catch(o5);
        try {
          i5.hooks && (n4 = i5.hooks.preprocess(n4));
          let a5 = (i5.hooks ? i5.hooks.provideLexer(e5) : e5 ? x4.lex : x4.lexInline)(n4, i5);
          i5.hooks && (a5 = i5.hooks.processAllTokens(a5)), i5.walkTokens && this.walkTokens(a5, i5.walkTokens);
          let c5 = (i5.hooks ? i5.hooks.provideParser(e5) : e5 ? b4.parse : b4.parseInline)(a5, i5);
          return i5.hooks && (c5 = i5.hooks.postprocess(c5)), c5;
        } catch (u6) {
          return o5(u6);
        }
      };
    }
    onError(e5, t5) {
      return (n4) => {
        if (n4.message += `
Please report this to https://github.com/markedjs/marked.`, e5) {
          let s5 = "<p>An error occurred:</p><pre>" + T5(n4.message + "", true) + "</pre>";
          return t5 ? Promise.resolve(s5) : s5;
        }
        if (t5) return Promise.reject(n4);
        throw n4;
      };
    }
  };
  var M3 = new Z2();
  function f6(l7, e5) {
    return M3.parse(l7, e5);
  }
  f6.options = f6.setOptions = function(l7) {
    return M3.setOptions(l7), f6.defaults = M3.defaults, j5(f6.defaults), f6;
  };
  f6.getDefaults = A5;
  f6.defaults = R4;
  function dt(...l7) {
    return M3.use(...l7), f6.defaults = M3.defaults, j5(f6.defaults), f6;
  }
  f6.use = dt;
  f6.walkTokens = function(l7, e5) {
    return M3.walkTokens(l7, e5);
  };
  f6.parseInline = M3.parseInline;
  f6.Parser = b4;
  f6.parser = b4.parse;
  f6.Renderer = P4;
  f6.TextRenderer = L4;
  f6.Lexer = x4;
  f6.lexer = x4.lex;
  f6.Tokenizer = y5;
  f6.Hooks = S4;
  f6.parse = f6;
  var nn = f6.options;
  var rn = f6.setOptions;
  var sn = f6.walkTokens;
  var on = f6.parseInline;
  var ln = b4.parse;
  var un = x4.lex;

  // src/markdown.ts
  var TASK_ATTRIBUTE = "data-task";
  var taskCount = 0;
  var markdown = new Z2({
    gfm: true,
    // A note is typed, not composed: a single newline means a new line.
    breaks: true,
    renderer: {
      checkbox({ checked }) {
        const index = taskCount;
        taskCount += 1;
        return `<input type="checkbox" ${TASK_ATTRIBUTE}="${index}"${checked ? ' checked=""' : ""}> `;
      }
    }
  });
  purify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName !== "A") return;
    const element = node;
    if (!element.hasAttribute("href")) return;
    element.setAttribute("target", "_blank");
    element.setAttribute("rel", "noopener noreferrer");
  });
  function renderMarkdown(text3) {
    taskCount = 0;
    const html2 = markdown.parse(text3, { async: false });
    return purify.sanitize(html2, {
      // `target` is not sanitized in by default, and the hook above adds it.
      ADD_ATTR: ["target"],
      // The board is not a document: a note may not carry its own page furniture.
      FORBID_TAGS: ["style", "form", "iframe", "object", "embed"]
    });
  }

  // src/note.tsx
  var HANDLE_PX = 10;
  var OUTLINE_PX2 = 2;
  var BAR_GAP_PX = 8;
  var FORMATS = [
    { kind: "bold", name: "Bold", syntax: "**bold**", glyph: "B" },
    { kind: "italic", name: "Italic", syntax: "*italic*", glyph: "I" },
    { kind: "heading", name: "Heading", syntax: "#, ##, ###", glyph: "H" },
    { kind: "bullet", name: "Bullet list", syntax: "- item", glyph: "•" },
    { kind: "task", name: "Task list", syntax: "- [ ] task", glyph: "☑" },
    { kind: "code", name: "Inline code", syntax: "`code`", glyph: "`" },
    { kind: "codeblock", name: "Code block", syntax: "```", glyph: "```" },
    { kind: "link", name: "Link", syntax: "[text](url)", glyph: "Link" }
  ];
  function Note(props) {
    const { note, selected, editing, zoom, locked } = props;
    const element = A2(null);
    const editor = A2(null);
    const drag = A2(null);
    const restore = A2(null);
    const preview = T2(() => renderMarkdown(note.text), [note.text]);
    const [fontMenu, setFontMenu] = d2(false);
    h2(() => {
      if (!selected) setFontMenu(false);
    }, [selected]);
    h2(() => {
      const field = editor.current;
      if (!editing || !field) return;
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }, [editing]);
    _2(() => {
      const field = editor.current;
      const wanted = restore.current;
      restore.current = null;
      if (!field || !wanted) return;
      field.focus();
      field.setSelectionRange(wanted.start, wanted.end);
    }, [note.text]);
    function begin(event, handle) {
      if (locked || event.button !== 0) return;
      event.stopPropagation();
      if (!props.onSelect(note.id, event.shiftKey)) return;
      if (editing && !handle) return;
      if (!handle && isInteractive(event.target)) return;
      drag.current = {
        pointerId: event.pointerId,
        handle,
        origin: props.toWorld(event),
        start: { x: note.x, y: note.y, width: note.width, height: note.height },
        gesture: props.startGesture(handle ? `resize:${note.id}` : `move:${note.id}`),
        moved: false,
        additive: event.shiftKey
      };
      element.current?.setPointerCapture?.(event.pointerId);
    }
    function onPointerMove(event) {
      const active = drag.current;
      if (!active || active.pointerId !== event.pointerId) return;
      const world = props.toWorld(event);
      const dx = world.x - active.origin.x;
      const dy = world.y - active.origin.y;
      if (!active.moved && Math.hypot(dx, dy) * zoom < CLICK_SLOP_PX) return;
      active.moved = true;
      if (active.handle) {
        props.onResize(note.id, resizeRect(active.start, active.handle, dx, dy), active.gesture);
      } else {
        props.onMove(note.id, { x: active.start.x + dx, y: active.start.y + dy }, active.gesture);
      }
    }
    function endDrag(event) {
      const active = drag.current;
      if (!active || active.pointerId !== event.pointerId) return;
      drag.current = null;
      if (element.current?.hasPointerCapture?.(event.pointerId)) {
        element.current.releasePointerCapture(event.pointerId);
      }
      if (!active.moved && !active.handle) props.onClick(note.id, active.additive);
    }
    function format(kind) {
      const field = editor.current;
      if (!field) return;
      const next = applyFormat(kind, {
        text: field.value,
        start: field.selectionStart,
        end: field.selectionEnd
      });
      field.focus();
      if (next.text === field.value) {
        field.setSelectionRange(next.start, next.end);
        return;
      }
      restore.current = next;
      props.onFormat(note.id, next.text);
    }
    function onPreviewClick(event) {
      const box = event.target;
      if (!(box instanceof HTMLInputElement) || box.type !== "checkbox") return;
      event.preventDefault();
      event.stopPropagation();
      const task = Number(box.getAttribute(TASK_ATTRIBUTE));
      if (!Number.isInteger(task)) return;
      props.onToggleTask(note.id, task);
    }
    const handleSize = HANDLE_PX / zoom;
    return /* @__PURE__ */ u5(
      "div",
      {
        ref: element,
        class: `note note--${note.color}${selected ? " note--selected" : ""}${editing ? " note--editing" : ""}`,
        "data-testid": "note",
        "data-note-id": note.id,
        style: {
          left: `${note.x}px`,
          top: `${note.y}px`,
          width: `${note.width}px`,
          height: `${note.height}px`,
          outlineWidth: `${OUTLINE_PX2 / zoom}px`,
          // A note without a font of its own inherits the board's default.
          ...note.font ? { fontFamily: fontStack(note.font) } : {}
        },
        onPointerDown: (event) => begin(event, null),
        onPointerMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        onDblClick: (event) => {
          if (locked) return;
          event.stopPropagation();
          if (isInteractive(event.target)) return;
          props.onEdit(note.id);
        },
        children: [
          editing ? /* @__PURE__ */ u5(
            "textarea",
            {
              ref: editor,
              class: "note__editor",
              "aria-label": "Note markdown",
              value: note.text,
              onInput: (event) => props.onText(note.id, event.currentTarget.value),
              onPointerDown: (event) => event.stopPropagation(),
              onDblClick: (event) => event.stopPropagation(),
              onKeyDown: (event) => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                props.onEditEnd();
              },
              onBlur: () => props.onEditEnd()
            }
          ) : note.text.trim().length === 0 ? /* @__PURE__ */ u5("div", { class: "note__text note__empty", children: "Double-click to write" }) : /* @__PURE__ */ u5(
            "div",
            {
              class: "note__text markdown",
              "data-testid": "note-preview",
              onClick: onPreviewClick,
              dangerouslySetInnerHTML: { __html: preview }
            }
          ),
          selected ? /* @__PURE__ */ u5(
            "div",
            {
              class: "note__chrome",
              style: { transform: `scale(${1 / zoom}) translateY(${-BAR_GAP_PX}px)` },
              onPointerDown: (event) => {
                event.preventDefault();
                event.stopPropagation();
              },
              onMouseDown: (event) => event.preventDefault(),
              onDblClick: (event) => event.stopPropagation(),
              children: [
                editing ? /* @__PURE__ */ u5("div", { class: "note__bar", role: "toolbar", "aria-label": "Formatting", children: FORMATS.map((entry) => /* @__PURE__ */ u5(
                  "button",
                  {
                    type: "button",
                    class: `note__tool note__format note__format--${entry.kind}`,
                    "aria-label": entry.name,
                    title: `${entry.name} (${entry.syntax})`,
                    onClick: () => format(entry.kind),
                    children: entry.glyph
                  },
                  entry.kind
                )) }) : null,
                /* @__PURE__ */ u5("div", { class: "note__bar", role: "toolbar", "aria-label": "Note", children: [
                  /* @__PURE__ */ u5(
                    "button",
                    {
                      type: "button",
                      class: "note__tool note__flip",
                      "aria-label": editing ? "Show the rendered note" : "Edit the markdown",
                      title: editing ? "Back to the rendered note (Esc)" : "Edit the markdown",
                      onClick: () => editing ? props.onEditEnd() : props.onEdit(note.id),
                      children: editing ? "Done" : "Edit"
                    }
                  ),
                  /* @__PURE__ */ u5("span", { class: "note__separator", "aria-hidden": "true" }),
                  NOTE_COLORS.map((color) => /* @__PURE__ */ u5(
                    "button",
                    {
                      type: "button",
                      class: `note__swatch note__swatch--${color}${color === note.color ? " note__swatch--current" : ""}`,
                      "data-color": color,
                      "aria-label": `Colour ${color}`,
                      "aria-pressed": color === note.color,
                      title: `${color} (C cycles)`,
                      onClick: () => props.onColor(note.id, color)
                    },
                    color
                  )),
                  /* @__PURE__ */ u5("span", { class: "note__separator", "aria-hidden": "true" }),
                  /* @__PURE__ */ u5("div", { class: "note__fontpick", children: [
                    /* @__PURE__ */ u5(
                      "button",
                      {
                        type: "button",
                        class: `note__tool note__fontbutton${fontMenu ? " note__tool--on" : ""}`,
                        "aria-label": "Font",
                        "aria-haspopup": "menu",
                        "aria-expanded": fontMenu,
                        title: note.font ? `Font: ${fontFor(note.font).label}` : "Font (the default)",
                        onClick: () => setFontMenu((open) => !open),
                        children: "Aa"
                      }
                    ),
                    fontMenu ? /* @__PURE__ */ u5("div", { class: "note__menu", role: "menu", "aria-label": "Note font", "data-chrome": "font", children: [
                      /* @__PURE__ */ u5(
                        "button",
                        {
                          type: "button",
                          role: "menuitemradio",
                          class: `note__menuitem${note.font ? "" : " note__menuitem--on"}`,
                          "aria-checked": !note.font,
                          onClick: () => {
                            setFontMenu(false);
                            props.onFont(note.id, null);
                          },
                          children: "Default"
                        }
                      ),
                      FONTS.map((font) => /* @__PURE__ */ u5(
                        "button",
                        {
                          type: "button",
                          role: "menuitemradio",
                          class: `note__menuitem${note.font === font.name ? " note__menuitem--on" : ""}`,
                          style: { fontFamily: font.stack },
                          "aria-checked": note.font === font.name,
                          onClick: () => {
                            setFontMenu(false);
                            props.onFont(note.id, font.name);
                          },
                          children: font.label
                        },
                        font.name
                      ))
                    ] }) : null
                  ] }),
                  /* @__PURE__ */ u5("span", { class: "note__separator", "aria-hidden": "true" }),
                  /* @__PURE__ */ u5(
                    "button",
                    {
                      type: "button",
                      class: "note__tool note__delete",
                      "aria-label": "Delete note",
                      title: "Delete note (Delete)",
                      onClick: () => props.onDelete(note.id),
                      children: "×"
                    }
                  )
                ] })
              ]
            }
          ) : null,
          selected && !editing ? RESIZE_HANDLES.map((handle) => /* @__PURE__ */ u5(
            "div",
            {
              class: `note__handle note__handle--${handle}`,
              "data-handle": handle,
              style: {
                width: `${handleSize}px`,
                height: `${handleSize}px`,
                margin: `${-handleSize / 2}px`
              },
              onPointerDown: (event) => begin(event, handle)
            },
            handle
          )) : null
        ]
      }
    );
  }
  function isInteractive(target) {
    if (!(target instanceof Element)) return false;
    return target.closest("input, a, button") !== null;
  }

  // src/settings.ts
  var SETTINGS_SCHEMA_VERSION = 1;
  var SETTINGS_STORAGE_KEY = "settings";
  function createSettings() {
    return { schemaVersion: SETTINGS_SCHEMA_VERSION, font: DEFAULT_FONT };
  }
  function setDefaultFont(settings, font) {
    return settings.font === font ? settings : { ...settings, font };
  }
  function readSettings(raw) {
    const defaults = createSettings();
    if (!isRecord(raw)) return defaults;
    const version = typeof raw["schemaVersion"] === "number" ? raw["schemaVersion"] : 0;
    if (version < 1) return defaults;
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      font: isFontName(raw["font"]) ? raw["font"] : defaults.font
    };
  }

  // src/persistence.ts
  var AUTOSAVE_DELAY_MS = 400;
  async function loadIndex(storage) {
    if (!storage) return { value: readIndex(null), failed: false };
    try {
      return { value: readIndex(await storage.get(BOARDS_STORAGE_KEY)), failed: false };
    } catch {
      return { value: readIndex(null), failed: true };
    }
  }
  async function loadSettings(storage) {
    if (!storage) return createSettings();
    try {
      return readSettings(await storage.get(SETTINGS_STORAGE_KEY));
    } catch {
      return createSettings();
    }
  }
  async function loadBoard(storage, id = DEFAULT_BOARD_ID) {
    if (!storage) return { value: createBoard(id), failed: false };
    try {
      const raw = await storage.get(boardStorageKey(id));
      return { value: readBoard(raw, id), failed: false };
    } catch {
      return { value: createBoard(id), failed: true };
    }
  }
  async function loadBackground(storage, id = DEFAULT_BOARD_ID) {
    if (!storage) return null;
    try {
      return readBackground(await storage.get(backgroundStorageKey(id)));
    } catch {
      return null;
    }
  }
  function createAutosave(storage, onStatus, delayMs = AUTOSAVE_DELAY_MS) {
    let disposed = false;
    let chain = Promise.resolve();
    let queued = 0;
    function enqueue(key, value) {
      if (!storage || disposed) return;
      queued += 1;
      onStatus("saving");
      chain = chain.then(async () => {
        try {
          await storage.set(key, value);
          queued -= 1;
          if (!disposed && queued === 0 && !board.pending && !background.pending) onStatus("saved");
        } catch {
          queued -= 1;
          if (!disposed) onStatus("error");
        }
      });
    }
    function debounced() {
      let timer = null;
      let due = null;
      function write() {
        timer = null;
        const entry = due;
        due = null;
        if (entry) enqueue(entry.key, entry.value);
      }
      function clear() {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        due = null;
      }
      return {
        get pending() {
          return due !== null;
        },
        schedule(key, value) {
          due = { key, value };
          if (timer !== null) clearTimeout(timer);
          timer = setTimeout(write, delayMs);
        },
        /** Writes now what was waiting, if anything. */
        flush() {
          if (timer === null) return;
          clearTimeout(timer);
          write();
        },
        clear,
        /** Drops what is waiting only if it is for `key`. */
        clearKey(key) {
          if (due?.key === key) clear();
        }
      };
    }
    const board = debounced();
    const background = debounced();
    function unavailable() {
      if (storage) return false;
      onStatus("unavailable");
      return true;
    }
    return {
      schedule(document2) {
        if (disposed || unavailable()) return;
        board.schedule(boardStorageKey(document2.id), document2);
      },
      scheduleBackground(boardId, value) {
        if (disposed || unavailable()) return;
        background.schedule(backgroundStorageKey(boardId), value);
      },
      writeIndex(index) {
        if (disposed || unavailable()) return;
        enqueue(BOARDS_STORAGE_KEY, index);
      },
      writeSettings(settings) {
        if (disposed || unavailable()) return;
        enqueue(SETTINGS_STORAGE_KEY, settings);
      },
      writeBackground(boardId, value) {
        if (disposed || unavailable()) return;
        const key = backgroundStorageKey(boardId);
        background.clearKey(key);
        enqueue(key, value);
      },
      tombstone(id) {
        if (disposed || !storage) return;
        background.clearKey(backgroundStorageKey(id));
        enqueue(boardStorageKey(id), null);
        enqueue(backgroundStorageKey(id), null);
      },
      discard() {
        board.clear();
        background.clear();
      },
      async flush() {
        board.flush();
        background.flush();
        await chain;
      },
      dispose() {
        disposed = true;
        board.clear();
        background.clear();
      }
    };
  }

  // src/selection.ts
  function drawnItemAt(items, point, tolerance) {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item && isDrawn(item) && hits(item, point, tolerance)) return item;
    }
    return null;
  }
  function itemsInside(items, box) {
    if (box.width <= 0 || box.height <= 0) return [];
    const right = box.x + box.width;
    const bottom = box.y + box.height;
    return items.filter((item) => {
      const bounds = itemBounds(item);
      return bounds.x >= box.x && bounds.y >= box.y && bounds.x + bounds.width <= right && bounds.y + bounds.height <= bottom;
    }).map((item) => item.id);
  }

  // src/dismiss.ts
  function useDismiss(root2, onClose, { active = true, ignore } = {}) {
    const close = A2(onClose);
    close.current = onClose;
    _2(() => {
      if (!active) return;
      const owner = root2.current?.ownerDocument ?? document;
      const onPointerDown = (event) => {
        const target = event.target;
        if (target instanceof Node && root2.current?.contains(target)) return;
        if (ignore && target instanceof Element && target.closest(ignore)) return;
        close.current();
      };
      const onKeyDown = (event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        close.current();
      };
      owner.addEventListener("pointerdown", onPointerDown, true);
      owner.addEventListener("keydown", onKeyDown);
      return () => {
        owner.removeEventListener("pointerdown", onPointerDown, true);
        owner.removeEventListener("keydown", onKeyDown);
      };
    }, [active, ignore, root2]);
  }

  // src/settings-panel.tsx
  var IMAGE_ACCEPT = IMAGE_TYPES.join(",");
  function SettingsPanel(props) {
    const { settings, background, boardName, importError } = props;
    const root2 = A2(null);
    useDismiss(root2, props.onClose, { ignore: "[data-settings-toggle]" });
    const look = background ?? NEUTRAL_LOOK;
    return /* @__PURE__ */ u5(
      "div",
      {
        ref: root2,
        class: "settings",
        role: "dialog",
        "aria-label": "Settings",
        "data-chrome": "settings",
        onPointerDown: (event) => event.stopPropagation(),
        onDblClick: (event) => event.stopPropagation(),
        children: [
          /* @__PURE__ */ u5("div", { class: "settings__head", children: [
            /* @__PURE__ */ u5("h2", { class: "settings__title", children: "Settings" }),
            /* @__PURE__ */ u5(
              "button",
              {
                type: "button",
                class: "settings__close",
                "aria-label": "Close settings",
                title: "Close (Esc)",
                onClick: props.onClose,
                children: "×"
              }
            )
          ] }),
          /* @__PURE__ */ u5("section", { class: "settings__section", children: [
            /* @__PURE__ */ u5("h3", { class: "settings__heading", children: "Text" }),
            /* @__PURE__ */ u5("p", { class: "settings__note", children: "The font for every note and label. A note can pick its own from the bar above it." }),
            /* @__PURE__ */ u5("div", { class: "settings__fonts", role: "radiogroup", "aria-label": "Default font", children: FONTS.map((font) => /* @__PURE__ */ u5(
              "button",
              {
                type: "button",
                role: "radio",
                class: `settings__font${font.name === settings.font ? " settings__font--on" : ""}`,
                style: { fontFamily: font.stack },
                "aria-checked": font.name === settings.font,
                onClick: () => props.onFont(font.name),
                children: [
                  /* @__PURE__ */ u5("span", { class: "settings__font-name", children: font.label }),
                  /* @__PURE__ */ u5("span", { class: "settings__font-hint", children: font.hint })
                ]
              },
              font.name
            )) })
          ] }),
          /* @__PURE__ */ u5("section", { class: "settings__section", children: [
            /* @__PURE__ */ u5("h3", { class: "settings__heading", children: [
              "Background ",
              /* @__PURE__ */ u5("span", { class: "settings__board", children: boardName })
            ] }),
            /* @__PURE__ */ u5("div", { class: "settings__row", children: [
              /* @__PURE__ */ u5("label", { class: "settings__button settings__button--primary", children: [
                background ? "Change picture…" : "Choose picture…",
                /* @__PURE__ */ u5(
                  "input",
                  {
                    type: "file",
                    class: "settings__file",
                    accept: IMAGE_ACCEPT,
                    "aria-label": "Choose a background picture",
                    onChange: (event) => {
                      const field = event.currentTarget;
                      const file = field.files?.[0];
                      field.value = "";
                      if (file) props.onImport(file);
                    }
                  }
                )
              ] }),
              background ? /* @__PURE__ */ u5("button", { type: "button", class: "settings__button", onClick: props.onRemoveBackground, children: "Remove" }) : null
            ] }),
            /* @__PURE__ */ u5("p", { class: "settings__note", children: "PNG, JPEG or WebP — or drop one onto the board. It is shrunk to fit and kept with this board only." }),
            importError ? /* @__PURE__ */ u5("p", { class: "settings__error", role: "alert", children: importError }) : null,
            /* @__PURE__ */ u5("div", { class: "settings__sliders", children: LOOK_CONTROLS.map((control) => /* @__PURE__ */ u5("label", { class: "settings__slider", children: [
              /* @__PURE__ */ u5("span", { class: "settings__slider-name", children: control.label }),
              /* @__PURE__ */ u5(
                "input",
                {
                  type: "range",
                  min: control.min,
                  max: control.max,
                  step: 1,
                  value: look[control.key],
                  disabled: !background,
                  "aria-label": control.label,
                  onInput: (event) => props.onAdjust(control.key, Number(event.currentTarget.value))
                }
              ),
              /* @__PURE__ */ u5("output", { class: "settings__slider-value", children: [
                look[control.key],
                "%"
              ] })
            ] }, control.key)) }),
            background ? /* @__PURE__ */ u5("button", { type: "button", class: "settings__button settings__reset", onClick: props.onResetLook, children: "Reset sliders" }) : null
          ] })
        ]
      }
    );
  }

  // src/switcher.tsx
  function Switcher(props) {
    const { index, project } = props;
    const [open, setOpen] = d2(false);
    const [mode, setMode] = d2("list");
    const root2 = A2(null);
    const board = currentBoard(index);
    const linked = project ? boardForProject(index, project.id) : null;
    function close() {
      setOpen(false);
      setMode("list");
    }
    function run2(action) {
      action();
      close();
    }
    useDismiss(root2, close, { active: open });
    return /* @__PURE__ */ u5("div", { class: "boards", ref: root2, "data-chrome": "boards", children: [
      /* @__PURE__ */ u5(
        "button",
        {
          type: "button",
          class: "boards__current",
          "aria-label": "Boards",
          "aria-haspopup": "menu",
          "aria-expanded": open,
          onClick: () => open ? close() : setOpen(true),
          children: [
            /* @__PURE__ */ u5("span", { class: "boards__name", children: board.name }),
            board.projectId !== null ? /* @__PURE__ */ u5("span", { class: "boards__link", title: `Linked to ${projectLabel(board.projectId)}`, children: "◆" }) : null,
            /* @__PURE__ */ u5("span", { class: "boards__chevron", "aria-hidden": "true", children: "▾" })
          ]
        }
      ),
      open ? /* @__PURE__ */ u5("div", { class: "boards__menu", role: "menu", "aria-label": "Boards", children: [
        mode === "list" ? /* @__PURE__ */ u5(
          List,
          {
            ...props,
            board,
            linked,
            onMode: setMode,
            onRun: run2
          }
        ) : null,
        mode === "create" ? /* @__PURE__ */ u5(
          NameForm,
          {
            label: "Name the new board",
            submit: "Create",
            initial: "",
            onCancel: () => setMode("list"),
            onSubmit: (name) => run2(() => props.onCreate(name, null))
          }
        ) : null,
        mode === "rename" ? /* @__PURE__ */ u5(
          NameForm,
          {
            label: "Rename this board",
            submit: "Save",
            initial: board.name,
            onCancel: () => setMode("list"),
            onSubmit: (name) => run2(() => props.onRename(name))
          }
        ) : null,
        mode === "delete" ? /* @__PURE__ */ u5("div", { class: "boards__confirm", children: [
          /* @__PURE__ */ u5("p", { class: "boards__question", children: [
            "Delete “",
            board.name,
            "” and everything on it?"
          ] }),
          /* @__PURE__ */ u5("div", { class: "boards__row", children: [
            /* @__PURE__ */ u5(
              "button",
              {
                type: "button",
                class: "boards__button boards__button--danger",
                onClick: () => run2(props.onDelete),
                children: "Yes, delete"
              }
            ),
            /* @__PURE__ */ u5(
              "button",
              {
                type: "button",
                class: "boards__button",
                onClick: () => setMode("list"),
                children: "Cancel"
              }
            )
          ] })
        ] }) : null
      ] }) : null
    ] });
  }
  function List({
    index,
    project,
    board,
    linked,
    onOpen,
    onLink,
    onCreate,
    onCopy,
    onMode,
    onRun
  }) {
    return /* @__PURE__ */ u5(S, { children: [
      project ? /* @__PURE__ */ u5("div", { class: "boards__section", children: [
        /* @__PURE__ */ u5("p", { class: "boards__heading", children: [
          "Project · ",
          project.name
        ] }),
        linked === null ? /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: "boards__item",
            role: "menuitem",
            onClick: () => onRun(() => onCreate(project.name, project.id)),
            children: [
              "New board for ",
              project.name
            ]
          }
        ) : linked.id === board.id ? /* @__PURE__ */ u5("p", { class: "boards__note", children: [
          "This board is linked to ",
          project.name,
          "."
        ] }) : /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: "boards__item",
            role: "menuitem",
            onClick: () => onRun(() => onOpen(linked.id)),
            children: [
              "Open “",
              linked.name,
              "”"
            ]
          }
        )
      ] }) : null,
      /* @__PURE__ */ u5("div", { class: "boards__section boards__section--list", children: [
        /* @__PURE__ */ u5("p", { class: "boards__heading", children: "Boards" }),
        index.boards.map((entry) => /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: `boards__item${entry.id === board.id ? " boards__item--current" : ""}`,
            role: "menuitemradio",
            "aria-checked": entry.id === board.id,
            "data-board-id": entry.id,
            onClick: () => onRun(() => onOpen(entry.id)),
            children: [
              /* @__PURE__ */ u5("span", { class: "boards__tick", "aria-hidden": "true", children: entry.id === board.id ? "✓" : "" }),
              /* @__PURE__ */ u5("span", { class: "boards__label", children: entry.name }),
              entry.projectId !== null ? /* @__PURE__ */ u5("span", { class: "boards__project", children: projectLabel(entry.projectId) }) : null
            ]
          },
          entry.id
        ))
      ] }),
      /* @__PURE__ */ u5("div", { class: "boards__section", children: [
        /* @__PURE__ */ u5("button", { type: "button", class: "boards__item", role: "menuitem", onClick: () => onMode("create"), children: "New board…" }),
        /* @__PURE__ */ u5("button", { type: "button", class: "boards__item", role: "menuitem", onClick: () => onMode("rename"), children: "Rename this board…" }),
        /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: "boards__item",
            role: "menuitem",
            onClick: () => onRun(onCopy),
            children: "Copy this board as JSON"
          }
        ),
        project ? board.projectId === project.id ? /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: "boards__item",
            role: "menuitem",
            onClick: () => onRun(() => onLink(null)),
            children: [
              "Unlink from ",
              project.name
            ]
          }
        ) : /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: "boards__item",
            role: "menuitem",
            onClick: () => onRun(() => onLink(project.id)),
            children: [
              "Link this board to ",
              project.name
            ]
          }
        ) : null,
        /* @__PURE__ */ u5(
          "button",
          {
            type: "button",
            class: "boards__item boards__item--danger",
            role: "menuitem",
            onClick: () => onMode("delete"),
            children: "Delete this board…"
          }
        )
      ] })
    ] });
  }
  function NameForm({
    label,
    submit,
    initial,
    onSubmit,
    onCancel
  }) {
    const field = A2(null);
    _2(() => {
      field.current?.focus();
      field.current?.select();
    }, []);
    return /* @__PURE__ */ u5(
      "form",
      {
        class: "boards__form",
        onSubmit: (event) => {
          event.preventDefault();
          const name = field.current?.value.trim() ?? "";
          if (name.length === 0) return;
          onSubmit(name);
        },
        children: [
          /* @__PURE__ */ u5("label", { class: "boards__heading", for: "board-name", children: label }),
          /* @__PURE__ */ u5(
            "input",
            {
              ref: field,
              id: "board-name",
              class: "boards__input",
              type: "text",
              value: initial,
              maxLength: MAX_BOARD_NAME_LENGTH,
              autocomplete: "off",
              spellcheck: false,
              onKeyDown: (event) => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                onCancel();
              }
            }
          ),
          /* @__PURE__ */ u5("div", { class: "boards__row", children: [
            /* @__PURE__ */ u5("button", { type: "submit", class: "boards__button boards__button--primary", children: submit }),
            /* @__PURE__ */ u5("button", { type: "button", class: "boards__button", onClick: onCancel, children: "Cancel" })
          ] })
        ]
      }
    );
  }

  // src/app.tsx
  var SAVE_LABELS = {
    loading: "Loading…",
    saving: "Saving…",
    saved: "Saved",
    error: "Not saved",
    unavailable: "No host storage"
  };
  var TOAST_MS = 2600;
  var INK_SAMPLE_PX = 2;
  var ERASER_REACH_PX = 10;
  var MIN_SHAPE_DRAG_PX = 4;
  var SELECT_REACH_PX = 8;
  function mountCanvas(root2, bridge) {
    let markReady = () => {
    };
    const ready = new Promise((resolve) => {
      markReady = resolve;
    });
    const bindings = {
      flush: async () => {
      },
      markReady: () => markReady()
    };
    R(/* @__PURE__ */ u5(CanvasApp, { bridge, bindings }), root2);
    return {
      ready,
      flush: () => bindings.flush(),
      unmount: () => R(null, root2)
    };
  }
  function CanvasApp({ bridge, bindings }) {
    const storage = bridge?.storage ?? null;
    const [session, setSession] = d2(null);
    const [index, setIndex] = d2(null);
    const [project, setProject] = d2(null);
    const [status, setStatus] = d2("loading");
    const [panning, setPanning] = d2(false);
    const [spaceHeld, setSpaceHeld] = d2(false);
    const [editing, setEditing] = d2(null);
    const [tool, setTool] = d2(DEFAULT_TOOL);
    const [strokeColor, setStrokeColor] = d2(DEFAULT_STROKE_COLOR);
    const [strokeSize, setStrokeSize] = d2(DEFAULT_STROKE_WIDTH);
    const [draft, setDraft] = d2(null);
    const [pendingLabel, setPendingLabel] = d2(null);
    const [marquee, setMarquee] = d2(null);
    const [settings, setSettings] = d2(createSettings);
    const [background, setBackground] = d2(null);
    const [settingsOpen, setSettingsOpen] = d2(false);
    const [importError, setImportError] = d2(null);
    const [dropping, setDropping] = d2(false);
    const [toast, setToast] = d2(null);
    const surfaceRef = A2(null);
    const sessionRef = A2(null);
    const indexRef = A2(null);
    const settingsRef = A2(createSettings());
    const backgroundRef = A2(null);
    const dragDepth = A2(0);
    const toastTimer = A2(null);
    const editingRef = A2(null);
    const pendingLabelRef = A2(null);
    const drawRef = A2(null);
    const selectRef = A2(null);
    const nudgeRef = A2(null);
    const gestureCount = A2(0);
    const savingBlockedRef = A2(false);
    const indexBlockedRef = A2(false);
    const autosave = T2(() => createAutosave(storage, setStatus), [storage]);
    h2(() => {
      bindings.flush = () => autosave.flush();
    }, [autosave, bindings]);
    h2(() => {
      let cancelled = false;
      void (async () => {
        const [stored, prefs] = await Promise.all([loadIndex(storage), loadSettings(storage)]);
        const [document2, backdrop] = await Promise.all([
          loadBoard(storage, stored.value.lastOpen),
          loadBackground(storage, stored.value.lastOpen)
        ]);
        if (cancelled) return;
        const loaded = createSession(document2.value);
        sessionRef.current = loaded;
        indexRef.current = stored.value;
        settingsRef.current = prefs;
        backgroundRef.current = backdrop;
        savingBlockedRef.current = document2.failed;
        indexBlockedRef.current = stored.failed;
        setSession(loaded);
        setIndex(stored.value);
        setSettings(prefs);
        setBackground(backdrop);
        if (document2.failed || stored.failed) setStatus("error");
        else if (!storage) setStatus("unavailable");
        else {
          autosave.writeIndex(stored.value);
          autosave.schedule(document2.value);
        }
        bindings.markReady();
      })();
      return () => {
        cancelled = true;
        autosave.dispose();
      };
    }, [autosave, bindings, storage]);
    h2(() => {
      const read = bridge?.context;
      if (!read) return;
      let cancelled = false;
      const apply2 = (context) => {
        if (!cancelled) setProject(readProject(context));
      };
      void read.call(bridge).then(apply2, () => apply2(null));
      const unsubscribe = bridge?.onContextChange?.call(bridge, apply2);
      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }, [bridge]);
    const dispatch = q2(
      (action) => {
        const current = sessionRef.current;
        if (!current) return;
        const next = sessionReducer(current, action);
        if (next === current) return;
        sessionRef.current = next;
        setSession(next);
        if (next.document !== current.document && !savingBlockedRef.current) {
          autosave.schedule(next.document);
        }
      },
      [autosave]
    );
    const setViewport = q2(
      (viewport2) => dispatch({ type: "viewport/changed", viewport: viewport2 }),
      [dispatch]
    );
    const updateIndex = q2(
      (next) => {
        if (next === indexRef.current) return;
        indexRef.current = next;
        setIndex(next);
        if (!indexBlockedRef.current) autosave.writeIndex(next);
      },
      [autosave]
    );
    const startGesture = q2((kind) => {
      gestureCount.current += 1;
      return `${kind}#${gestureCount.current}`;
    }, []);
    const setLabelDraft = q2((label) => {
      pendingLabelRef.current = label;
      setPendingLabel(label);
    }, []);
    const startEditing = q2(
      (id) => {
        const next = { id, gesture: startGesture(`text:${id}`) };
        editingRef.current = next;
        setEditing(next);
      },
      [startGesture]
    );
    const stopEditing = q2(() => {
      editingRef.current = null;
      setEditing(null);
      const label = pendingLabelRef.current;
      if (!label) return;
      setLabelDraft(null);
      if (label.text.trim().length > 0) dispatch({ type: "item/added", item: label });
    }, [dispatch, setLabelDraft]);
    const abandonDrafts = q2(() => {
      drawRef.current = null;
      setDraft(null);
      selectRef.current = null;
      setMarquee(null);
      editingRef.current = null;
      setEditing(null);
      setLabelDraft(null);
    }, [setLabelDraft]);
    const showBoard = q2(
      (document2, failed) => {
        savingBlockedRef.current = failed;
        dispatch({ type: "board/loaded", document: document2 });
        if (failed) setStatus("error");
      },
      [dispatch]
    );
    const showBackground = q2((next) => {
      backgroundRef.current = next;
      setBackground(next);
    }, []);
    const loadBoardWithBackground = q2(
      (id) => Promise.all([loadBoard(storage, id), loadBackground(storage, id)]),
      [storage]
    );
    const openBoardById = q2(
      async (id) => {
        if (id === indexRef.current?.lastOpen) return;
        abandonDrafts();
        await autosave.flush();
        const [{ value, failed }, backdrop] = await loadBoardWithBackground(id);
        const current = indexRef.current;
        if (!current) return;
        updateIndex(openBoard(current, id));
        showBoard(value, failed);
        showBackground(backdrop);
      },
      [abandonDrafts, autosave, loadBoardWithBackground, showBackground, showBoard, updateIndex]
    );
    const createNewBoard = q2(
      async (name, projectId) => {
        const current = indexRef.current;
        if (!current) return;
        abandonDrafts();
        await autosave.flush();
        const { index: next, board: board2 } = addBoard(current, name, projectId);
        updateIndex(next);
        showBoard(createBoard(board2.id), false);
        showBackground(null);
      },
      [abandonDrafts, autosave, showBackground, showBoard, updateIndex]
    );
    const renameCurrentBoard = q2(
      (name) => {
        const current = indexRef.current;
        if (current) updateIndex(renameBoard(current, current.lastOpen, name));
      },
      [updateIndex]
    );
    const linkCurrentBoard = q2(
      (projectId) => {
        const current = indexRef.current;
        if (current) updateIndex(setBoardProject(current, current.lastOpen, projectId));
      },
      [updateIndex]
    );
    const flash = q2((message) => {
      setToast(message);
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        toastTimer.current = null;
        setToast(null);
      }, TOAST_MS);
    }, []);
    h2(
      () => () => {
        if (toastTimer.current !== null) clearTimeout(toastTimer.current);
      },
      []
    );
    const copyCurrentBoard = q2(async () => {
      const board2 = sessionRef.current?.document;
      const current = indexRef.current;
      if (!board2 || !current) return;
      const { name } = currentBoard(current);
      const copied = await copyText(formatBoardExport(board2, name));
      flash(copied ? `Copied “${name}” as JSON.` : "Could not copy the board.");
    }, [flash]);
    const deleteCurrentBoard = q2(async () => {
      const current = indexRef.current;
      if (!current) return;
      const doomed = current.lastOpen;
      abandonDrafts();
      autosave.discard();
      updateIndex(deleteBoard(current, doomed));
      autosave.tombstone(doomed);
      showBackground(null);
      const next = indexRef.current;
      if (!next) return;
      const [{ value, failed }, backdrop] = await loadBoardWithBackground(next.lastOpen);
      showBoard(value, failed);
      showBackground(backdrop);
    }, [abandonDrafts, autosave, loadBoardWithBackground, showBackground, showBoard, updateIndex]);
    const chooseDefaultFont = q2(
      (font) => {
        const next = setDefaultFont(settingsRef.current, font);
        if (next === settingsRef.current) return;
        settingsRef.current = next;
        setSettings(next);
        autosave.writeSettings(next);
      },
      [autosave]
    );
    const importBackground = q2(
      async (file) => {
        const id = indexRef.current?.lastOpen;
        if (!id) return;
        if (!isImageFile(file)) {
          setImportError(`${file.name || "That file"} is not a picture Canvas can use. Try a PNG, JPEG or WebP.`);
          setSettingsOpen(true);
          return;
        }
        try {
          const image = await shrinkImage(file);
          if (indexRef.current?.lastOpen !== id) return;
          const previous = backgroundRef.current;
          const next = previous ? createBackground(image, previous) : createBackground(image);
          showBackground(next);
          autosave.writeBackground(id, next);
          setImportError(null);
        } catch {
          setImportError("Could not read that picture.");
          setSettingsOpen(true);
        }
      },
      [autosave, showBackground]
    );
    const adjustLook = q2(
      (key, value) => {
        const current = backgroundRef.current;
        const id = indexRef.current?.lastOpen;
        if (!current || !id) return;
        const next = adjustBackground(current, key, value);
        if (next === current) return;
        showBackground(next);
        autosave.scheduleBackground(id, next);
      },
      [autosave, showBackground]
    );
    const resetBackgroundLook = q2(() => {
      const current = backgroundRef.current;
      const id = indexRef.current?.lastOpen;
      if (!current || !id) return;
      const next = resetLook(current);
      if (next === current) return;
      showBackground(next);
      autosave.writeBackground(id, next);
    }, [autosave, showBackground]);
    const removeBackground = q2(() => {
      const id = indexRef.current?.lastOpen;
      if (!id || !backgroundRef.current) return;
      showBackground(null);
      setImportError(null);
      autosave.writeBackground(id, null);
    }, [autosave, showBackground]);
    const surfaceSize = q2(() => {
      const surface = surfaceRef.current;
      return { width: surface?.clientWidth ?? 0, height: surface?.clientHeight ?? 0 };
    }, []);
    const centerAnchor = q2(() => {
      const size = surfaceSize();
      return { x: size.width / 2, y: size.height / 2 };
    }, [surfaceSize]);
    const currentZoom = q2(
      () => sessionRef.current?.document.viewport.zoom ?? DEFAULT_VIEWPORT.zoom,
      []
    );
    const toWorld = q2((event) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      const viewport2 = sessionRef.current?.document.viewport ?? DEFAULT_VIEWPORT;
      return surfaceToWorld(viewport2, {
        x: event.clientX - (rect?.left ?? 0),
        y: event.clientY - (rect?.top ?? 0)
      });
    }, []);
    const addNote = q2(
      (center) => {
        const note = createNote(center);
        dispatch({ type: "item/added", item: note });
        dispatch({ type: "selection/changed", ids: [note.id] });
        startEditing(note.id);
      },
      [dispatch, startEditing]
    );
    const addLabel = q2(
      (at3) => {
        const label = createLabel(at3, strokeColor, strokeSize);
        setLabelDraft(label);
        setTool("select");
        startEditing(label.id);
      },
      [setLabelDraft, startEditing, strokeColor, strokeSize]
    );
    const fitToBoard = q2(() => {
      const items = sessionRef.current?.document.items ?? [];
      setViewport(fitToBounds(boardBounds(items), surfaceSize()));
    }, [setViewport, surfaceSize]);
    const setNoteColor = q2(
      (ids, color) => {
        if (ids.length === 0) return;
        dispatch({ type: "note/colored", ids, color });
      },
      [dispatch]
    );
    const setNoteFont = q2(
      (ids, font) => {
        if (ids.length === 0) return;
        dispatch({ type: "note/font", ids, font });
      },
      [dispatch]
    );
    const cycleNoteColor = q2(() => {
      const session2 = sessionRef.current;
      if (!session2) return;
      const first = session2.document.items.find(
        (item) => item.type === "note" && session2.selection.includes(item.id)
      );
      if (first?.type !== "note") return;
      setNoteColor(session2.selection, nextNoteColor(first.color));
    }, [setNoteColor]);
    const pressItem = q2(
      (id, additive) => {
        const session2 = sessionRef.current;
        if (!session2) return false;
        const held = session2.selection.includes(id);
        if (additive) {
          dispatch({ type: "selection/toggled", id });
          return !held;
        }
        if (!held) dispatch({ type: "selection/changed", ids: [id] });
        return true;
      },
      [dispatch]
    );
    const clickItem = q2(
      (id, additive) => {
        const selection = sessionRef.current?.selection ?? [];
        if (additive || selection.length < 2 || !selection.includes(id)) return;
        dispatch({ type: "selection/changed", ids: [id] });
      },
      [dispatch]
    );
    const toggleNoteTask = q2(
      (id, task) => {
        const note = sessionRef.current?.document.items.find((item) => item.id === id);
        if (note?.type !== "note") return;
        dispatch({ type: "item/edited", id, text: toggleTask(note.text, task) });
      },
      [dispatch]
    );
    const moveItemTo = q2(
      (id, position, gesture) => {
        const session2 = sessionRef.current;
        const item = session2?.document.items.find((entry) => entry.id === id);
        if (!session2 || item?.type !== "note") return;
        const ids = session2.selection.includes(id) ? session2.selection : [id];
        dispatch({
          type: "items/moved",
          ids,
          dx: position.x - item.x,
          dy: position.y - item.y,
          gesture
        });
      },
      [dispatch]
    );
    const deleteSelection = q2(() => {
      const ids = sessionRef.current?.selection ?? [];
      if (ids.length === 0) return;
      stopEditing();
      dispatch({ type: "items/deleted", ids });
    }, [dispatch, stopEditing]);
    const pickTool = q2(
      (next) => {
        stopEditing();
        setTool(next);
        if (next !== "select") dispatch({ type: "selection/changed", ids: [] });
      },
      [dispatch, stopEditing]
    );
    const escape = q2(() => {
      abandonDrafts();
      setTool("select");
      dispatch({ type: "selection/changed", ids: [] });
    }, [abandonDrafts, dispatch]);
    const nudgeSelection = q2(
      (dx, dy, continues) => {
        const ids = sessionRef.current?.selection ?? [];
        if (ids.length === 0) return;
        if (!continues || nudgeRef.current === null) nudgeRef.current = startGesture("nudge");
        dispatch({ type: "items/moved", ids, dx, dy, gesture: nudgeRef.current });
      },
      [dispatch, startGesture]
    );
    const selectAll = q2(() => {
      const items = sessionRef.current?.document.items ?? [];
      if (items.length === 0) return;
      stopEditing();
      setTool("select");
      dispatch({ type: "selection/changed", ids: items.map((item) => item.id) });
    }, [dispatch, stopEditing]);
    const undo = q2(() => {
      abandonDrafts();
      dispatch({ type: "history/undo" });
    }, [abandonDrafts, dispatch]);
    const redo = q2(() => {
      abandonDrafts();
      dispatch({ type: "history/redo" });
    }, [abandonDrafts, dispatch]);
    h2(() => {
      const surface = surfaceRef.current;
      if (!surface) return;
      const host = {
        getViewport: () => sessionRef.current?.document.viewport ?? DEFAULT_VIEWPORT,
        setViewport,
        getSurfaceSize: surfaceSize,
        setPanning,
        setSpaceHeld,
        fitToBoard,
        deleteSelection,
        selectAll,
        setTool: pickTool,
        escape,
        nudgeSelection,
        cycleNoteColor,
        undo,
        redo
      };
      return attachCanvasInteractions(surface, host);
    }, [
      cycleNoteColor,
      deleteSelection,
      escape,
      fitToBoard,
      nudgeSelection,
      pickTool,
      redo,
      selectAll,
      setViewport,
      surfaceSize,
      undo
    ]);
    const drawnItems = q2(
      () => (sessionRef.current?.document.items ?? []).filter(isDrawn),
      []
    );
    function beginDraw(event) {
      const at3 = toWorld(event);
      if (tool === "pen") {
        const id = nextItemId();
        const points = [[at3.x, at3.y]];
        drawRef.current = { kind: "ink", pointerId: event.pointerId, id, points };
        setDraft(createStroke([...points], strokeColor, strokeSize, id));
      } else if (isShapeTool(tool)) {
        const id = nextItemId();
        const seed = nextSeed();
        drawRef.current = { kind: "shape", pointerId: event.pointerId, id, seed, shape: tool, origin: at3 };
        setDraft(createShape(tool, at3, at3, strokeColor, strokeSize, id, seed));
      } else if (tool === "eraser") {
        const gesture = startGesture("erase");
        drawRef.current = { kind: "erase", pointerId: event.pointerId, gesture, last: at3 };
        eraseTo(at3, at3, gesture);
      } else {
        return;
      }
      surfaceRef.current?.setPointerCapture?.(event.pointerId);
    }
    function eraseTo(from, to, gesture) {
      const ids = erasedAlong(drawnItems(), from, to, ERASER_REACH_PX / currentZoom());
      if (ids.length > 0) dispatch({ type: "items/deleted", ids, gesture });
    }
    function continueDraw(event) {
      const active = drawRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      const at3 = toWorld(event);
      if (active.kind === "ink") {
        active.points.push([at3.x, at3.y]);
        setDraft(createStroke([...active.points], strokeColor, strokeSize, active.id));
      } else if (active.kind === "shape") {
        const end = event.shiftKey ? constrain(active.shape, active.origin, at3) : at3;
        setDraft(
          createShape(active.shape, active.origin, end, strokeColor, strokeSize, active.id, active.seed)
        );
      } else {
        eraseTo(active.last, at3, active.gesture);
        active.last = at3;
      }
    }
    function endDraw(event, commit) {
      const active = drawRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      drawRef.current = null;
      setDraft(null);
      if (surfaceRef.current?.hasPointerCapture?.(event.pointerId)) {
        surfaceRef.current.releasePointerCapture(event.pointerId);
      }
      if (!commit) return;
      const zoom = currentZoom();
      if (active.kind === "ink") {
        const points = simplifyStroke(active.points, INK_SAMPLE_PX / zoom);
        dispatch({
          type: "item/added",
          item: createStroke(points, strokeColor, strokeSize, active.id)
        });
      } else if (active.kind === "shape") {
        const at3 = toWorld(event);
        const end = event.shiftKey ? constrain(active.shape, active.origin, at3) : at3;
        const dragged = Math.hypot(end.x - active.origin.x, end.y - active.origin.y);
        if (dragged < MIN_SHAPE_DRAG_PX / zoom) return;
        dispatch({
          type: "item/added",
          item: createShape(
            active.shape,
            active.origin,
            end,
            strokeColor,
            strokeSize,
            active.id,
            active.seed
          )
        });
      }
    }
    function beginSelect(event) {
      const labelId = labelUnder(event.target);
      if (!labelId && !onBackground(event.target)) return;
      if (labelId && editingRef.current?.id === labelId) return;
      const at3 = toWorld(event);
      startSelect(event, at3, labelId ?? inkAt(at3)?.id ?? null);
    }
    function inkAt(at3) {
      const items = sessionRef.current?.document.items ?? [];
      return drawnItemAt(items, at3, SELECT_REACH_PX / currentZoom());
    }
    function claimInkOverNote(event) {
      if (event.button !== 0 || spaceHeld || drawing) return;
      if (!onNotePaper(event.target)) return;
      const at3 = toWorld(event);
      const hit = inkAt(at3);
      if (!hit) return;
      event.stopPropagation();
      startSelect(event, at3, hit.id);
    }
    function startSelect(event, at3, hit) {
      if (!sessionRef.current) return;
      stopEditing();
      if (hit) {
        if (!pressItem(hit, event.shiftKey)) return;
        selectRef.current = {
          kind: "move",
          pointerId: event.pointerId,
          id: hit,
          gesture: startGesture(`move:${hit}`),
          origin: at3,
          last: at3,
          moved: false,
          additive: event.shiftKey
        };
      } else {
        const additive = event.shiftKey;
        selectRef.current = {
          kind: "marquee",
          pointerId: event.pointerId,
          origin: at3,
          base: additive ? sessionRef.current?.selection ?? [] : [],
          additive,
          moved: false
        };
      }
      surfaceRef.current?.setPointerCapture?.(event.pointerId);
    }
    function continueSelect(event) {
      const active = selectRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      const at3 = toWorld(event);
      const slop = CLICK_SLOP_PX / currentZoom();
      if (!active.moved && Math.hypot(at3.x - active.origin.x, at3.y - active.origin.y) < slop) return;
      active.moved = true;
      if (active.kind === "move") {
        const dx = at3.x - active.last.x;
        const dy = at3.y - active.last.y;
        if (dx === 0 && dy === 0) return;
        active.last = at3;
        const ids = sessionRef.current?.selection ?? [];
        dispatch({ type: "items/moved", ids, dx, dy, gesture: active.gesture });
        return;
      }
      const box = normalize(active.origin, at3);
      setMarquee(box);
      const inside = itemsInside(sessionRef.current?.document.items ?? [], box);
      dispatch({ type: "selection/changed", ids: union(active.base, inside) });
    }
    function endSelect(event, clicked) {
      const active = selectRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      selectRef.current = null;
      setMarquee(null);
      if (surfaceRef.current?.hasPointerCapture?.(event.pointerId)) {
        surfaceRef.current.releasePointerCapture(event.pointerId);
      }
      if (active.moved || !clicked) return;
      if (active.kind === "move") clickItem(active.id, active.additive);
      else if (!active.additive) dispatch({ type: "selection/changed", ids: [] });
    }
    const board = session?.document ?? null;
    const viewport = board?.viewport ?? DEFAULT_VIEWPORT;
    const step = gridStep(viewport.zoom);
    const drawing = isDrawingTool(tool);
    const classes = ["canvas"];
    if (drawing) classes.push("canvas--drawing");
    if (tool === "eraser") classes.push("canvas--erasing");
    if (panning) classes.push("canvas--panning");
    else if (spaceHeld) classes.push("canvas--grab");
    if (dropping) classes.push("canvas--dropping");
    const labels = [...(board?.items ?? []).filter(isText), ...pendingLabel ? [pendingLabel] : []];
    return /* @__PURE__ */ u5(
      "div",
      {
        class: classes.join(" "),
        ref: surfaceRef,
        role: "application",
        "aria-label": "Canvas board",
        onPointerDownCapture: claimInkOverNote,
        style: `--text-font: ${fontStack(settings.font)}`,
        onDragEnter: (event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDropping(true);
        },
        onDragOver: (event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        },
        onDragLeave: (event) => {
          if (!hasFiles(event)) return;
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDropping(false);
        },
        onDrop: (event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current = 0;
          setDropping(false);
          const file = draggedFile(event);
          if (file) void importBackground(file);
        },
        onPointerDown: (event) => {
          if (event.button !== 0 || spaceHeld) return;
          if (drawing) {
            stopEditing();
            if (tool === "text") addLabel(toWorld(event));
            else beginDraw(event);
            return;
          }
          beginSelect(event);
        },
        onPointerMove: (event) => {
          continueDraw(event);
          continueSelect(event);
        },
        onPointerUp: (event) => {
          endDraw(event, true);
          endSelect(event, true);
        },
        onPointerCancel: (event) => {
          endDraw(event, false);
          endSelect(event, false);
        },
        onDblClick: (event) => {
          if (drawing || !onBackground(event.target)) return;
          addNote(toWorld(event));
        },
        children: [
          background ? /* @__PURE__ */ u5(
            "img",
            {
              class: "canvas__backdrop",
              "data-testid": "canvas-backdrop",
              src: background.image,
              alt: "",
              "aria-hidden": "true",
              draggable: false,
              style: backgroundStyle(background)
            }
          ) : null,
          /* @__PURE__ */ u5(
            "div",
            {
              class: "canvas__grid",
              "aria-hidden": "true",
              style: {
                backgroundSize: `${step}px ${step}px`,
                backgroundPosition: `${wrap(viewport.x, step)}px ${wrap(viewport.y, step)}px`
              }
            }
          ),
          dropping ? /* @__PURE__ */ u5("div", { class: "canvas__drop", "aria-hidden": "true", children: "Drop to make this the board's background" }) : null,
          /* @__PURE__ */ u5(
            "div",
            {
              class: "canvas__world",
              "data-testid": "canvas-world",
              style: {
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
              },
              children: [
                board?.items.map(
                  (item) => item.type === "note" ? /* @__PURE__ */ u5(
                    Note,
                    {
                      note: item,
                      selected: session?.selection.includes(item.id) ?? false,
                      editing: editing?.id === item.id,
                      zoom: viewport.zoom,
                      locked: spaceHeld || drawing,
                      toWorld,
                      onSelect: pressItem,
                      onClick: clickItem,
                      onEdit: startEditing,
                      onEditEnd: stopEditing,
                      onMove: (id, position, gesture) => moveItemTo(id, position, gesture),
                      onResize: (id, rect, gesture) => dispatch({ type: "note/resized", id, rect, gesture }),
                      onColor: (id, color) => setNoteColor([id], color),
                      onFont: (id, font) => setNoteFont([id], font),
                      onToggleTask: toggleNoteTask,
                      onText: (id, text3) => {
                        if (editing?.id !== id) return;
                        dispatch({ type: "item/edited", id, text: text3, gesture: editing.gesture });
                      },
                      onFormat: (id, text3) => dispatch({ type: "item/edited", id, text: text3 }),
                      onDelete: (id) => {
                        stopEditing();
                        dispatch({ type: "items/deleted", ids: [id] });
                      },
                      startGesture
                    },
                    item.id
                  ) : null
                ),
                labels.map((item) => /* @__PURE__ */ u5(
                  Label,
                  {
                    item,
                    selected: session?.selection.includes(item.id) ?? false,
                    editing: editing?.id === item.id,
                    zoom: viewport.zoom,
                    locked: spaceHeld || drawing,
                    onEdit: startEditing,
                    onEditEnd: stopEditing,
                    onText: (id, text3) => {
                      if (pendingLabelRef.current?.id === id) {
                        setLabelDraft({ ...pendingLabelRef.current, text: text3 });
                        return;
                      }
                      if (editing?.id !== id) return;
                      dispatch({ type: "item/edited", id, text: text3, gesture: editing.gesture });
                    }
                  },
                  item.id
                )),
                /* @__PURE__ */ u5(
                  Ink,
                  {
                    items: board?.items ?? [],
                    draft,
                    selection: session?.selection ?? [],
                    zoom: viewport.zoom
                  }
                )
              ]
            }
          ),
          marquee ? /* @__PURE__ */ u5("div", { class: "canvas__marquee", "aria-hidden": "true", style: marqueeStyle(marquee, viewport) }) : null,
          index ? /* @__PURE__ */ u5(
            Switcher,
            {
              index,
              project,
              onOpen: (id) => void openBoardById(id),
              onCreate: (name, projectId) => void createNewBoard(name, projectId),
              onRename: renameCurrentBoard,
              onLink: linkCurrentBoard,
              onCopy: () => void copyCurrentBoard(),
              onDelete: () => void deleteCurrentBoard()
            }
          ) : null,
          /* @__PURE__ */ u5("div", { class: "canvas__status", role: "status", children: SAVE_LABELS[status] }),
          toast !== null ? /* @__PURE__ */ u5("div", { class: "canvas__toast", role: "status", children: toast }) : null,
          board && board.items.length === 0 ? /* @__PURE__ */ u5("p", { class: "canvas__hint", children: "Empty board. Double-click to write a note, or pick a drawing tool above; pan with space-drag, middle-drag or scroll; zoom with ⌘-scroll or pinch." }) : null,
          /* @__PURE__ */ u5(
            Toolbar,
            {
              tool,
              color: strokeColor,
              size: strokeSize,
              onTool: pickTool,
              onColor: setStrokeColor,
              onSize: setStrokeSize,
              onAddNote: () => addNote(surfaceToWorld(viewport, centerAnchor()))
            }
          ),
          /* @__PURE__ */ u5(
            "div",
            {
              class: "toolbar",
              role: "toolbar",
              "aria-label": "Zoom",
              onPointerDown: (event) => event.stopPropagation(),
              children: [
                /* @__PURE__ */ u5(
                  "button",
                  {
                    type: "button",
                    class: "toolbar__button",
                    "aria-label": "Zoom out",
                    onClick: () => setViewport(zoomOutAt(viewport, centerAnchor())),
                    children: "−"
                  }
                ),
                /* @__PURE__ */ u5(
                  "button",
                  {
                    type: "button",
                    class: "toolbar__button toolbar__zoom",
                    "aria-label": "Reset zoom to 100%",
                    onClick: () => setViewport(resetZoomAt(viewport, centerAnchor())),
                    children: [
                      zoomPercent(viewport.zoom),
                      "%"
                    ]
                  }
                ),
                /* @__PURE__ */ u5(
                  "button",
                  {
                    type: "button",
                    class: "toolbar__button",
                    "aria-label": "Zoom in",
                    onClick: () => setViewport(zoomInAt(viewport, centerAnchor())),
                    children: "+"
                  }
                ),
                /* @__PURE__ */ u5("button", { type: "button", class: "toolbar__button", "aria-label": "Zoom to fit", onClick: fitToBoard, children: "Fit" }),
                /* @__PURE__ */ u5("span", { class: "toolbar__separator", "aria-hidden": "true" }),
                /* @__PURE__ */ u5(
                  "button",
                  {
                    type: "button",
                    class: `toolbar__button${settingsOpen ? " toolbar__button--on" : ""}`,
                    "aria-label": "Settings",
                    "aria-pressed": settingsOpen,
                    "aria-expanded": settingsOpen,
                    title: "Fonts and the board's background",
                    "data-settings-toggle": true,
                    onClick: () => setSettingsOpen((open) => !open),
                    children: "Settings"
                  }
                )
              ]
            }
          ),
          settingsOpen ? /* @__PURE__ */ u5(
            SettingsPanel,
            {
              settings,
              background,
              boardName: index ? currentBoard(index).name : "",
              importError,
              onFont: chooseDefaultFont,
              onImport: (file) => void importBackground(file),
              onAdjust: adjustLook,
              onResetLook: resetBackgroundLook,
              onRemoveBackground: removeBackground,
              onClose: () => setSettingsOpen(false)
            }
          ) : null
        ]
      }
    );
  }
  function isText(item) {
    return item.type === "text";
  }
  function marqueeStyle(box, viewport) {
    const corner = worldToSurface(viewport, { x: box.x, y: box.y });
    return {
      left: `${corner.x}px`,
      top: `${corner.y}px`,
      width: `${box.width * viewport.zoom}px`,
      height: `${box.height * viewport.zoom}px`
    };
  }
  function union(base, more) {
    return [...base, ...more.filter((id) => !base.includes(id))];
  }
  function onNotePaper(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest('[data-testid="note"]') === null) return false;
    return target.closest(".note__chrome, .note__editor, .note__handle, input, a, button") === null;
  }
  function labelUnder(target) {
    if (!(target instanceof Element)) return null;
    return target.closest("[data-label-id]")?.getAttribute("data-label-id") ?? null;
  }
  function hasFiles(event) {
    return Array.from(event.dataTransfer?.types ?? []).includes("Files");
  }
  function draggedFile(event) {
    return event.dataTransfer?.files?.[0] ?? null;
  }
  function onBackground(target) {
    if (!(target instanceof Element)) return false;
    return target.classList.contains("canvas") || target.classList.contains("canvas__grid") || target.classList.contains("canvas__world");
  }

  // src/main.tsx
  var root = document.getElementById("root");
  if (root) void waitForBridge().then((bridge) => mountCanvas(root, bridge));
})();
/*! Bundled license information:

dompurify/dist/purify.es.mjs:
  (*! @license DOMPurify 3.4.14 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.14/LICENSE *)
*/
