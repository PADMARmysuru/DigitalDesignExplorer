/* =========================================================
   Digital Design Explorer — Level 5 · VLSI Testing
   Shared engine (vanilla JS, no frameworks)

   Contents
     1. Module list + progress storage
     2. Logic simulation (good / faulty circuits, SCOAP)
     3. SVG circuit renderer
     4. Page shell (side rail, progress bar, hero trace)
     5. Widgets: FaultLab, TesterBench, NodeExplorer, Flow,
        Toggle, Check, Challenge, Quiz, CoverageLab
   ========================================================= */
(function () {
  'use strict';
  var L5 = (window.L5 = {});

  /* ---------------------------------------------------------
     1. MODULES + PROGRESS
     --------------------------------------------------------- */
  L5.MODULES = [
    { n: 1, sections: 11, file: 'level5-module1.html', title: 'Introduction to VLSI Testing',
      topics: ['Why test ICs', 'Verification vs testing', 'Defect, fault, error, failure', 'Test flow'] },
    { n: 2, sections: 11, file: 'level5-module2.html', title: 'Fault Models',
      topics: ['Stuck-at faults', 'Bridging faults', 'Open faults', 'Transition and delay faults'] },
    { n: 3, sections: 11, file: 'level5-module3.html', title: 'Fault Simulation and Fault Coverage',
      topics: ['Fault equivalence', 'Fault collapsing', 'Serial and parallel fault simulation', 'Coverage and defect level'] },
    { n: 4, sections: 10, file: 'level5-module4.html', title: 'Test Pattern Generation (ATPG)',
      topics: ['Boolean difference', 'Path sensitization', 'D-algorithm', 'PODEM'] },
    { n: 5, sections: 11, file: 'level5-module5.html', title: 'Design for Testability and Scan',
      topics: ['SCOAP measures', 'Test points', 'Scan flip-flops', 'Scan chains'] },
    { n: 6, sections: 11, file: 'level5-module6.html', title: 'BIST and Boundary Scan',
      topics: ['LFSR pattern generators', 'Signature analysis', 'BILBO', 'JTAG TAP controller'] }
  ];
  L5.PASS_MARK = 0.6;

  /* Student details saved by the main site at registration/login.
     Several common key names are checked; adjust STUDENT_KEYS if your site uses others. */
  var STUDENT_KEYS = ['student', 'currentStudent', 'currentUser', 'user', 'studentData', 'loggedInUser', 'dde_student'];
  L5.student = function () {
    var r = { name: '', usn: '' };
    try {
      STUDENT_KEYS.forEach(function (k) {
        var v = localStorage.getItem(k); if (!v || r.name) return;
        try { var o = JSON.parse(v); if (o && typeof o === 'object') { r.name = o.name || o.fullName || o.studentName || o.full_name || ''; r.usn = o.usn || o.USN || o.usn_no || ''; } } catch (e) {}
      });
      if (!r.name) r.name = localStorage.getItem('studentName') || localStorage.getItem('student_name') || localStorage.getItem('userName') || localStorage.getItem('name') || '';
      if (!r.usn) r.usn = localStorage.getItem('usn') || localStorage.getItem('studentUSN') || localStorage.getItem('USN') || '';
      var saved = JSON.parse(localStorage.getItem('dde_level5_certname') || 'null');
      if (saved) { r.name = saved.name || r.name; r.usn = saved.usn || r.usn; }
    } catch (e) {}
    return r;
  };

  var KEY = 'dde_level5_progress';

  L5.store = {
    all: function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || { m: {} }; } catch (e) { return { m: {} }; }
    },
    save: function (d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage unavailable */ } },
    mod: function (n) {
      var d = L5.store.all(); return d.m[n] || { seen: [], best: null, last: null, passed: false };
    },
    update: function (n, fn) {
      var d = L5.store.all();
      d.m[n] = d.m[n] || { seen: [], best: null, last: null, passed: false };
      fn(d.m[n]);
      L5.store.save(d);
      return d.m[n];
    },
    recordQuiz: function (n, score, total) {
      return L5.store.update(n, function (m) {
        m.last = score; m.total = total;
        if (m.best === null || score > m.best) m.best = score;
        if (score / total >= L5.PASS_MARK && !m.passed) { m.passed = true; m.date = new Date().toISOString(); }
        if (m.passed) { try { localStorage.setItem('level5_module' + n + '_completed', 'true'); } catch (e) {} }
      });
    }
  };

  /* ---------------------------------------------------------
     helpers
     --------------------------------------------------------- */
  var NS = 'http://www.w3.org/2000/svg';
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function s(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function resolve(el) { return typeof el === 'string' ? document.getElementById(el) : el; }
  function patStr(def, p) { return def.inputs.map(function (i) { return i.id + '=' + (p[i.id] ? 1 : 0); }).join(', '); }
  function allPatterns(def) {
    var n = def.inputs.length, out = [];
    for (var k = 0; k < (1 << n); k++) {
      var p = {};
      def.inputs.forEach(function (inp, i) { p[inp.id] = (k >> (n - 1 - i)) & 1; });
      out.push(p);
    }
    return out;
  }
  L5.h = h; L5.s = s; L5.patStr = patStr; L5.allPatterns = allPatterns;

  /* ---------------------------------------------------------
     2. LOGIC SIMULATION
     --------------------------------------------------------- */
  var FN = {
    AND: function (v) { return v.every(function (x) { return x; }) ? 1 : 0; },
    OR: function (v) { return v.some(function (x) { return x; }) ? 1 : 0; },
    NAND: function (v) { return FN.AND(v) ? 0 : 1; },
    NOR: function (v) { return FN.OR(v) ? 0 : 1; },
    XOR: function (v) { return v.reduce(function (a, b) { return a ^ b; }, 0); },
    XNOR: function (v) { return FN.XOR(v) ? 0 : 1; },
    NOT: function (v) { return v[0] ? 0 : 1; },
    BUF: function (v) { return v[0] ? 1 : 0; }
  };
  L5.FN = FN;

  function run(def, inputs, force) {
    var val = {};
    function put(net, v) { val[net] = (force && net in force) ? force[net] : v; }
    def.inputs.forEach(function (i) { put(i.id, inputs[i.id] ? 1 : 0); });
    def.gates.forEach(function (g) { put(g.out, FN[g.type](g.in.map(function (n) { return val[n]; }))); });
    return val;
  }
  /* fault: {net, type:'sa0'|'sa1'} or {type:'bAND'|'bOR', nets:[a,b]} */
  function simulate(def, inputs, fault) {
    if (!fault) return run(def, inputs);
    if (fault.type === 'sa0' || fault.type === 'sa1') {
      var f = {}; f[fault.net] = fault.type === 'sa1' ? 1 : 0;
      return run(def, inputs, f);
    }
    if (fault.type === 'bAND' || fault.type === 'bOR') {
      var g = run(def, inputs), a = g[fault.nets[0]], b = g[fault.nets[1]];
      var v = fault.type === 'bAND' ? (a & b) : (a | b), force = {};
      force[fault.nets[0]] = v; force[fault.nets[1]] = v;
      return run(def, inputs, force);
    }
    return run(def, inputs);
  }
  function outputsOf(def, vals) { var o = {}; def.outputs.forEach(function (x) { o[x.id] = vals[x.net]; }); return o; }
  function detects(def, inputs, fault) {
    var g = simulate(def, inputs), b = simulate(def, inputs, fault);
    return def.outputs.some(function (o) { return g[o.net] !== b[o.net]; });
  }
  function nets(def) { return def.inputs.map(function (i) { return i.id; }).concat(def.gates.map(function (g) { return g.out; })); }
  function allFaults(def) {
    var list = [];
    nets(def).forEach(function (n) { list.push({ net: n, type: 'sa0' }); list.push({ net: n, type: 'sa1' }); });
    return list;
  }
  function faultName(f) {
    if (!f) return 'No fault';
    if (f.type === 'sa0' || f.type === 'sa1') return f.net + ' s-a-' + (f.type === 'sa1' ? '1' : '0');
    return f.nets[0] + '–' + f.nets[1] + (f.type === 'bAND' ? ' bridge (wired-AND)' : ' bridge (wired-OR)');
  }
  function levels(def) {
    var lv = {};
    def.inputs.forEach(function (i) { lv[i.id] = 0; });
    def.gates.forEach(function (g) { lv[g.out] = 1 + Math.max.apply(null, g.in.map(function (n) { return lv[n]; })); });
    return lv;
  }
  function scoap(def) {
    var c0 = {}, c1 = {}, co = {};
    def.inputs.forEach(function (i) { c0[i.id] = 1; c1[i.id] = 1; });
    function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
    def.gates.forEach(function (g) {
      var z0 = g.in.map(function (n) { return c0[n]; }), z1 = g.in.map(function (n) { return c1[n]; }), o = g.out;
      switch (g.type) {
        case 'AND': c1[o] = sum(z1) + 1; c0[o] = Math.min.apply(null, z0) + 1; break;
        case 'OR': c0[o] = sum(z0) + 1; c1[o] = Math.min.apply(null, z1) + 1; break;
        case 'NAND': c0[o] = sum(z1) + 1; c1[o] = Math.min.apply(null, z0) + 1; break;
        case 'NOR': c1[o] = sum(z0) + 1; c0[o] = Math.min.apply(null, z1) + 1; break;
        case 'NOT': c0[o] = z1[0] + 1; c1[o] = z0[0] + 1; break;
        case 'BUF': c0[o] = z0[0] + 1; c1[o] = z1[0] + 1; break;
        case 'XOR': case 'XNOR':
          var same = Math.min(z0[0] + z0[1], z1[0] + z1[1]) + 1, diff = Math.min(z0[0] + z1[1], z1[0] + z0[1]) + 1;
          if (g.type === 'XOR') { c0[o] = same; c1[o] = diff; } else { c0[o] = diff; c1[o] = same; }
          break;
      }
    });
    nets(def).forEach(function (n) { co[n] = Infinity; });
    def.outputs.forEach(function (o) { co[o.net] = 0; });
    for (var k = def.gates.length - 1; k >= 0; k--) {
      var g = def.gates[k];
      g.in.forEach(function (x, idx) {
        var others = g.in.filter(function (_, j) { return j !== idx; }), extra = 0;
        if (g.type === 'AND' || g.type === 'NAND') extra = sum(others.map(function (n) { return c1[n]; }));
        else if (g.type === 'OR' || g.type === 'NOR') extra = sum(others.map(function (n) { return c0[n]; }));
        else if (g.type === 'XOR' || g.type === 'XNOR') extra = sum(others.map(function (n) { return Math.min(c0[n], c1[n]); }));
        var v = co[g.out] + extra + 1;
        if (v < co[x]) co[x] = v;
      });
    }
    return { cc0: c0, cc1: c1, co: co };
  }
  L5.sim = { run: run, simulate: simulate, detects: detects, outputsOf: outputsOf, nets: nets,
    allFaults: allFaults, faultName: faultName, levels: levels, scoap: scoap, allPatterns: allPatterns };

  /* ---------------------------------------------------------
     3. SVG CIRCUIT RENDERER
        gate (x,y): x = left edge (input pins), y = centre.
        Every gate is 66 px wide; output pin at x+66.
     --------------------------------------------------------- */
  var GW = 66;
  var BODY = {
    AND: 'M8,0 H32 A22,22 0 0 1 32,44 H8 Z',
    NAND: 'M8,0 H32 A22,22 0 0 1 32,44 H8 Z',
    OR: 'M6,0 C28,0 46,10 56,22 C46,34 28,44 6,44 Q16,22 6,0 Z',
    NOR: 'M6,0 C28,0 46,10 56,22 C46,34 28,44 6,44 Q16,22 6,0 Z',
    XOR: 'M10,0 C32,0 50,10 60,22 C50,34 32,44 10,44 Q20,22 10,0 Z',
    XNOR: 'M10,0 C30,0 46,10 56,22 C46,34 30,44 10,44 Q20,22 10,0 Z',
    NOT: 'M8,4 L48,22 L8,40 Z',
    BUF: 'M8,4 L52,22 L8,40 Z'
  };
  var OUTX = { AND: 54, NAND: 62, OR: 56, NOR: 64, XOR: 60, XNOR: 64, NOT: 56, BUF: 52 };
  var BUBBLE = { NAND: 58, NOR: 60, XNOR: 60, NOT: 52 };
  function pinOffsets(n) { return n === 1 ? [0] : n === 2 ? [-12, 12] : [-14, 0, 14]; }

  L5.drawCircuit = function (container, def, opts) {
    opts = opts || {};
    container = resolve(container);
    var svg = s('svg', { viewBox: '0 0 ' + def.w + ' ' + def.h, class: 'cz', role: 'img',
      'aria-label': opts.aria || 'Logic circuit diagram' });
    var srcPt = {}, gateOf = {}, groups = {}, sinks = {};
    def.inputs.forEach(function (i) { srcPt[i.id] = [i.x + 13, i.y]; });
    def.gates.forEach(function (g) { srcPt[g.out] = [g.x + GW, g.y]; gateOf[g.out] = g; });

    // collect wire branches per net
    def.gates.forEach(function (g) {
      var offs = pinOffsets(g.in.length);
      g.in.forEach(function (n, k) {
        (sinks[n] = sinks[n] || []).push({ to: [g.x, g.y + offs[k]], mx: g.mid && g.mid[k] !== undefined ? g.mid[k] : null });
      });
    });
    def.outputs.forEach(function (o) { (sinks[o.net] = sinks[o.net] || []).push({ to: [o.x - 13, o.y], mx: o.mid !== undefined ? o.mid : null }); });

    var wireLayer = s('g', null, svg), gateLayer = s('g', null, svg), termLayer = s('g', null, svg), topLayer = s('g', null, svg);

    Object.keys(sinks).forEach(function (net) {
      var S = srcPt[net]; if (!S) return;
      var grp = s('g', { class: 'net', 'data-net': net }, wireLayer), br = [];
      sinks[net].forEach(function (b) {
        var d, D = b.to, mx;
        if (Math.abs(S[1] - D[1]) < 0.5) { d = 'M' + S[0] + ',' + S[1] + ' H' + D[0]; mx = D[0]; }
        else { mx = b.mx !== null ? b.mx : D[0] - 20; d = 'M' + S[0] + ',' + S[1] + ' H' + mx + ' V' + D[1] + ' H' + D[0]; }
        br.push({ mx: mx, D: D });
        s('path', { d: d, class: 'w' }, grp);
        s('path', { d: d, class: 'hit' }, grp);
      });
      // junction dots
      var dots = {};
      br.forEach(function (b, i) {
        var n = br.filter(function (c) { return c.mx >= b.mx - 0.5; }).length;
        if (n >= 2 && b.mx > S[0] + 1) dots[b.mx + ',' + S[1]] = 1;
        br.forEach(function (c, j) {
          if (i !== j && Math.abs(c.mx - b.mx) < 0.5) {
            var lo = Math.min(S[1], c.D[1]), hi = Math.max(S[1], c.D[1]);
            if (b.D[1] > lo + 0.5 && b.D[1] < hi - 0.5) dots[b.mx + ',' + b.D[1]] = 1;
          }
        });
      });
      Object.keys(dots).forEach(function (k) { var p = k.split(','); s('circle', { cx: p[0], cy: p[1], r: 4, class: 'jn' }, grp); });
      groups[net] = grp;
    });

    // gates
    def.gates.forEach(function (g) {
      var G = s('g', { transform: 'translate(' + g.x + ',' + (g.y - 22) + ')' }, gateLayer);
      pinOffsets(g.in.length).forEach(function (o) { s('line', { x1: 0, y1: 22 + o, x2: 14, y2: 22 + o, class: 'gate-stub' }, G); });
      s('line', { x1: OUTX[g.type], y1: 22, x2: GW, y2: 22, class: 'gate-stub' }, G);
      s('path', { d: BODY[g.type], class: 'gate-body' }, G);
      if (g.type === 'XOR' || g.type === 'XNOR') s('path', { d: 'M4,44 Q14,22 4,0', class: 'gate-body', fill: 'none', style: 'fill:none' }, G);
      if (BUBBLE[g.type]) s('circle', { cx: BUBBLE[g.type], cy: 22, r: 4, class: 'gate-body' }, G);
      if (opts.gateNames !== false) {
        var t = s('text', { x: 30, y: -6, class: 'gate-name', 'text-anchor': 'middle' }, G); t.textContent = g.id;
      }
    });

    // terminals
    var terms = {};
    function term(id, x, y, isIn) {
      var T = s('g', { class: 'term' + (isIn && opts.toggleInputs ? ' clickable' : ''), 'data-term': id }, termLayer);
      if (isIn && opts.toggleInputs) { T.setAttribute('tabindex', '0'); T.setAttribute('role', 'button'); T.setAttribute('aria-label', 'Toggle input ' + id); }
      s('circle', { cx: x, cy: y, r: 13 }, T);
      var v = s('text', { x: x, y: y + 1, class: 'val' }, T); v.textContent = '';
      var nm = s('text', { x: isIn ? x - 20 : x + 20, y: y + 1, class: 'nm', 'text-anchor': isIn ? 'end' : 'start' }, T); nm.textContent = id;
      terms[id] = { g: T, v: v };
      return T;
    }
    def.inputs.forEach(function (i) { term(i.id, i.x, i.y, true); });
    def.outputs.forEach(function (o) { term(o.id, o.x, o.y, false); });

    // net name labels
    var labelPos = {};
    Object.keys(def.labels || {}).forEach(function (n) {
      var p = def.labels[n]; labelPos[n] = p;
      var L = s('g', { class: 'nlabel-g' }, topLayer);
      var w = 10 + n.length * 8;
      s('rect', { x: p[0] - w / 2, y: p[1] - 10, width: w, height: 18, rx: 4, class: 'nlabel-bg' }, L);
      var t = s('text', { x: p[0], y: p[1] + 3, class: 'nlabel', 'text-anchor': 'middle' }, L); t.textContent = n;
    });

    container.innerHTML = '';
    container.appendChild(svg);
    var fLayer = s('g', null, svg), bLayer = s('g', null, svg);

    function faultPoint(net) {
      if (def.fpos && def.fpos[net]) return def.fpos[net];
      var S = srcPt[net]; return [S[0] + 12, S[1]];
    }

    var api = {
      svg: svg, def: def, groups: groups,
      setValues: function (vals, diff) {
        diff = diff || {};
        Object.keys(groups).forEach(function (n) {
          var g = groups[n]; g.classList.remove('v0', 'v1', 'pending', 'diff', 'flow');
          if (vals && n in vals) g.classList.add(diff[n] ? 'diff' : (vals[n] ? 'v1' : 'v0'));
        });
        def.inputs.forEach(function (i) { api.setTerm(i.id, vals ? vals[i.id] : null); });
        def.outputs.forEach(function (o) { api.setTerm(o.id, vals ? vals[o.net] : null); });
      },
      setTerm: function (id, v) {
        var t = terms[id]; if (!t) return;
        t.g.classList.remove('v0', 'v1');
        if (v === null || v === undefined) { t.v.textContent = typeof v === 'string' ? v : ''; return; }
        if (typeof v === 'string') { t.v.textContent = v; return; }
        t.g.classList.add(v ? 'v1' : 'v0'); t.v.textContent = v;
      },
      setPending: function () {
        Object.keys(groups).forEach(function (n) { var g = groups[n]; g.classList.remove('v0', 'v1', 'diff', 'flow'); g.classList.add('pending'); });
        def.outputs.forEach(function (o) { api.setTerm(o.id, '?'); });
      },
      animate: function (vals, diff, step) {
        step = step || 420;
        var lv = levels(def), max = 0;
        Object.keys(lv).forEach(function (n) { if (lv[n] > max) max = lv[n]; });
        api.setPending();
        def.inputs.forEach(function (i) { api.setTerm(i.id, vals[i.id]); });
        return new Promise(function (res) {
          var k = 0;
          (function tick() {
            Object.keys(groups).forEach(function (n) {
              if (lv[n] === k) {
                var g = groups[n]; g.classList.remove('pending');
                g.classList.add((diff && diff[n]) ? 'diff' : (vals[n] ? 'v1' : 'v0'), 'flow');
              }
            });
            k++;
            if (k <= max) setTimeout(tick, step);
            else setTimeout(function () { def.outputs.forEach(function (o) { api.setTerm(o.id, vals[o.net]); }); res(); }, step);
          })();
        });
      },
      setFault: function (f) {
        fLayer.innerHTML = '';
        if (!f) return;
        if (f.type === 'sa0' || f.type === 'sa1') {
          var p = faultPoint(f.net), G = s('g', { class: 'fmark' }, fLayer);
          s('line', { x1: p[0] - 6, y1: p[1] - 6, x2: p[0] + 6, y2: p[1] + 6 }, G);
          s('line', { x1: p[0] - 6, y1: p[1] + 6, x2: p[0] + 6, y2: p[1] - 6 }, G);
          s('rect', { x: p[0] - 24, y: p[1] - 30, width: 48, height: 16, rx: 3 }, G);
          var t = s('text', { x: p[0], y: p[1] - 18 }, G); t.textContent = 's-a-' + (f.type === 'sa1' ? 1 : 0);
        } else if (f.pts) {
          var B = s('g', { class: 'fmark' }, fLayer);
          s('line', { x1: f.pts[0][0], y1: f.pts[0][1], x2: f.pts[1][0], y2: f.pts[1][1], 'stroke-dasharray': '4 4' }, B);
          var mx = (f.pts[0][0] + f.pts[1][0]) / 2, my = (f.pts[0][1] + f.pts[1][1]) / 2;
          s('rect', { x: mx + 6, y: my - 9, width: 58, height: 16, rx: 3 }, B);
          var tt = s('text', { x: mx + 35, y: my + 3 }, B); tt.textContent = 'bridge';
        }
      },
      select: function (net) {
        Object.keys(groups).forEach(function (n) { groups[n].classList.toggle('sel', n === net); });
      },
      badges: function (map) {
        bLayer.innerHTML = '';
        Object.keys(map || {}).forEach(function (n) {
          var p = (def.bpos && def.bpos[n]) || labelPos[n] || (srcPt[n] ? [srcPt[n][0] + 22, srcPt[n][1] - 16] : null);
          if (!p) return;
          var v = String(map[n]), isD = v === 'D' || v === 'D̄';
          var G = s('g', { class: 'badge' + (isD ? ' d' : '') }, bLayer), w = Math.max(24, 10 + v.length * 9);
          s('rect', { x: p[0] - w / 2, y: p[1] - 10, width: w, height: 20, rx: 4 }, G);
          var t = s('text', { x: p[0], y: p[1] + 1 }, G); t.textContent = v;
        });
      },
      onNet: function (cb, only) {
        Object.keys(groups).forEach(function (n) {
          if (only && only.indexOf(n) < 0) return;
          var g = groups[n]; g.classList.add('clickable');
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Select node ' + n);
          g.addEventListener('click', function () { cb(n); });
          g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cb(n); } });
        });
      },
      onInput: function (cb) {
        def.inputs.forEach(function (i) {
          var g = terms[i.id].g;
          g.addEventListener('click', function () { cb(i.id); });
          g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cb(i.id); } });
        });
      }
    };
    return api;
  };


  /* ---------------------------------------------------------
     Reusable small circuits (used by several modules)
     --------------------------------------------------------- */
  L5.lib = {
    gate2: function (type, name) {
      return { w: 400, h: 170, inputs: [{ id: 'A', x: 60, y: 60 }, { id: 'B', x: 60, y: 124 }],
        gates: [{ id: name || 'G1', type: type, x: 180, y: 92, in: ['A', 'B'], out: 'Y' }],
        outputs: [{ id: 'Y', net: 'Y', x: 340, y: 92 }] };
    },
    twoLevel: function (t1, t2) { // G1(A,B) -> n1 ; G2(n1,C) -> Y
      return { w: 520, h: 230,
        inputs: [{ id: 'A', x: 60, y: 50 }, { id: 'B', x: 60, y: 110 }, { id: 'C', x: 60, y: 190 }],
        gates: [{ id: 'G1', type: t1, x: 170, y: 80, in: ['A', 'B'], out: 'n1' },
                { id: 'G2', type: t2, x: 320, y: 130, in: ['n1', 'C'], out: 'Y' }],
        outputs: [{ id: 'Y', net: 'Y', x: 470, y: 130 }], labels: { n1: [268, 66] } };
    }
  };

  function diffMap(good, bad) { var d = {}; Object.keys(good).forEach(function (n) { if (good[n] !== bad[n]) d[n] = 1; }); return d; }
  L5.diffMap = diffMap;

  /* ---------------------------------------------------------
     4. PAGE SHELL
     --------------------------------------------------------- */
  L5.page = function (cfg) {
    var secs = Array.prototype.slice.call(document.querySelectorAll('section.sec[id]'));
    var rail = $('#rail'), list = h('ol'), bar = $('#pbar span'), meta = h('p', { class: 'rail-meta' });
    var mod = L5.store.mod(cfg.module), seen = {};
    (mod.seen || []).forEach(function (id) { seen[id] = 1; });
    var links = {};
    secs.forEach(function (sec, i) {
      var li = h('li'), a = h('a', { href: '#' + sec.id }, '<span class="dot"></span><span>' + (sec.getAttribute('data-title') || sec.id) + '</span>');
      li.appendChild(a); list.appendChild(li); links[sec.id] = a;
      if (seen[sec.id]) a.classList.add('seen');
      a.addEventListener('click', function () { rail.classList.remove('open'); });
    });
    rail.appendChild(h('h2', null, 'In this module'));
    rail.appendChild(list);
    rail.appendChild(meta);
    function refresh() {
      var n = Object.keys(seen).filter(function (k) { return links[k]; }).length;
      var pct = Math.round(100 * n / secs.length);
      if (bar) bar.style.width = pct + '%';
      var m = L5.store.mod(cfg.module);
      meta.innerHTML = 'Sections viewed: ' + n + ' of ' + secs.length +
        (m.best !== null ? '<br>Best quiz score: ' + m.best + ' / ' + (m.total || 10) : '') +
        (m.passed ? '<br><strong style="color:var(--pass)">Module completed</strong>' : '');
    }
    function markSeen(id) {
      if (seen[id]) return;
      seen[id] = 1; links[id].classList.add('seen');
      L5.store.update(cfg.module, function (m) { m.seen = Object.keys(seen); });
      refresh();
    }
    L5.refreshRail = refresh;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === e.target.id); });
            markSeen(e.target.id);
          }
        });
      }, { rootMargin: '-30% 0px -55% 0px' });
      secs.forEach(function (sec) { io.observe(sec); });
    } else { secs.forEach(function (sec) { markSeen(sec.id); }); }
    var mb = $('#menuBtn');
    if (mb) mb.addEventListener('click', function () {
      var open = rail.classList.toggle('open'); mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    refresh();
    if (cfg.trace) L5.scopeTrace($('#scope'), cfg.trace);
  };

  /* oscilloscope-style hero: expected vs measured response */
  L5.scopeTrace = function (el, t) {
    if (!el) return;
    var W = 800, sw = W / t.expected.length, svg = s('svg', { viewBox: '0 0 ' + W + ' 128', 'aria-hidden': 'true' });
    function wave(bits, top, cls, color) {
      var y = function (b) { return b ? top : top + 34; }, d = 'M0,' + y(bits[0]);
      for (var i = 0; i < bits.length; i++) {
        d += ' H' + (i + 1) * sw;
        if (i + 1 < bits.length && bits[i + 1] !== bits[i]) d += ' V' + y(bits[i + 1]);
      }
      s('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 3, class: cls }, svg);
    }
    for (var i = 0; i <= t.expected.length; i++) s('line', { x1: i * sw, y1: 4, x2: i * sw, y2: 124, stroke: '#E1E7EF', 'stroke-width': 1 }, svg);
    t.expected.forEach(function (b, i) {
      if (b !== t.measured[i]) {
        var g = s('g', { class: 'tr-flag' }, svg);
        s('rect', { x: i * sw + 2, y: 4, width: sw - 4, height: 120, fill: '#FBEAEA', stroke: '#C4302B', 'stroke-dasharray': '4 3' }, g);
      }
    });
    wave(t.expected, 12, 'tr-draw', '#2B5FAE');
    wave(t.measured, 74, 'tr-draw late', '#D98A00');
    el.appendChild(svg);
    el.appendChild(h('div', { class: 'scope-legend' },
      '<span><i style="background:#2B5FAE"></i>Expected response</span><span><i style="background:#D98A00"></i>Measured response</span>' +
      '<span><i style="background:#C4302B"></i>' + (t.note || 'Mismatch means a fault is detected') + '</span>'));
  };

  /* ---------------------------------------------------------
     5. WIDGETS
     --------------------------------------------------------- */
  function lab(el, title, tag) {
    el = resolve(el);
    var box = h('div', { class: 'lab' });
    box.appendChild(h('div', { class: 'lab-head' }, '<h4>' + title + '</h4>' + (tag ? '<span class="tag">' + tag + '</span>' : '')));
    var body = h('div', { class: 'lab-body' }); box.appendChild(body);
    el.appendChild(box);
    return body;
  }
  L5.lab = lab;

  function bitButton(id, get, set) {
    var b = h('button', { class: 'bit', type: 'button', 'aria-label': 'Input ' + id });
    function paint() { var v = get(); b.innerHTML = '<b>' + id + '</b>' + v; b.classList.toggle('on', !!v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); }
    b.addEventListener('click', function () { set(get() ? 0 : 1); });
    b.paint = paint; paint();
    return b;
  }
  function seg(options, cur, onPick) {
    var wrap = h('div', { class: 'seg', role: 'group' }), btns = [];
    options.forEach(function (o, i) {
      var b = h('button', { type: 'button', 'aria-pressed': i === cur ? 'true' : 'false' }, o);
      b.addEventListener('click', function () { btns.forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); }); onPick(i); });
      btns.push(b); wrap.appendChild(b);
    });
    wrap.set = function (i) { btns.forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); }); };
    return wrap;
  }
  L5.seg = seg; L5.bitButton = bitButton;

  /* ---------- FaultLab: toggle inputs, inject faults, compare ---------- */
  L5.FaultLab = function (el, def, o) {
    o = o || {};
    var body = lab(el, o.title || 'Fault injection lab', o.tag || 'Interactive');
    var faults = o.faults || [{ label: 'No fault', f: null }];
    var fi = o.faultIndex || 0, inp = {}, tried = {};
    def.inputs.forEach(function (i) { inp[i.id] = (o.inputs && o.inputs[i.id]) ? 1 : 0; });
    var grid = h('div', { class: 'lab-grid' + (o.stack ? ' stack' : '') }), left = h('div'), right = h('div', { class: 'readout', 'aria-live': 'polite' });
    grid.appendChild(left); grid.appendChild(right); body.appendChild(grid);
    var cw = h('div', { class: 'circuit-wrap' }); left.appendChild(cw);
    var C = L5.drawCircuit(cw, def, { toggleInputs: true });
    var ctl = h('div', { class: 'controls' }, '<span class="ctl-label">Inputs:</span>'), bits = [];
    def.inputs.forEach(function (i) {
      var b = bitButton(i.id, function () { return inp[i.id]; }, function (v) { inp[i.id] = v; update(); });
      bits.push(b); ctl.appendChild(b);
    });
    left.appendChild(ctl);
    C.onInput(function (id) { inp[id] = inp[id] ? 0 : 1; update(); });
    if (faults.length > 1) {
      var fc = h('div', { class: 'controls' }, '<span class="ctl-label">Fault:</span>');
      fc.appendChild(seg(faults.map(function (x) { return x.label; }), fi, function (i) { fi = i; tried = {}; update(); }));
      left.appendChild(fc);
    }
    var tbl = null, showAll = false;
    if (o.truthTable) {
      tbl = h('div', { class: 'tt-area' }); body.appendChild(tbl);
    }
    function key(p) { return def.inputs.map(function (i) { return p[i.id] ? 1 : 0; }).join(''); }
    function update() {
      bits.forEach(function (b) { b.paint(); });
      var f = faults[fi].f, g = simulate(def, inp), b = simulate(def, inp, f), d = diffMap(g, b);
      C.setValues(f ? b : g, f ? d : {}); C.setFault(f);
      tried[key(inp)] = 1;
      var html = '';
      def.outputs.forEach(function (op) {
        html += '<div class="rd-row"><span>Normal output ' + op.id + '</span><strong class="v' + g[op.net] + '">' + g[op.net] + '</strong></div>';
        html += '<div class="rd-row"><span>' + (f ? 'Faulty output ' : 'Output with no fault ') + op.id + '</span><strong class="v' + b[op.net] + '">' + b[op.net] + '</strong></div>';
      });
      var det = def.outputs.some(function (op) { return g[op.net] !== b[op.net]; });
      if (!f) html += '<div class="verdict info">No fault injected<small>Both circuits are identical, so every input gives the same output.</small></div>';
      else if (det) html += '<div class="verdict good">✓ This input combination detects the fault<small>The normal and faulty outputs differ, so a tester would see the problem. Red wires show where the fault effect travels.</small></div>';
      else html += '<div class="verdict bad">✗ This input combination does not detect the fault<small>' + (o.hideWhy || explainHidden(def, inp, f, g)) + '</small></div>';
      if (o.goal && f) {
        var ok = det;
        html += '<div class="verdict ' + (ok ? 'good' : 'info') + '">' + (ok ? 'Goal reached: ' + o.goal.done : 'Your task: ' + o.goal.text) + '</div>';
      }
      right.innerHTML = html;
      if (tbl) drawTable(f);
    }
    function explainHidden(def, inp, f, g) {
      if (f && (f.type === 'sa0' || f.type === 'sa1')) {
        var sv = f.type === 'sa1' ? 1 : 0;
        if (g[f.net] === sv) return 'The fault site already carries ' + sv + ' in the good circuit, so the stuck value changes nothing. The fault is not activated.';
        return 'The fault is activated at ' + f.net + ', but its effect is blocked before it reaches the output.';
      }
      if (f && f.nets) {
        if (g[f.nets[0]] === g[f.nets[1]]) return 'Both bridged lines carry the same value (' + g[f.nets[0]] + '), so the short changes nothing. Put the two lines at opposite values.';
        return 'The lines differ, but the changed value is blocked before any output.';
      }
      return 'Both circuits produce the same output for this input.';
    }
    function drawTable(f) {
      var pats = allPatterns(def), n = 0;
      var hd = def.inputs.map(function (i) { return '<th>' + i.id + '</th>'; }).join('');
      def.outputs.forEach(function (op) { hd += '<th>Normal ' + op.id + '</th><th>Faulty ' + op.id + '</th>'; });
      var rows = pats.map(function (p) {
        var k = key(p), known = showAll || tried[k], g = simulate(def, p), b = simulate(def, p, f);
        if (tried[k]) n++;
        var r = '<tr class="' + (k === key(inp) ? 'hl' : '') + '">' + def.inputs.map(function (i) { return '<td>' + p[i.id] + '</td>'; }).join('');
        var det = false;
        def.outputs.forEach(function (op) { r += '<td>' + (known ? g[op.net] : '?') + '</td><td>' + (known ? b[op.net] : '?') + '</td>'; if (g[op.net] !== b[op.net]) det = true; });
        r += known ? (f ? (det ? '<td class="det">Detects</td>' : '<td>—</td>') : '<td>—</td>') : '<td>?</td>';
        return r + '</tr>';
      }).join('');
      tbl.innerHTML = '<h4 style="margin:18px 0 4px">Your test log: ' + L5.sim.faultName(f) + '</h4><p class="hint" style="margin:0">Rows fill in as you try input combinations. Tried ' + n + ' of ' + pats.length + '.</p>' +
        '<div class="tbl-wrap"><table class="tt"><thead><tr>' + hd + '<th>Result</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      if (!showAll) {
        var btn = h('button', { class: 'btn ghost small', type: 'button' }, 'Show the complete table');
        btn.addEventListener('click', function () { showAll = true; drawTable(faults[fi].f); });
        tbl.appendChild(btn);
      }
    }
    update();
    return { update: update, circuit: C };
  };

  /* ---------- TesterBench: pattern → CUT → response → compare ---------- */
  L5.TesterBench = function (el, def, o) {
    o = o || {};
    var body = lab(el, o.title || 'Automatic test equipment', o.tag || 'Apply a pattern');
    var stages = ['Test pattern', 'Circuit under test', 'Output response', 'Compare'];
    var strip = h('div', { class: 'flow-strip' });
    strip.innerHTML = '<ol class="stripol" style="list-style:none;padding:0;margin:0 0 14px;display:flex;flex-wrap:wrap;gap:8px">' +
      stages.map(function (t, i) { return '<li data-i="' + i + '" style="flex:1 1 120px;border:2px solid var(--line);border-radius:6px;padding:6px 10px;font-size:.9rem;background:var(--panel-2);transition:all .3s"><span style="font-family:var(--mono);color:var(--muted)">' + (i + 1) + '</span> ' + t + '</li>'; }).join('') + '</ol>';
    body.appendChild(strip);
    var grid = h('div', { class: 'lab-grid' + (o.stack ? ' stack' : '') }), left = h('div'), right = h('div', { class: 'readout', 'aria-live': 'polite' });
    grid.appendChild(left); grid.appendChild(right); body.appendChild(grid);
    var cw = h('div', { class: 'circuit-wrap' }); left.appendChild(cw);
    var C = L5.drawCircuit(cw, def, {});
    var pi = 0, defective = !!o.startDefective, busy = false;
    var pc = h('div', { class: 'controls' }, '<span class="ctl-label">Pattern:</span>'), chips = [];
    o.patterns.forEach(function (p, i) {
      var c = h('button', { class: 'chip', type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false' }, def.inputs.map(function (x) { return p[x.id] ? 1 : 0; }).join(''));
      c.title = patStr(def, p);
      c.addEventListener('click', function () { if (busy) return; pi = i; chips.forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); }); idle(); });
      chips.push(c); pc.appendChild(c);
    });
    left.appendChild(pc);
    left.appendChild(h('p', { class: 'hint', style: 'margin:0' }, 'Bits are in the order ' + def.inputs.map(function (x) { return x.id; }).join(', ') + '.'));
    var dc = h('div', { class: 'controls' }, '<span class="ctl-label">Chip on the tester:</span>');
    dc.appendChild(seg(['Good chip', 'Defective chip'], defective ? 1 : 0, function (i) { if (busy) return; defective = i === 1; idle(); }));
    left.appendChild(dc);
    var go = h('button', { class: 'btn', type: 'button' }, 'Apply test pattern');
    left.appendChild(go);
    var log = h('div', { class: 'tbl-wrap' }); body.appendChild(log);
    var rows = [];
    function lit(k, bad) {
      strip.querySelectorAll('li').forEach(function (li, i) {
        li.style.borderColor = i < k ? (bad && i === 3 ? 'var(--fail)' : 'var(--hi)') : 'var(--line)';
        li.style.background = i < k ? (bad && i === 3 ? 'var(--fail-bg)' : '#FFF3DC') : 'var(--panel-2)';
      });
    }
    function idle() {
      lit(0); C.setValues(null); C.setFault(null);
      def.inputs.forEach(function (i) { C.setTerm(i.id, o.patterns[pi][i.id] ? 1 : 0); });
      right.innerHTML = '<div class="verdict info">Ready<small>Choose a pattern and press “Apply test pattern” to watch the signals travel through the circuit.</small></div>';
    }
    go.addEventListener('click', function () {
      if (busy) return; busy = true; go.disabled = true;
      var p = o.patterns[pi], g = simulate(def, p), b = defective ? simulate(def, p, o.fault) : g, d = diffMap(g, b);
      lit(1); C.setFault(null);
      right.innerHTML = '<div class="verdict info">Applying ' + patStr(def, p) + ' …</div>';
      setTimeout(function () {
        lit(2);
        C.animate(b, {}).then(function () {
          lit(3);
          var er = def.outputs.map(function (x) { return g[x.net]; }).join(''), ar = def.outputs.map(function (x) { return b[x.net]; }).join('');
          right.innerHTML = '<div class="rd-row"><span>Expected response</span><strong>' + er + '</strong></div><div class="rd-row"><span>Actual response</span><strong>…</strong></div>';
          setTimeout(function () {
            var fail = er !== ar; lit(4, fail);
            right.innerHTML = '<div class="rd-row"><span>Expected response (from simulation)</span><strong>' + er + '</strong></div>' +
              '<div class="rd-row"><span>Actual response (from the chip)</span><strong>' + ar + '</strong></div>' +
              (fail ? '<div class="verdict bad">❌ FAULT DETECTED<small>The responses differ. This chip is rejected. The red marker shows the hidden defect (a real tester only sees the output).</small></div>'
                : '<div class="verdict good">✓ TEST PASSED<small>' + (defective ? 'The responses match — but the chip is defective! This pattern does not detect its fault. Try another pattern.' : 'Expected and actual responses match for this pattern.') + '</small></div>');
            if (fail) { C.setValues(b, d); C.setFault(o.fault); }
            rows.unshift('<tr><td>' + def.inputs.map(function (x) { return p[x.id] ? 1 : 0; }).join('') + '</td><td class="l">' + (defective ? 'Defective' : 'Good') + '</td><td>' + er + '</td><td>' + ar + '</td>' + (fail ? '<td class="det">FAIL</td>' : '<td class="ok">PASS</td>') + '</tr>');
            log.innerHTML = '<table class="tt"><thead><tr><th>Pattern</th><th>Chip</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead><tbody>' + rows.slice(0, 8).join('') + '</tbody></table>';
            busy = false; go.disabled = false;
            if (o.onResult) o.onResult({ fail: fail, pattern: p, defective: defective });
          }, 500);
        });
      }, 450);
    });
    idle();
  };

  /* ---------- NodeExplorer: click nodes, see controllability / observability ---------- */
  L5.NodeExplorer = function (el, def, o) {
    o = o || {};
    var body = lab(el, o.title || 'Click a node', o.tag || 'Explore');
    var grid = h('div', { class: 'lab-grid' + (o.stack ? ' stack' : '') }), left = h('div'), right = h('div', { 'aria-live': 'polite' });
    grid.appendChild(left); grid.appendChild(right); body.appendChild(grid);
    var cw = h('div', { class: 'circuit-wrap' }); left.appendChild(cw);
    var C = L5.drawCircuit(cw, def, {});
    var sc = o.scoap ? scoap(def) : null;
    var clickables = o.info ? Object.keys(o.info) : nets(def);
    left.appendChild(h('p', { class: 'hint' }, 'Click (or tap) any highlighted wire: ' + clickables.join(', ') + '.'));
    var bset = {}; clickables.forEach(function (n) { bset[n] = n; });
    if (o.badgeNames) C.badges(bset);
    function rating(label, v) {
      var col = v === 'easy' ? 'var(--pass)' : v === 'moderate' ? 'var(--hi)' : 'var(--fail)';
      var txt = v === 'easy' ? 'Easy' : v === 'moderate' ? 'Moderate' : 'Difficult';
      return '<div class="rd-row"><span>' + label + '</span><strong style="font-family:var(--sans);font-size:1rem;color:' + col + '">' + txt + '</strong></div>';
    }
    function show(n) {
      C.select(n);
      var html = '<h4 style="margin:0 0 10px;font-size:1.1rem">Node ' + n + '</h4><div class="readout">';
      var inf = o.info && o.info[n];
      if (inf) html += rating('Controllability', inf.c) + rating('Observability', inf.o);
      if (sc) html += '<div class="rd-row"><span>CC0 (effort to set 0)</span><strong>' + sc.cc0[n] + '</strong></div><div class="rd-row"><span>CC1 (effort to set 1)</span><strong>' + sc.cc1[n] + '</strong></div><div class="rd-row"><span>CO (effort to observe)</span><strong>' + sc.co[n] + '</strong></div>';
      html += '</div>';
      if (inf && inf.why) html += '<div class="explain" style="margin-top:12px">' + inf.why + '</div>';
      right.innerHTML = html;
      if (o.onPick) o.onPick(n);
    }
    C.onNet(show, clickables);
    right.innerHTML = '<div class="verdict info">Select a node<small>' + (o.prompt || 'Pick a wire in the circuit to see how easy it is to control and observe.') + '</small></div>';
    return { circuit: C, show: show };
  };

  /* ---------- Flow: clickable stages with auto-play ---------- */
  L5.Flow = function (el, stages, o) {
    o = o || {};
    var body = lab(el, o.title || 'Flow', o.tag || 'Click each stage');
    var wrap = h('div', { class: 'flow' }), ol = h('ol'), panel = h('div', { class: 'flow-panel', 'aria-live': 'polite' });
    wrap.appendChild(ol); wrap.appendChild(panel); body.appendChild(wrap);
    var items = [], timer = null;
    stages.forEach(function (st, i) {
      var li = h('li'), b = h('button', { type: 'button' }, '<span class="fx">' + (i + 1) + '</span><span>' + st.t + '</span>');
      b.addEventListener('click', function () { stop(); pick(i, true); });
      li.appendChild(b); ol.appendChild(li); items.push(li);
    });
    function pick(i, litUpTo) {
      items.forEach(function (li, j) {
        li.classList.toggle('cur', j === i);
        li.classList.toggle('lit', litUpTo ? j < i : li.classList.contains('lit'));
        li.classList.toggle('bad', !!stages[j].bad && j <= i);
      });
      var st = stages[i];
      panel.innerHTML = '<h4>' + (i + 1) + '. ' + st.t + '</h4><p style="margin:0">' + st.d + '</p>' + (st.eg ? '<div class="eg">' + st.eg + '</div>' : '') + (st.svg ? '<div style="margin-top:10px">' + st.svg + '</div>' : '');
      if (o.onPick) o.onPick(i);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; playBtn.textContent = o.playLabel || 'Play the flow'; } }
    var playBtn = h('button', { class: 'btn ghost small', type: 'button', style: 'margin-top:12px' }, o.playLabel || 'Play the flow');
    playBtn.addEventListener('click', function () {
      if (timer) { stop(); return; }
      var i = 0; items.forEach(function (li) { li.classList.remove('lit'); });
      pick(0, true); playBtn.textContent = 'Pause';
      timer = setInterval(function () { i++; if (i >= stages.length) { stop(); return; } pick(i, true); }, o.speed || 2200);
    });
    body.appendChild(playBtn);
    pick(0, true);
  };

  /* ---------- Toggle (two or more views) ---------- */
  L5.Toggle = function (el, tabs, o) {
    el = resolve(el); o = o || {};
    var t = h('div', { class: 'toggle', role: 'tablist' }), panel = h('div', { class: 'tab-panel', role: 'tabpanel' }), btns = [];
    tabs.forEach(function (tb, i) {
      var b = h('button', { role: 'tab', type: 'button', 'aria-selected': i === 0 ? 'true' : 'false' }, tb.label);
      b.addEventListener('click', function () { show(i); });
      btns.push(b); t.appendChild(b);
    });
    function show(i) {
      btns.forEach(function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      panel.innerHTML = tabs[i].html; panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
      if (tabs[i].after) tabs[i].after(panel);
    }
    el.appendChild(t); el.appendChild(panel); show(0);
  };

  /* ---------- question rendering (shared by Check / Challenge / Quiz) ---------- */
  var qid = 0;
  function renderQ(q, label, typeLabel) {
    qid++;
    var name = 'q' + qid, box = h('div', { class: 'q' });
    box.innerHTML = '<div class="q-top">' + (label ? '<span class="q-no">' + label + '</span>' : '') + '<span class="q-prompt">' + q.prompt + '</span>' + (typeLabel ? '<span class="q-type">' + typeLabel + '</span>' : '') + '</div>';
    if (q.fig) { var f = h('div', { class: 'q-fig' }); box.appendChild(f); fig(f, q.fig); }
    var opts = h('div', { class: 'opts', role: 'radiogroup' }), labels = [], picked = -1, locked = false;
    q.options.forEach(function (op, i) {
      var l = h('label', { class: 'opt' }), r = h('input', { type: 'radio', name: name, value: i });
      l.appendChild(r); l.appendChild(h('span', null, op));
      r.addEventListener('change', function () {
        if (locked) return; picked = i;
        labels.forEach(function (x, j) { x.classList.toggle('picked', j === i); });
        if (box.onpick) box.onpick(i);
      });
      labels.push(l); opts.appendChild(l);
    });
    box.appendChild(opts);
    var exp = h('div'); box.appendChild(exp);
    return {
      node: box, get: function () { return picked; },
      lock: function () {
        locked = true;
        labels.forEach(function (l, j) {
          l.classList.add('locked'); l.querySelector('input').disabled = true;
          if (j === q.answer) l.classList.add('right'); else if (j === picked) l.classList.add('wrong');
        });
        var ok = picked === q.answer;
        exp.innerHTML = '<div class="explain ' + (ok ? 'good' : 'bad') + '"><b class="' + (ok ? 'res-good' : 'res-bad') + '">' + (ok ? '✓ Correct.' : '✗ Not quite. Correct answer: ' + q.options[q.answer] + '.') + '</b> ' + q.explain + '</div>';
        return ok;
      },
      reset: function () {
        locked = false; picked = -1; exp.innerHTML = '';
        labels.forEach(function (l) { l.className = 'opt'; var r = l.querySelector('input'); r.checked = false; r.disabled = false; });
      }
    };
  }
  function fig(el, f) {
    if (typeof f === 'string') { el.innerHTML = f; return; }
    if (f.circuit) {
      var cw = h('div', { class: 'circuit-wrap', style: 'max-width:520px' }); el.appendChild(cw);
      var C = L5.drawCircuit(cw, f.circuit, {});
      if (f.inputs) {
        var v = simulate(f.circuit, f.inputs, f.fault);
        if (f.showAll) C.setValues(v);
        else f.circuit.inputs.forEach(function (i) { C.setTerm(i.id, f.inputs[i.id] ? 1 : 0); });
        if (!f.showAll && f.hideOut !== false) f.circuit.outputs.forEach(function (o) { C.setTerm(o.id, '?'); });
      }
      if (f.showFault) C.setFault(f.fault);
      if (f.badges) C.badges(f.badges);
    }
  }
  L5.renderQ = renderQ; L5.fig = fig;

  /* ---------- Check: one question, answer then reveal ---------- */
  L5.Check = function (el, q) {
    el = resolve(el);
    var R = renderQ(q, 'Think', null), actions = h('div', { class: 'q-actions' });
    var b = h('button', { class: 'btn', type: 'button', disabled: 'disabled' }, 'Check my answer');
    var hint = h('span', { class: 'hint' }, 'Choose an option first.');
    R.node.onpick = function () { b.disabled = false; hint.textContent = ''; };
    b.addEventListener('click', function () {
      if (R.get() < 0) return;
      R.lock(); b.remove(); hint.remove();
      var again = h('button', { class: 'btn ghost small', type: 'button' }, 'Try again');
      again.addEventListener('click', function () { R.reset(); again.remove(); actions.appendChild(b); actions.appendChild(hint); b.disabled = true; hint.textContent = 'Choose an option first.'; });
      actions.appendChild(again);
      if (q.onDone) q.onDone();
    });
    actions.appendChild(b); actions.appendChild(hint);
    R.node.appendChild(actions);
    el.appendChild(R.node);
  };

  /* ---------- Challenge: series of find-the-fault problems ---------- */
  L5.Challenge = function (el, probs, o) {
    o = o || {};
    var body = lab(el, o.title || 'Find the fault', o.tag || probs.length + ' problems');
    var nav = h('div', { class: 'ch-nav' }), dots = h('div', { class: 'ch-dots' }), tally = h('span', { class: 'hint' });
    nav.appendChild(dots); nav.appendChild(tally); body.appendChild(nav);
    var stage = h('div'); body.appendChild(stage);
    var state = probs.map(function () { return null; }), cur = 0, dotBtns = [];
    probs.forEach(function (p, i) {
      var d = h('button', { type: 'button', 'aria-label': 'Problem ' + (i + 1) }, String(i + 1));
      d.addEventListener('click', function () { show(i); });
      dotBtns.push(d); dots.appendChild(d);
    });
    function paintNav() {
      dotBtns.forEach(function (d, i) { d.className = (i === cur ? 'cur ' : '') + (state[i] === true ? 'right' : state[i] === false ? 'wrong' : ''); });
      var done = state.filter(function (x) { return x !== null; }).length, right = state.filter(function (x) { return x === true; }).length;
      tally.textContent = 'Solved ' + done + ' of ' + probs.length + ', ' + right + ' correct';
    }
    function show(i) {
      cur = i; paintNav(); stage.innerHTML = '';
      var p = probs[i];
      stage.appendChild(h('h4', { style: 'margin:0 0 6px;font-size:1.1rem' }, 'Problem ' + (i + 1) + ': ' + p.title));
      if (p.text) stage.appendChild(h('p', { style: 'margin:0 0 10px' }, p.text));
      var C = null;
      if (p.def) {
        var cw = h('div', { class: 'circuit-wrap', style: 'max-width:640px' }); stage.appendChild(cw);
        C = L5.drawCircuit(cw, p.def, {});
        var g = simulate(p.def, p.inputs), b = simulate(p.def, p.inputs, p.fault);
        p.def.inputs.forEach(function (x) { C.setTerm(x.id, p.inputs[x.id] ? 1 : 0); });
        p.def.outputs.forEach(function (x) { C.setTerm(x.id, '?'); });
        var gv = h('div', { class: 'given' });
        gv.innerHTML = '<div><span>Inputs applied</span><strong>' + patStr(p.def, p.inputs) + '</strong></div>' +
          p.def.outputs.map(function (x) { return '<div><span>Expected ' + x.id + '</span><strong>' + g[x.net] + '</strong></div><div><span>Measured ' + x.id + '</span><strong>' + b[x.net] + '</strong></div>'; }).join('');
        stage.appendChild(gv);
      } else if (p.fig) { var fg = h('div'); stage.appendChild(fg); fig(fg, p.fig); }
      var R = renderQ({ prompt: p.prompt, options: p.options, answer: p.answer, explain: p.explain }, null, null);
      stage.appendChild(R.node);
      var act = h('div', { class: 'q-actions' }), sub = h('button', { class: 'btn', type: 'button' }, 'Submit answer');
      sub.disabled = state[i] !== null;
      R.node.onpick = function () { if (state[i] === null) sub.disabled = false; };
      if (state[i] === null) sub.disabled = true;
      act.appendChild(sub);
      var nxt = h('button', { class: 'btn ghost', type: 'button' }, i < probs.length - 1 ? 'Next problem' : 'Back to problem 1');
      nxt.addEventListener('click', function () { show((i + 1) % probs.length); });
      act.appendChild(nxt);
      R.node.appendChild(act);
      function reveal() {
        if (C && p.def) {
          var g2 = simulate(p.def, p.inputs), b2 = simulate(p.def, p.inputs, p.fault);
          C.setValues(p.fault ? b2 : g2, p.fault ? diffMap(g2, b2) : {});
          if (p.fault) C.setFault(p.fault);
          if (p.faultNet) C.select(p.faultNet);
        }
      }
      sub.addEventListener('click', function () {
        if (R.get() < 0 || state[i] !== null) return;
        state[i] = R.lock(); sub.disabled = true; reveal(); paintNav();
      });
      if (state[i] !== null) { R.node.querySelectorAll('input')[p._pick].checked = true; R.node.querySelectorAll('.opt')[p._pick].classList.add('picked'); forcePick(R, p._pick); R.lock(); reveal(); }
      R.node.addEventListener('change', function () { p._pick = R.get(); });
    }
    function forcePick(R, k) { var r = R.node.querySelectorAll('input')[k]; r.checked = true; r.dispatchEvent(new Event('change')); }
    show(0);
  };

  /* ---------- Quiz: all questions, score after submit ---------- */
  L5.Quiz = function (el, qs, o) {
    el = resolve(el); o = o || {};
    var res = h('div', { 'aria-live': 'polite' }), list = h('div'), bar = h('div', { class: 'q-actions', style: 'margin-top:14px' });
    el.appendChild(res); el.appendChild(list); el.appendChild(bar);
    function mix(q) { // shuffle longer option lists so answer positions vary on every attempt
      if (q.options.length < 3 || q.options.every(function (x) { return /^[\d\s,]+$/.test(x); })) return q;
      var idx = q.options.map(function (_, i) { return i; });
      for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      var c = {}; for (var k in q) c[k] = q[k];
      c.options = idx.map(function (i) { return q.options[i]; }); c.answer = idx.indexOf(q.answer);
      return c;
    }
    qs = qs.map(mix);
    var Rs = qs.map(function (q, i) { var R = renderQ(q, 'Q' + (i + 1), q.type); list.appendChild(R.node); R.node.onpick = count; return R; });
    var sub = h('button', { class: 'btn', type: 'button', disabled: 'disabled' }, 'Submit quiz'), info = h('span', { class: 'hint' });
    bar.appendChild(sub); bar.appendChild(info);
    function count() {
      var n = Rs.filter(function (R) { return R.get() >= 0; }).length;
      info.textContent = 'Answered ' + n + ' of ' + qs.length + (n < qs.length ? ' — answer every question to submit.' : ' — ready to submit.');
      sub.disabled = n < qs.length;
    }
    sub.addEventListener('click', function () {
      var score = 0; Rs.forEach(function (R) { if (R.lock()) score++; });
      var m = L5.store.recordQuiz(o.module, score, qs.length), pass = score / qs.length >= L5.PASS_MARK;
      res.innerHTML = '<div class="score ' + (pass ? 'pass' : 'fail') + '"><div class="big">' + score + '/' + qs.length + '</div><div><p><strong>' + (pass ? 'Module passed.' : 'Not passed yet — you need ' + Math.ceil(L5.PASS_MARK * qs.length) + ' correct.') + '</strong></p>' +
        '<p class="hint">Best score so far: ' + m.best + '/' + qs.length + '. Correct answers and explanations are shown under each question.</p></div></div>';
      var retry = h('button', { class: 'btn ghost', type: 'button' }, 'Retry quiz');
      retry.addEventListener('click', function () {
        Rs.forEach(function (R) { R.reset(); }); res.innerHTML = ''; retry.remove(); sub.style.display = ''; info.style.display = ''; count();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      res.querySelector('.score > div:last-child').appendChild(retry);
      sub.style.display = 'none'; info.style.display = 'none';
      if (L5.refreshRail) L5.refreshRail();
      res.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    count();
  };

  /* ---------- CoverageLab: choose patterns, watch fault coverage ---------- */
  L5.CoverageLab = function (el, def, o) {
    o = o || {};
    var body = lab(el, o.title || 'Fault coverage lab', o.tag || 'Pick test patterns');
    var faults = o.faults || allFaults(def), pats = allPatterns(def), sel = {};
    var grid = h('div', { class: 'lab-grid' + (o.stack ? ' stack' : '') }), left = h('div'), right = h('div');
    grid.appendChild(left); grid.appendChild(right); body.appendChild(grid);
    var cw = h('div', { class: 'circuit-wrap' }); left.appendChild(cw);
    var C = L5.drawCircuit(cw, def, {});
    if (def.labels) { var bb = {}; Object.keys(def.labels).forEach(function (n) { bb[n] = n; }); }
    var pc = h('div', { class: 'controls' }, '<span class="ctl-label">Test set (' + def.inputs.map(function (x) { return x.id; }).join('') + '):</span>');
    var chips = pats.map(function (p, i) {
      var c = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false' }, def.inputs.map(function (x) { return p[x.id]; }).join(''));
      c.addEventListener('click', function () { sel[i] = !sel[i]; c.setAttribute('aria-pressed', sel[i] ? 'true' : 'false'); update(); });
      pc.appendChild(c); return c;
    });
    left.appendChild(pc);
    var clr = h('button', { class: 'btn ghost small', type: 'button' }, 'Clear test set');
    clr.addEventListener('click', function () { sel = {}; chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); update(); });
    left.appendChild(clr);
    function update() {
      var chosen = pats.filter(function (_, i) { return sel[i]; }), det = 0, cells = '';
      faults.forEach(function (f) {
        var by = chosen.filter(function (p) { return detects(def, p, f); });
        if (by.length) det++;
        cells += '<div style="border:1px solid ' + (by.length ? 'var(--pass)' : 'var(--line)') + ';background:' + (by.length ? 'var(--pass-bg)' : 'var(--panel)') + ';border-radius:6px;padding:4px 8px;font:500 .85rem var(--mono)">' +
          L5.sim.faultName(f) + (by.length ? ' ✓' : '') + '</div>';
      });
      var pct = faults.length ? Math.round(1000 * det / faults.length) / 10 : 0;
      var msg = '';
      if (pct === 100) msg = chosen.length <= (o.target || 0) ? '<div class="verdict good">100% coverage with only ' + chosen.length + ' patterns — excellent, that is a compact test set.</div>' :
        '<div class="verdict info">100% coverage with ' + chosen.length + ' patterns. ' + (o.target ? 'Can you do it with ' + o.target + '?' : '') + '</div>';
      right.innerHTML = '<div class="rd-row"><span>Faults detected</span><strong>' + det + ' / ' + faults.length + '</strong></div>' +
        '<div class="rd-row"><span>Fault coverage</span><strong>' + pct + '%</strong></div>' +
        '<div style="height:12px;border-radius:6px;background:var(--panel-2);border:1px solid var(--line);margin:10px 0;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + (pct === 100 ? 'var(--pass)' : 'var(--hi)') + ';transition:width .3s"></div></div>' +
        msg + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">' + cells + '</div>';
    }
    update();
  };
})();
