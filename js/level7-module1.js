/* Level 7 · Module 1 – Advanced CMOS Logic Design */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Series–parallel network engine ----------
     A network is 'A' (one transistor) or {s:[...]} (series) or {p:[...]} (parallel). */
  function dual(n) { return typeof n === 'string' ? n : n.s ? { p: n.s.map(dual) } : { s: n.p.map(dual) }; }
  function conducts(n, v, pmos) {
    if (typeof n === 'string') return pmos ? !v[n] : !!v[n];
    return n.s ? n.s.every(function (c) { return conducts(c, v, pmos); }) : n.p.some(function (c) { return conducts(c, v, pmos); });
  }
  function count(n) { return typeof n === 'string' ? 1 : (n.s || n.p).reduce(function (a, c) { return a + count(c); }, 0); }
  function size(n) {
    if (typeof n === 'string') return { w: 64, h: 56 };
    var ks = (n.s || n.p).map(size);
    if (n.s) return { w: Math.max.apply(null, ks.map(function (k) { return k.w; })), h: ks.reduce(function (a, k) { return a + k.h; }, 0) };
    return { w: ks.reduce(function (a, k) { return a + k.w; }, 0) + 10 * (ks.length - 1), h: Math.max.apply(null, ks.map(function (k) { return k.h; })) + 24 };
  }
  function draw(n, x, y, v, pmos) {
    var sz = size(n), cx = x + sz.w / 2, out = '';
    if (typeof n === 'string') {
      var on = pmos ? !v[n] : !!v[n];
      out += P('M' + cx + ' ' + y + 'V' + (y + 10), on ? 'w-on' : 'w') + P('M' + cx + ' ' + (y + 46) + 'V' + (y + 56), on ? 'w-on' : 'w');
      out += R(cx - 24, y + 10, 48, 36, on ? 'box-on' : 'box', 7);
      out += T(cx - 4, y + 33, n, 't-ink t-b t-lg') + T(cx + 14, y + 33, pmos ? 'p' : 'n', pmos ? 't-cu t-sm' : 't-vio t-sm');
      if (pmos) out += '<circle cx="' + (cx - 24) + '" cy="' + (y + 28) + '" r="4" class="box"/>';
      return out;
    }
    var ks = (n.s || n.p);
    if (n.s) {
      var yy = y;
      ks.forEach(function (c) { var k = size(c); out += draw(c, cx - k.w / 2, yy, v, pmos); yy += k.h; });
      return out;
    }
    var xx = x, first = null, last = null, top = y + 8, bot = y + sz.h - 8;
    out += P('M' + cx + ' ' + y + 'V' + top) + P('M' + cx + ' ' + bot + 'V' + (y + sz.h));
    ks.forEach(function (c) {
      var k = size(c), ccx = xx + k.w / 2;
      if (first === null) first = ccx; last = ccx;
      out += P('M' + ccx + ' ' + top + 'V' + (top + 4));
      out += draw(c, xx, top + 4, v, pmos);
      out += P('M' + ccx + ' ' + (top + 4 + k.h) + 'V' + bot);
      xx += k.w + 10;
    });
    out += P('M' + first + ' ' + top + 'H' + last) + P('M' + first + ' ' + bot + 'H' + last);
    return out;
  }
  /* Full gate drawing: VDD – PUN – Y – PDN – GND */
  function gateSvg(pdn, pun, v, label) {
    var su = size(pun), sd = size(pdn), W = Math.max(su.w, sd.w) + 150, cx = (W - 70) / 2;
    var y0 = 34, yPun = y0 + 10, yOut = yPun + su.h + 18, yPdn = yOut + 18, yG = yPdn + sd.h + 10, H = yG + 34;
    var up = conducts(pun, v, true), dn = conducts(pdn, v, false);
    var o = '';
    o += P('M' + (cx - 60) + ' ' + y0 + 'H' + (cx + 60), 'w-cu') + T(cx, y0 - 10, 'VDD', 't-cu t-b');
    o += P('M' + cx + ' ' + y0 + 'V' + yPun, up ? 'w-on' : 'w');
    o += draw(pun, cx - su.w / 2, yPun, v, true);
    o += P('M' + cx + ' ' + (yPun + su.h) + 'V' + yPdn, (up || dn) ? 'w-on' : 'w');
    var yState = up && !dn ? '1' : dn && !up ? '0' : up && dn ? 'X' : 'Z';
    o += L.dot(cx, yOut, 5, yState === '1' ? 'dot-on' : yState === '0' ? 'dot' : 'dot-cu');
    o += P('M' + cx + ' ' + yOut + 'H' + (W - 50), yState === '1' ? 'w-on' : 'w');
    o += T(W - 34, yOut + 5, 'Y=' + yState, yState === 'X' || yState === 'Z' ? 't-bad t-b t-lg' : 't-sig t-b t-lg');
    o += draw(pdn, cx - sd.w / 2, yPdn, v, false);
    o += P('M' + cx + ' ' + (yPdn + sd.h) + 'V' + yG, dn ? 'w-on' : 'w');
    o += P('M' + (cx - 40) + ' ' + yG + 'H' + (cx + 40), 'w') + P('M' + (cx - 26) + ' ' + (yG + 6) + 'H' + (cx + 26), 'w') + P('M' + (cx - 12) + ' ' + (yG + 12) + 'H' + (cx + 12), 'w');
    o += T(cx + 52, yG + 4, 'GND', 't-dim', 'start');
    o += T(14, yPun + su.h / 2, 'PUN', 't-cu t-b', 'start') + T(14, yPdn + sd.h / 2, 'PDN', 't-vio t-b', 'start');
    return { svg: S(W, H, o, label), y: yState, up: up, dn: dn };
  }

  var GATES = [
    { k: 'nand2', n: 'NAND2', f: 'Y = ¬(A·B)', in: ['A', 'B'], pdn: { s: ['A', 'B'] } },
    { k: 'nor2', n: 'NOR2', f: 'Y = ¬(A+B)', in: ['A', 'B'], pdn: { p: ['A', 'B'] } },
    { k: 'nand3', n: 'NAND3', f: 'Y = ¬(A·B·C)', in: ['A', 'B', 'C'], pdn: { s: ['A', 'B', 'C'] } },
    { k: 'aoi21', n: 'AOI21', f: 'Y = ¬(A·B + C)', in: ['A', 'B', 'C'], pdn: { p: [{ s: ['A', 'B'] }, 'C'] } },
    { k: 'oai21', n: 'OAI21', f: 'Y = ¬((A+B)·C)', in: ['A', 'B', 'C'], pdn: { s: [{ p: ['A', 'B'] }, 'C'] } },
    { k: 'aoi22', n: 'AOI22', f: 'Y = ¬(A·B + C·D)', in: ['A', 'B', 'C', 'D'], pdn: { p: [{ s: ['A', 'B'] }, { s: ['C', 'D'] }] } },
    { k: 'oai22', n: 'OAI22', f: 'Y = ¬((A+B)·(C+D))', in: ['A', 'B', 'C', 'D'], pdn: { s: [{ p: ['A', 'B'] }, { p: ['C', 'D'] }] } },
    { k: 'cplx', n: 'Complex', f: 'Y = ¬(A·(B+C) + D)', in: ['A', 'B', 'C', 'D'], pdn: { p: [{ s: ['A', { p: ['B', 'C'] }] }, 'D'] } }
  ];

  /* ---------- Widget: CMOS gate builder ---------- */
  function gateBuilder(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>CMOS gate lab · toggle inputs, watch PUN and PDN</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var ctl = L.h('div', ''); body.appendChild(ctl);
    var cur = GATES[3], v = {}, wrongPun = false, toggles = 0, gatesSeen = {};
    var sel = L.select(ctl, 'Gate', GATES.map(function (g) { return [g.k, g.n + '   ' + g.f]; }), cur.k, function (k) {
      cur = GATES.filter(function (g) { return g.k === k; })[0]; v = {}; gatesSeen[k] = 1; build(); check();
    });
    var inRow = L.h('div', 'l7-row'); ctl.appendChild(inRow);
    var faultRow = L.h('div', 'l7-row'); ctl.appendChild(faultRow);
    var fault = L.btn('⚠ Inject design error: PUN = same topology as PDN', 'ghost', function () { wrongPun = !wrongPun; fault.classList.toggle('is-on', wrongPun); render(); });
    faultRow.appendChild(fault);
    var split = L.h('div', 'l7-lab-split'); body.appendChild(split);
    var pic = L.h('div', 'l7-svgbox'); split.appendChild(pic);
    var side = L.h('div', ''); split.appendChild(side);
    var info = L.h('div', 'l7-readout'); side.appendChild(info);
    var tt = L.h('div', 'l7-table-wrap'); side.appendChild(tt);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function build() {
      inRow.innerHTML = '<span class="l7-lab-label">Inputs</span>';
      cur.in.forEach(function (n) {
        var b = L.h('button', 'l7-bit'); b.type = 'button'; b.setAttribute('aria-label', 'Input ' + n);
        b.addEventListener('click', function () { v[n] = v[n] ? 0 : 1; toggles++; render(); check(); });
        b.setAttribute('data-in', n); inRow.appendChild(b);
      });
      render();
    }
    function evalY(vals, pun) {
      var up = conducts(pun, vals, true), dn = conducts(cur.pdn, vals, false);
      return up && !dn ? '1' : dn && !up ? '0' : up && dn ? 'X' : 'Z';
    }
    function render() {
      L.$$('[data-in]', inRow).forEach(function (b) { var n = b.getAttribute('data-in'); b.textContent = n + '=' + (v[n] ? 1 : 0); b.classList.toggle('is-1', !!v[n]); });
      var pun = wrongPun ? cur.pdn : dual(cur.pdn), g = gateSvg(cur.pdn, pun, v, cur.n + ' transistor schematic');
      pic.innerHTML = g.svg;
      var N = cur.in.length;
      info.innerHTML = '<span class="k">Function</span> <span class="v">' + cur.f + '</span><br><span class="k">PDN (nMOS)</span> ' + L.esc(txt(cur.pdn)) +
        '<br><span class="k">PUN (pMOS)</span> ' + L.esc(txt(pun)) + '<br><span class="k">Transistors</span> <span class="c">' + (count(cur.pdn) + count(pun)) + '</span> (2N, N=' + N + ')' +
        '<br><span class="k">PUN on:</span> ' + (g.up ? 'yes' : 'no') + ' · <span class="k">PDN on:</span> ' + (g.dn ? 'yes' : 'no') + ' → <span class="v">Y=' + g.y + '</span>';
      var rows = '', bad = 0;
      for (var m = 0; m < (1 << N); m++) {
        var vals = {}; cur.in.forEach(function (n, i) { vals[n] = (m >> (N - 1 - i)) & 1; });
        var y = evalY(vals, pun), isCur = cur.in.every(function (n) { return (v[n] ? 1 : 0) === vals[n]; });
        if (y === 'X' || y === 'Z') bad++;
        rows += '<tr' + (isCur ? ' style="background:rgba(0,113,227,.09)"' : '') + '><td>' + cur.in.map(function (n) { return vals[n]; }).join('') + '</td><td style="color:' + (y === 'X' || y === 'Z' ? 'var(--l7-bad)' : 'var(--l7-sig)') + '">' + y + '</td></tr>';
      }
      tt.innerHTML = '<table class="l7-table" style="min-width:0"><tr><th>' + cur.in.join('') + '</th><th>Y</th></tr>' + rows + '</table>';
      if (wrongPun) L.fb(fb, 'bad', '⚠ With a PUN that is not the dual of the PDN, ' + bad + ' input combination' + (bad === 1 ? '' : 's') + ' give <b>X</b> (both networks on → short circuit, contention) or <b>Z</b> (both off → floating output). A correct static CMOS gate never does this.' + (bad === 0 ? ' (For this gate the error happens to be harmless – try AOI21.)' : ''));
      else L.fb(fb, 'info', 'PUN is the <b>dual</b> of the PDN: series ↔ parallel. For every input combination exactly one network conducts, so Y is always a strong 0 or 1.');
    }
    function txt(n) { return typeof n === 'string' ? n : '(' + (n.s || n.p).map(txt).join(n.s ? ' series ' : ' ∥ ') + ')'; }
    function check() { if (toggles >= 4 && Object.keys(gatesSeen).length >= 2) api.done(); }
    build();
  }

  /* ---------- Widget: pass-transistor vs transmission gate ---------- */
  function passLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Switch lab · what voltage reaches the output?</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var type = 'n', vin = 1, vdd = 1.2, vtn = 0.35, vtp = 0.35, tried = {};
    var c = L.h('div', ''); body.appendChild(c);
    var g = L.h('div', 'l7-row'); c.appendChild(g);
    g.appendChild(L.h('span', 'l7-lab-label', 'Switch'));
    var bs = [['n', 'nMOS pass'], ['p', 'pMOS pass'], ['tg', 'Transmission gate']].map(function (x) {
      var b = L.btn(x[1], '', function () { type = x[0]; bs.forEach(function (y) { y.classList.toggle('is-on', y === b); }); upd(); });
      if (x[0] === type) b.classList.add('is-on'); g.appendChild(b); return b;
    });
    var g2 = L.h('div', 'l7-row'); c.appendChild(g2);
    g2.appendChild(L.h('span', 'l7-lab-label', 'Input'));
    var b0 = L.btn('Pass logic 0', '', function () { vin = 0; b0.classList.add('is-on'); b1.classList.remove('is-on'); upd(); });
    var b1 = L.btn('Pass logic 1', 'is-on', function () { vin = 1; b1.classList.add('is-on'); b0.classList.remove('is-on'); upd(); });
    g2.appendChild(b0); g2.appendChild(b1);
    L.slider(c, 'VDD', 0.8, 1.8, 0.1, vdd, function (x) { return x.toFixed(1) + ' V'; }, function (x) { vdd = x; upd(); });
    L.slider(c, '|Vt| (both devices)', 0.2, 0.6, 0.05, vtn, function (x) { return x.toFixed(2) + ' V'; }, function (x) { vtn = vtp = x; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-fb'); body.appendChild(out);
    function upd() {
      var vo, note;
      if (type === 'n') { vo = vin ? vdd - vtn : 0; note = vin ? 'nMOS passes a <b>weak 1</b>: it turns off when V<sub>out</sub> reaches VDD − V<sub>tn</sub>.' : 'nMOS passes a <b>strong 0</b>.'; }
      else if (type === 'p') { vo = vin ? vdd : vtp; note = vin ? 'pMOS passes a <b>strong 1</b>.' : 'pMOS passes a <b>weak 0</b>: it stops conducting when V<sub>out</sub> falls to |V<sub>tp</sub>|.'; }
      else { vo = vin ? vdd : 0; note = 'The nMOS and pMOS in parallel cover each other\'s weakness: <b>both levels pass at full swing</b>, at the cost of two transistors and complementary control signals.'; }
      tried[type + vin] = 1; if (Object.keys(tried).length >= 5) api.done();
      var pct = vo / vdd, W = 520, o = '';
      o += P('M30 70H170', 'w-on') + T(30, 58, 'IN = ' + (vin ? vdd.toFixed(1) + ' V' : '0 V'), 't-sig', 'start');
      o += R(170, 46, 120, 48, 'box-vio', 10) + T(230, 76, type === 'tg' ? 'n ∥ p' : type + 'MOS', 't-ink t-b');
      o += P('M290 70H360', pct > .98 || (vin === 0 && vo === 0) ? 'w-on' : 'w-cu');
      o += R(380, 20, 30, 100, 'box', 4);
      var hh = Math.max(2, 100 * pct);
      o += '<rect x="382" y="' + (120 - hh) + '" width="26" height="' + (hh - 2) + '" rx="3" fill="' + (Math.abs(vo - (vin ? vdd : 0)) < 1e-6 ? 'var(--l7-ok)' : 'var(--l7-cu)') + '"/>';
      o += T(425, 74, 'OUT = ' + vo.toFixed(2) + ' V', 't-ink t-b t-lg', 'start');
      o += T(425, 96, Math.abs(vo - (vin ? vdd : 0)) < 1e-6 ? 'full swing' : 'degraded level', Math.abs(vo - (vin ? vdd : 0)) < 1e-6 ? 't-ok' : 't-cu', 'start');
      pic.innerHTML = S(W + 140, 140, o, 'Switch output level');
      L.fb(out, 'info', note);
    }
    upd();
  }

  /* ---------- Domino animation frames ---------- */
  function domino(st) {
    // st: {clk, a, b, x, y, phase}
    var on = function (c) { return c ? 'w-on' : 'w'; }, o = '';
    o += P('M80 20H300', 'w-cu') + T(190, 14, 'VDD', 't-cu t-b');
    o += R(150, 34, 80, 34, st.clk ? 'box' : 'box-on') + T(190, 56, 'P (clk)', 't-ink t-sm');
    o += '<circle cx="150" cy="51" r="4" class="box"/>';
    o += P('M190 20V34', on(!st.clk)) + P('M190 68V96', on(st.x));
    o += L.dot(190, 96, 5, st.x ? 'dot-on' : 'dot') + T(170, 92, 'X', 't-ink t-b', 'end');
    o += P('M190 96V110', on(st.x));
    o += R(150, 110, 80, 32, st.a ? 'box-on' : 'box') + T(190, 131, 'A', 't-ink t-b');
    o += P('M190 142V152', on(st.a && st.b && st.clk));
    o += R(150, 152, 80, 32, st.b ? 'box-on' : 'box') + T(190, 173, 'B', 't-ink t-b');
    o += P('M190 184V194', on(st.a && st.b && st.clk));
    o += R(150, 194, 80, 32, st.clk ? 'box-on' : 'box') + T(190, 215, 'N (clk)', 't-ink t-sm');
    o += P('M190 226V246', 'w') + P('M160 246H220', 'w') + T(190, 262, 'GND', 't-dim');
    // inverter
    o += P('M190 96H300', on(st.x));
    o += '<path d="M300 76L340 96L300 116Z" class="' + (st.y ? 'box-on' : 'box') + '"/><circle cx="345" cy="96" r="5" class="box"/>';
    o += P('M350 96H420', on(st.y)) + T(440, 101, 'Y=' + (st.y ? 1 : 0), st.y ? 't-sig t-b t-lg' : 't-ink t-b t-lg', 'start');
    o += T(40, 110, 'CLK=' + st.clk, 't-vio t-b t-lg', 'start') + T(40, 132, st.phase, 't-vio', 'start');
    if (st.pulse) o += '<circle cx="190" cy="96" r="12" class="w-cu pulse"/>';
    return S(520, 272, o, 'Domino AND2 gate, ' + st.phase);
  }

  var FR = function (pdn) { var g = gateSvg(pdn, dual(pdn), {}, 'CMOS network'); return g.svg; };

  L.module({
    n: 1,
    lead: 'Go beyond NAND and NOR. Design any inverting function directly at transistor level, then compare static CMOS with ratioed, pass-transistor, transmission-gate, dynamic and domino logic – the styles real designers choose between.',
    tags: ['PUN/PDN duality', 'AOI / OAI', 'pass-transistor', 'transmission gate', 'pseudo-nMOS', 'dynamic', 'domino'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-complex', type: 'concept', title: 'Complex CMOS gates: one stage, any inverting function', nav: 'Complex gates',
        html: '<p>A static CMOS gate has two complementary switch networks. The <b>pull-down network (PDN)</b> of nMOS transistors connects the output to GND when the function should be 0; the <b>pull-up network (PUN)</b> of pMOS transistors connects it to VDD when the output should be 1. Because exactly one network conducts for every input combination, the output is always driven to a full rail and there is no static current path.</p>' +
          '<div class="l7-grid2"><div class="l7-box vio"><h4>PDN rules (nMOS, on when input = 1)</h4><ul><li>AND of literals → transistors in <b>series</b></li><li>OR of literals → transistors in <b>parallel</b></li><li>Implements f, so the gate gives Y = ¬f</li></ul></div>' +
          '<div class="l7-box cu"><h4>PUN rules (pMOS, on when input = 0)</h4><ul><li>The PUN is the <b>dual</b> of the PDN</li><li>series in PDN → parallel in PUN, and vice-versa</li><li>Same inputs, no inverters needed</li></ul></div></div>' +
          '<p style="margin-top:12px">A single complex gate replaces several simple gates, saving transistors, area and internal wiring. The price: series stacks get slow (resistances add), so practical cells limit stacks to about 3–4 transistors.</p>' +
          '<div class="l7-eq">Static CMOS transistor count = 2 × (number of inputs)   e.g. AOI22 → 8 transistors</div>'
      },
      { id: 'w-gate', type: 'widget', badge: 'explore', title: 'CMOS gate lab: PUN and PDN in action', nav: 'Gate lab', intro: 'Pick a gate, toggle the inputs and watch which transistors conduct (highlighted). The truth table highlights the current input row. Explore at least two gates and toggle inputs a few times. Then inject the design error to see contention and floating outputs.', build: gateBuilder },
      {
        id: 'c-aoi', type: 'concept', title: 'AOI and OAI structures', nav: 'AOI / OAI',
        html: '<p><b>AND-OR-INVERT (AOI)</b> gates compute ¬(sum of products); <b>OR-AND-INVERT (OAI)</b> gates compute ¬(product of sums). They are among the most used complex cells in every standard-cell library because many logic expressions map onto them directly.</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Cell</th><th>Function</th><th>PDN</th><th>PUN</th><th>Devices</th></tr>' +
          '<tr><td>AOI21</td><td>¬(A·B + C)</td><td>(A series B) ∥ C</td><td>(A ∥ B) series C</td><td>6</td></tr>' +
          '<tr><td>OAI21</td><td>¬((A+B)·C)</td><td>(A ∥ B) series C</td><td>(A series B) ∥ C</td><td>6</td></tr>' +
          '<tr><td>AOI22</td><td>¬(A·B + C·D)</td><td>(A–B) ∥ (C–D)</td><td>(A∥B) series (C∥D)</td><td>8</td></tr>' +
          '<tr><td>OAI22</td><td>¬((A+B)·(C+D))</td><td>(A∥B) series (C∥D)</td><td>(A–B) ∥ (C–D)</td><td>8</td></tr></table></div>' +
          '<p>The naming reads the cell inputs left to right: in AOI21 the “2” is a 2-input AND and the “1” a single input, both feeding the OR.</p>'
      },
      {
        id: 'st-build', type: 'steps', title: 'Animation: from Boolean expression to CMOS', nav: 'Expression → CMOS', intro: 'Follow the standard procedure for Y = ¬(A·(B+C) + D).',
        frames: [
          { t: 'Start from the <b>inverting</b> form Y = ¬f with f = A·(B+C) + D. If your expression is not inverted, implement ¬Y and add an output inverter.', svg: S(560, 120, T(280, 50, 'Y = ¬( A·(B+C) + D )', 't-ink t-b t-lg') + T(280, 80, 'f = A·(B+C) + D  → implement f in the PDN', 't-sig')) },
          { t: 'Inner OR (B+C) → <b>B and C in parallel</b> nMOS.', svg: function () { return FR({ p: ['B', 'C'] }); } },
          { t: 'AND with A → A in <b>series</b> with the (B∥C) group.', svg: function () { return FR({ s: ['A', { p: ['B', 'C'] }] }); } },
          { t: 'OR with D → D in <b>parallel</b> with the whole A–(B∥C) branch. The PDN is complete. The PUN shown is its dual.', svg: function () { return FR({ p: [{ s: ['A', { p: ['B', 'C'] }] }, 'D'] }); } },
          { t: 'Check: 4 inputs → 8 transistors. The longest nMOS stack is 2 (A then B or C) and the longest pMOS stack is 3 (D, then A or B–C). Size the series devices wider to balance delay.', svg: function () { return FR({ p: [{ s: ['A', { p: ['B', 'C'] }] }, 'D'] }); } }
        ]
      },
      {
        id: 'c-styles', type: 'concept', title: 'Ratioed, pass-transistor and transmission-gate logic', nav: 'Other styles',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>Ratioed logic (pseudo-nMOS)</h4><p>The PUN is replaced by a single always-on pMOS load. Only N + 1 transistors are needed and the gate is fast, but when the PDN is on, current flows continuously from VDD to GND (<b>static power</b>), and V<sub>OL</sub> is not 0 V – it depends on the strength <b>ratio</b> of the pull-down to the load. The PDN must be sized strong enough to pull the output well below the switching threshold.</p></div>' +
          '<div class="l7-box sig"><h4>Pass-transistor logic</h4><p>Inputs are steered through transistors used as switches, e.g. a 2:1 multiplexer with 2 nMOS. Very compact, but an nMOS passes a <b>degraded 1</b> (VDD − V<sub>tn</sub>) and a pMOS passes a degraded 0. Chains need level restoration with an inverter.</p></div>' +
          '<div class="l7-box vio"><h4>Transmission gate (TG)</h4><p>An nMOS and a pMOS in parallel, controlled by complementary signals (S, S̄). It passes both 0 and 1 at full swing. TGs build compact multiplexers, XOR/XNOR gates and latches.</p></div>' +
          '<div class="l7-box"><h4>Why not use them everywhere?</h4><p>Pass and TG networks are not restoring: noise and degraded levels accumulate, and the driving gate must supply all the current. They are used locally (muxes, XOR, latches) inside otherwise static CMOS designs.</p></div></div>'
      },
      { id: 'w-pass', type: 'widget', badge: 'explore', title: 'Switch lab: weak and strong levels', nav: 'Switch lab', intro: 'Try every switch with both logic values (at least five combinations). Change VDD and |Vt| to see how much signal swing is lost.', build: passLab },
      {
        id: 'c-dyn', type: 'concept', title: 'Dynamic and domino logic', nav: 'Dynamic logic',
        html: '<p><b>Dynamic logic</b> stores the output as charge on a node. During <b>precharge</b> (CLK = 0) a pMOS charges node X to VDD. During <b>evaluate</b> (CLK = 1) the precharge device is off, a clocked foot nMOS turns on, and X discharges only if the nMOS network conducts. Only N + 2 transistors and no pMOS network: small and fast.</p>' +
          '<p>Problems: a dynamic node can only go from 1 to 0 during evaluation, so a dynamic gate cannot directly drive another dynamic gate (a glitch can never be undone). <b>Charge sharing</b> with internal nodes and leakage can corrupt the stored value, so a weak <b>keeper</b> pMOS is usually added.</p>' +
          '<p><b>Domino logic</b> adds a static inverter after each dynamic node. Outputs start at 0 after precharge and can only rise during evaluation (<b>monotonic</b>), so stages can be cascaded and fall like dominoes. Domino gates are <b>non-inverting</b> – an inverting function needs dual-rail logic or rearranging the logic.</p>' +
          '<div class="l7-eq">Dynamic gate: N + 2 transistors   ·   Domino gate: N + 4 (adds an inverter)   ·   Static CMOS: 2N</div>'
      },
      {
        id: 'st-domino', type: 'steps', title: 'Animation: a domino AND2 gate through one clock cycle', nav: 'Domino animation',
        frames: [
          { t: '<b>Precharge</b> (CLK = 0): the clocked pMOS P is on and the foot N is off. Node X charges to VDD, so the output inverter gives Y = 0. The inputs do not matter.', svg: domino({ clk: 0, a: 1, b: 0, x: 1, y: 0, phase: 'precharge' }) },
          { t: '<b>Evaluate</b> (CLK = 1) with A = 1, B = 0: P turns off, N turns on. The series path A–B is broken, so X stays high on its stored charge. Y stays 0.', svg: domino({ clk: 1, a: 1, b: 0, x: 1, y: 0, phase: 'evaluate, A·B = 0' }) },
          { t: 'Risk while X is floating: <b>charge sharing</b> with the node between A and B, and leakage, can pull X down. A weak <b>keeper</b> pMOS fed back from Y holds X high.', svg: domino({ clk: 1, a: 1, b: 0, x: 1, y: 0, phase: 'X holds by charge', pulse: 1 }) },
          { t: 'Next cycle: precharge again. X returns to 1, Y to 0.', svg: domino({ clk: 0, a: 1, b: 1, x: 1, y: 0, phase: 'precharge' }) },
          { t: '<b>Evaluate</b> with A = 1, B = 1: the A–B–N path conducts, X discharges to 0 and Y rises to 1 – a single monotonic 0→1 transition that can trigger the next domino stage.', svg: domino({ clk: 1, a: 1, b: 1, x: 0, y: 1, phase: 'evaluate, A·B = 1' }) }
        ]
      },
      {
        id: 'rv-styles', type: 'reveal', title: 'Click to reveal: which logic style, and why?', nav: 'Reveal',
        items: [
          { q: 'Why is a pMOS stack slower than an nMOS stack of the same size?', a: 'Hole mobility is roughly 2–3× lower than electron mobility, so a pMOS has higher on-resistance. Designers make pMOS devices wider and prefer NAND-type structures (series nMOS, parallel pMOS).' },
          { q: 'Why limit series stacks to about 4 transistors?', a: 'Series resistances add and internal-node capacitances grow, so delay increases roughly quadratically with stack height. Long stacks are split into multiple stages.' },
          { q: 'When is pseudo-nMOS still useful?', a: 'For wide NOR-type structures that are rarely active, e.g. large decoders or PLA-like arrays, where its speed and density outweigh static current.' },
          { q: 'Why must domino gates be non-inverting?', a: 'An inverting dynamic output falls during evaluation; a following dynamic gate that already started evaluating could be wrongly discharged and cannot recover until the next precharge. Domino keeps every output rising-only.' },
          { q: 'What does a keeper transistor do?', a: 'It is a weak pMOS, controlled by the output, that replaces charge lost to leakage or charge sharing on the dynamic node. It must be weak enough that the pull-down network can still win.' },
          { q: 'How does a TG-based 2:1 mux compare with static CMOS?', a: 'Two TGs (4 transistors) plus an inverter for S̄, versus about 12 transistors for AOI-based static logic. It is compact, but it is not restoring, so it needs buffering if chained.' }
        ]
      },
      {
        id: 'dd-styles', type: 'drag', title: 'Drag & drop: match the property to the logic style', nav: 'Drag & drop',
        bins: ['Static CMOS', 'Pseudo-nMOS (ratioed)', 'Dynamic / domino', 'Pass-transistor / TG'],
        items: [['Full-swing, ratioless outputs', 0], ['2N transistors', 0], ['No static current', 0], ['Static current when output is low', 1], ['VOL depends on device sizes', 1], ['N + 1 transistors', 1], ['Precharge and evaluate phases', 2], ['Needs a keeper for leakage', 2], ['Outputs must be monotonic', 2], ['nMOS passes a weak 1', 3], ['Compact XOR and multiplexer', 3], ['Needs complementary control signals', 3]]
      },
      { part: 'Practice' },
      {
        id: 'calc1', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'How many transistors does a static CMOS implementation of Y = ¬(A·B + C·D + E) need?', a: 10, tol: 0, abs: 0.01, u: 'transistors', h: 'Count inputs; static CMOS uses one nMOS and one pMOS per input.', s: '5 inputs (A, B, C, D, E) → 5 nMOS + 5 pMOS = <b>10</b>.' },
          { q: 'An nMOS pass transistor drives logic 1. VDD = 1.2 V and V<sub>tn</sub> = 0.35 V (ignore body effect). What is the output high level?', a: 0.85, u: 'V', h: 'The nMOS turns off when V<sub>GS</sub> falls to V<sub>tn</sub>.', s: 'V<sub>out</sub> = VDD − V<sub>tn</sub> = 1.2 − 0.35 = <b>0.85 V</b>.' },
          { q: 'A pseudo-nMOS gate draws 60 µA from a 1.8 V supply whenever its output is low. What static power does it dissipate while low? (answer in µW)', a: 108, u: 'µW', h: 'P = VDD × I.', s: 'P = 1.8 V × 60 µA = <b>108 µW</b> – for every gate whose output is low, all the time.' },
          { q: 'How many transistors are in a domino 4-input AND gate (precharge pMOS, foot nMOS, 4-input nMOS network, output inverter; no keeper)?', a: 8, tol: 0, abs: 0.01, u: 'transistors', h: 'Dynamic stage N + 2, then add the inverter.', s: 'Dynamic stage: 4 + 2 = 6; inverter: 2 → <b>8</b>.' },
          { q: 'In the gate Y = ¬(A·(B+C) + D), what is the maximum number of pMOS transistors in series between VDD and Y?', a: 3, tol: 0, abs: 0.01, h: 'Draw the dual network: D in series with (A ∥ (B series C)).', s: 'PUN = D series (A ∥ (B series C)). The longest path is D → B → C = <b>3</b> pMOS.' }
        ]
      },
      {
        id: 'mcq1', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'In a static CMOS gate, nMOS transistors in series in the PDN correspond to pMOS transistors that are…', o: ['also in series', 'in parallel', 'removed', 'replaced by a resistor'], a: 1, w: 'The PUN is the dual of the PDN: series ↔ parallel.' },
          { q: 'Which structure implements Y = ¬((A+B)·C) in a single stage?', o: ['AOI21', 'OAI21', 'NAND3', 'XOR2'], a: 1, w: 'OR inputs first, then AND, then invert: OR-AND-INVERT.' },
          { q: 'The main drawback of pseudo-nMOS logic is…', o: ['it needs two clock phases', 'static power when the output is low', 'it cannot implement NOR', 'it passes a weak 0'], a: 1, w: 'The always-on pMOS load conducts whenever the PDN is on.' },
          { q: 'A transmission gate passes…', o: ['only a strong 0', 'only a strong 1', 'both 0 and 1 at full swing', 'neither level reliably'], a: 2, w: 'The nMOS passes the strong 0 and the pMOS the strong 1.' }
        ]
      },
      {
        id: 'short1', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain why the pull-up network of a static CMOS gate must be the dual of its pull-down network.', k: ['dual|series|parallel', 'one network|exactly one|complement', 'short|contention|both on', 'float|high impedance|both off'], m: 'For every input combination exactly one network must conduct. Making the PUN the dual (series ↔ parallel, pMOS on for 0) guarantees the PUN conducts precisely when the PDN does not. If both conducted there would be contention and a short-circuit path; if neither conducted the output would float.' },
          { q: 'Why can a dynamic gate not directly drive another dynamic gate, and how does domino logic solve this?', k: ['precharge|precharged', 'discharge|fall|1 to 0', 'monotonic|rising', 'inverter'], m: 'After precharge every dynamic output is high. During evaluation the first gate may take some time to discharge; meanwhile the second gate sees a 1 and may discharge wrongly, which cannot be undone until the next precharge. Domino adds a static inverter so each output starts low and can only rise (monotonic), which is safe to cascade.' }
        ]
      },
      {
        id: 'scen1', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'You are implementing Y = ¬(A·B·C·D·E·F) for a high-speed path. A single static NAND6 would have 6 nMOS in series.', q: 'What is the best approach?', o: [{ t: 'Use the NAND6 and make all transistors minimum size', ok: false, w: 'A 6-high stack is very slow; minimum size makes it worse.' }, { t: 'Build a tree: two NAND3 gates whose outputs are combined by an OR2', ok: true, w: 'Correct. ¬(ABC) + ¬(DEF) = ¬(ABCDEF) by De Morgan. Each stage now has stacks of at most 3 (the OR2 is a NOR2 plus inverter), which is far faster than one 6-high stack.' }, { t: 'Use pseudo-nMOS to remove the pMOS stack', ok: false, w: 'It removes the pMOS stack but adds static power and still has a 6-high nMOS stack.' }] },
          { s: 'A pass-transistor multiplexer tree with three levels of nMOS switches drives a static inverter. The inverter output sometimes draws extra current.', q: 'What is the most likely cause?', o: [{ t: 'The degraded high level (VDD − Vtn) partially turns on the inverter pMOS', ok: true, w: 'Right – a weak 1 leaves the pMOS slightly on, so both inverter devices conduct. Use TGs or a level-restoring keeper.' }, { t: 'The nMOS switches pass a weak 0', ok: false, w: 'nMOS passes a strong 0; the weak level is the 1.' }, { t: 'The multiplexer has too few levels', ok: false, w: 'Fewer levels would not cause the extra current; the degraded logic-1 level does.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'In the PDN of a static CMOS gate, an OR of two inputs is implemented with nMOS transistors in…', o: ['series', 'parallel', 'a single shared transistor', 'a cross-coupled pair'], a: 1, w: 'OR → parallel in the PDN (either transistor can pull down).' },
      { q: 'How many transistors does a static CMOS AOI22 gate use?', o: ['4', '6', '8', '12'], a: 2, w: '4 inputs × 2 = 8.' },
      { q: 'The PUN of Y = ¬(A·B + C) is…', o: ['(A series B) ∥ C', '(A ∥ B) series C', 'A series B series C', 'A ∥ B ∥ C'], a: 1, w: 'Dual of (A series B) ∥ C.' },
      { q: 'Which logic style has an output low level that depends on the transistor size ratio?', o: ['Static CMOS', 'Pseudo-nMOS', 'Domino', 'Transmission gate'], a: 1, w: 'Ratioed logic: the pull-down fights an always-on load.' },
      { q: 'An nMOS switch passing logic 1 with VDD = 1.0 V and Vtn = 0.3 V gives approximately…', o: ['1.0 V', '0.7 V', '0.3 V', '0 V'], a: 1, w: 'VDD − Vtn = 0.7 V (ignoring body effect).' },
      { q: 'In a dynamic gate, the clocked foot nMOS transistor…', o: ['charges the output during precharge', 'prevents a short-circuit path during precharge', 'acts as the keeper', 'inverts the output'], a: 1, w: 'With the foot off during precharge, no DC path exists even if the inputs are high.' },
      { q: 'Domino logic gates are…', o: ['always inverting', 'non-inverting and monotonic', 'ratioed', 'clock-free'], a: 1, w: 'Dynamic stage plus inverter: outputs only rise during evaluation.' },
      { q: 'Charge sharing in a dynamic gate can…', o: ['raise the output above VDD', 'reduce the voltage of the precharged node', 'increase the clock frequency', 'remove the need for precharge'], a: 1, w: 'Charge flows from the dynamic node into uncharged internal nodes, lowering its voltage.' },
      { q: 'Why are pMOS devices usually made wider than nMOS devices in a cell?', o: ['pMOS has lower threshold voltage', 'hole mobility is lower than electron mobility', 'pMOS leaks less', 'to reduce input capacitance'], a: 1, w: 'Wider pMOS compensates for its lower mobility to balance rise and fall.' },
      { q: 'A transmission gate requires…', o: ['one control signal', 'complementary control signals S and S̄', 'a clock', 'a pull-up resistor'], a: 1, w: 'The nMOS gate gets S and the pMOS gate gets S̄.' }
    ]
  });
})();
