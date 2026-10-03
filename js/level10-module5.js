/* Level 10 · Module 5 – Clock Tree Synthesis */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var SRC = [24, 160], CEN = [330, 160];
  var L1 = [[190, 160], [470, 160]], L2 = [[190, 90], [190, 230], [470, 90], [470, 230]];
  var LEAF = [[130, 90], [250, 90], [130, 230], [250, 230], [410, 90], [530, 90], [410, 230], [530, 230]];
  var SINK = [[122, 80], [262, 96], [140, 244], [244, 220], [398, 86], [544, 100], [420, 238], [522, 222]];
  var BUF = 15;                                   // delay of one clock buffer (units)
  function d(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
  function load(n) { return n > 4 ? (n - 4) * 6 : 0; }

  function build(cfg) {
    var segs = [], bufs = [], lat = [], fan = [], i;
    function seg(a, b, cls) { segs.push([a, b, cls || '']); }
    if (cfg.topo === 'direct') {
      fan.push(8);
      SINK.forEach(function (s) { seg(SRC, s); lat.push(d(SRC, s) / 10 + load(8)); });
    } else if (cfg.topo === 'chain') {
      var order = SINK.map(function (s, k) { return k; }).sort(function (a, b) { return SINK[a][0] - SINK[b][0]; }), prev = SRC, acc = 0;
      order.forEach(function (k) { var s = SINK[k]; seg(prev, s); bufs.push(s); acc += d(prev, s) / 10 + BUF; lat[k] = acc; prev = s; fan.push(2); });
    } else if (cfg.topo === 'unbal') {
      var bl = [150, 160], br = [300, 160];
      seg(SRC, bl); seg(bl, br); bufs.push(bl, br); fan.push(5, 4);
      SINK.forEach(function (s, k) { var b = k < 4 ? bl : br; seg(b, s); lat[k] = (k < 4 ? d(SRC, bl) / 10 + BUF : (d(SRC, bl) + d(bl, br)) / 10 + 2 * BUF) + d(b, s) / 10 + load(k < 4 ? 5 : 4); });
    } else {                                       // H-tree with 1–3 buffered levels
      var lv = cfg.levels;
      seg(SRC, CEN); bufs.push(CEN);
      L1.forEach(function (p) { seg(CEN, p); });
      L1.forEach(function (p, a) { L2.slice(a * 2, a * 2 + 2).forEach(function (q) { seg(p, q); }); });
      L2.forEach(function (q, b) { LEAF.slice(b * 2, b * 2 + 2).forEach(function (r) { seg(q, r); }); });
      if (lv >= 2) L1.forEach(function (p) { bufs.push(p); });
      if (lv >= 3) L2.forEach(function (q) { bufs.push(q); });
      fan.push(lv === 1 ? 8 : 2); if (lv === 2) fan.push(4, 4); if (lv === 3) fan.push(2, 2, 2, 2, 2, 2);
      SINK.forEach(function (s, k) {
        var q = L2[k >> 1], p = L1[k >> 2];
        seg(LEAF[k], s, 'off');
        var path = d(SRC, CEN) + d(CEN, p) + d(p, q) + d(q, LEAF[k]) + d(LEAF[k], s);
        lat[k] = path / 10 + BUF * lv + (lv === 1 ? load(8) : lv === 2 ? load(4) : 0);
      });
    }
    var max = Math.max.apply(null, lat), extra = 0, delayCells = 0;
    if (cfg.balance) lat = lat.map(function (x) { if (max - x > 1) { delayCells += Math.ceil((max - x) / BUF); extra += max - x; } return max - Math.min(max - x, 0.6); });
    var min = Math.min.apply(null, lat), wl = segs.reduce(function (s, g) { return s + d(g[0], g[1]); }, 0);
    return { segs: segs, bufs: bufs, lat: lat, skew: Math.max.apply(null, lat) - min, ins: Math.max.apply(null, lat), nbuf: bufs.length + delayCells, delayCells: delayCells, wl: wl, slew: Math.max.apply(null, fan) <= 4 };
  }

  /* ---------- Widget: clock tree lab ---------- */
  function ctsLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Clock tree lab · clock source → buffers → 8 register groups</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cfg = { topo: 'direct', levels: 2, balance: false }, done = false, tried = {};
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var TOP = [['direct', 'No tree (source drives all)'], ['chain', 'Daisy chain'], ['unbal', 'Ad-hoc tree'], ['htree', 'H-tree']], tb = {};
    TOP.forEach(function (t) { tb[t[0]] = L.btn(t[1], '', function () { cfg.topo = t[0]; draw(); }); row.appendChild(tb[t[0]]); });
    var row2 = L.h('div', 'l7-grid2'); body.appendChild(row2);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); row2.appendChild(c1); row2.appendChild(c2);
    var lvl = L.slider(c1, 'H-tree buffer levels', 1, 3, 1, cfg.levels, null, function (v) { cfg.levels = v; draw(); });
    var bBal = L.btn('Balance branches (add delay): OFF', '', function () { cfg.balance = !cfg.balance; draw(); }); c2.appendChild(bBal);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      TOP.forEach(function (t) { tb[t[0]].classList.toggle('is-on', cfg.topo === t[0]); });
      bBal.innerHTML = 'Balance branches (add delay): ' + (cfg.balance ? 'ON' : 'OFF'); bBal.classList.toggle('is-on', cfg.balance);
      tried[cfg.topo] = 1;
      var r = build(cfg), o = '', mx = Math.max.apply(null, r.lat), mn = Math.min.apply(null, r.lat);
      r.segs.forEach(function (g) { o += '<path d="M' + g[0][0] + ' ' + g[0][1] + 'H' + g[1][0] + 'V' + g[1][1] + '" class="' + (g[2] === 'off' ? 'w-thin' : 'wv-clk') + '" fill="none"/>'; });
      r.bufs.forEach(function (b) { o += '<path d="M' + (b[0] - 9) + ' ' + (b[1] - 9) + 'l18 9l-18 9z" fill="#5856d6"/>'; });
      o += R(SRC[0] - 18, SRC[1] - 16, 36, 32, 'box-cu', 6) + T(SRC[0], SRC[1] + 5, 'CLK', 't-ink t-b t-sm');
      SINK.forEach(function (s, k) {
        var late = r.lat[k] === mx, early = r.lat[k] === mn;
        o += R(s[0] - 15, s[1] - 12, 30, 24, late ? 'box-bad' : early ? 'box-cu' : 'box-on', 5) + T(s[0], s[1] + 5, 'FF', 't-ink t-b t-sm');
        o += T(s[0], s[1] + (s[1] < 160 ? -18 : 30), r.lat[k].toFixed(0), late ? 't-bad t-b t-sm' : 't-dim t-sm');
      });
      pic.innerHTML = S(600, 300, o, 'Clock tree');
      var skOk = r.skew <= 5, buOk = r.nbuf <= 12;
      out.innerHTML = '<span class="k">Clock arrival at the 8 groups</span> ' + Math.round(mn) + ' … ' + Math.round(mx) + ' units · <span class="k">skew (imbalance)</span> <span class="' + (skOk ? 'v' : 'c') + '">' + r.skew.toFixed(1) + '</span> (target ≤ 5)' +
        '<br><span class="k">Buffers</span> <span class="' + (buOk ? 'v' : 'c') + '">' + r.nbuf + '</span>' + (r.delayCells ? ' (incl. ' + r.delayCells + ' balancing delay cells)' : '') + ' · <span class="k">insertion delay</span> ' + Math.round(r.ins) + ' · <span class="k">clock wire</span> ' + Math.round(r.wl) +
        '<br><span class="k">Clock edges</span> <span class="' + (r.slew ? 'v' : 'c') + '">' + (r.slew ? 'sharp – every driver has ≤ 4 loads' : 'slow – a driver has too many loads') + '</span>';
      var p = [];
      if (!r.slew) p.push('One driver feeds more than 4 loads: the clock edge becomes slow and varies from sink to sink. Add buffer levels.');
      if (!skOk) p.push('Branches have very different lengths / buffer counts, so the clock arrives at different times (skew ' + r.skew.toFixed(1) + '). Use a symmetric structure or balance the branches.');
      if (!buOk) p.push(r.nbuf + ' buffers: too many – every buffer costs area and switches every cycle (power).');
      verdict.className = 'l7-verdict ' + (p.length ? 'bad' : 'ok');
      verdict.innerHTML = p.length ? '⚠️ Clock tree needs work<small>' + p.join('<br>') + '</small>' : '✅ Good clock tree<small>Balanced arrival (skew ' + r.skew.toFixed(1) + '), sharp edges and only ' + r.nbuf + ' buffers. ' + (cfg.topo === 'htree' ? 'The symmetric H-tree balances itself; only the short local stubs differ.' : 'Balancing works, but costs delay cells – a symmetric tree needs fewer.') + '</small>';
      if (!p.length && !done && Object.keys(tried).length >= 2) { done = true; api.done(); }
      else if (!p.length && !done) verdict.innerHTML += '<small>Compare at least one other structure to complete the lab.</small>';
    }
    draw();
  }

  function hFrame(k) {
    var o = '', segs = [];
    segs.push([[30, 110], [300, 110]]);
    if (k >= 1) segs.push([[160, 110], [440, 110]]);
    if (k >= 2) segs.push([[160, 60], [160, 160]], [[440, 60], [440, 160]]);
    if (k >= 3) segs.push([[110, 60], [210, 60]], [[110, 160], [210, 160]], [[390, 60], [490, 60]], [[390, 160], [490, 160]]);
    segs.forEach(function (s) { o += P('M' + s[0][0] + ' ' + s[0][1] + 'L' + s[1][0] + ' ' + s[1][1], 'wv-clk'); });
    o += R(12, 98, 36, 24, 'box-cu', 5) + T(30, 115, 'CLK', 't-ink t-b t-sm');
    if (k >= 3) [[110, 60], [210, 60], [110, 160], [210, 160], [390, 60], [490, 60], [390, 160], [490, 160]].forEach(function (p) { o += R(p[0] - 10, p[1] - 8, 20, 16, 'box-on', 3); });
    o += T(300, 196, ['The clock enters the centre of the region', 'Split into two equal branches (the "H" crossbar)', 'Each branch splits again, vertically', 'and again: every endpoint is the same distance from the source'][k], 't-vio t-b t-sm');
    return S(600, 206, o, 'H-tree');
  }

  L.module({
    n: 5,
    lead: 'One clock net must reach thousands of flip-flops spread over the whole chip – at nearly the same moment, with sharp edges. Clock tree synthesis builds that physical network of buffers and wires after placement.',
    tags: ['why clock trees', 'source & sinks', 'clock buffers', 'tree structures', 'H-tree', 'balancing', 'insertion delay', 'clock-tree quality'],
    sections: [
      {
        id: 'c-why', type: 'concept', title: 'Why a clock tree is needed', nav: 'Why CTS?',
        html: '<p>Before CTS the clock is an ideal net: one driver connected to every flip-flop. Physically that is impossible – a single driver cannot charge the capacitance of thousands of clock pins and kilometres of wire, and far-away flip-flops would see the edge much later.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Source</h4><p>the clock port or PLL output (root)</p></div><div class="l7-box vio"><h4>Buffers</h4><p>special clock buffers/inverters that re-drive the signal in stages</p></div><div class="l7-box cu"><h4>Sinks</h4><p>clock pins of flip-flops, latches and macros (leaves)</p></div></div>' +
          '<p style="margin-top:12px">(Skew, latency and their effect on setup/hold timing were covered in Level 8. Here we build the network physically.)</p>'
      },
      {
        id: 'st-h', type: 'steps', title: 'Animation: building an H-tree', nav: 'H-tree',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Route the clock to the centre of the area.', 'Split it into two identical halves.', 'Split each half again – perpendicular.', 'After log₂(N) levels every sink group is reached through identical paths, so arrival times match by construction.'][k], svg: hFrame(k) }; })
      },
      { id: 'w-cts', type: 'widget', title: 'Clock tree lab', nav: 'CTS lab', intro: 'Try the four structures, the buffer levels and balancing. Reach skew ≤ 5, sharp edges and ≤ 12 buffers – and compare at least two structures.', build: ctsLab },
      {
        id: 'c-struct', type: 'concept', title: 'Clock tree structures', nav: 'Structures',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Structure</th><th>Idea</th><th>Strength</th><th>Weakness</th></tr>' +
          '<tr><td>Buffered tree (CTS default)</td><td>tool clusters sinks and builds a buffer tree, then balances it</td><td>flexible, adapts to any placement</td><td>needs balancing cells</td></tr>' +
          '<tr><td>H-tree</td><td>recursive symmetric splitting</td><td>inherently balanced</td><td>rigid, wastes wire when sinks are irregular</td></tr>' +
          '<tr><td>Clock mesh</td><td>a grid driven at many points</td><td>very low skew, robust to variation</td><td>high power and wiring</td></tr>' +
          '<tr><td>Spine / fishbone</td><td>central trunk with branches</td><td>simple, regular</td><td>skew along the spine</td></tr></table></div>'
      },
      {
        id: 'c-qual', type: 'concept', title: 'Clock-tree quality and physical considerations', nav: 'Quality',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Quality metrics</h4><ul><li>skew (difference in arrival)</li><li>insertion delay (source to sinks)</li><li>transition (edge sharpness)</li><li>buffer count and clock power</li><li>clock wire length</li></ul></div><div class="l7-box"><h4>Physical practices</h4><ul><li>route clock nets on upper metals with extra width and spacing (shielding)</li><li>use dedicated clock buffers / inverters</li><li>clock gating cells sit inside the tree (Level 8)</li><li>keep the tree away from congested regions</li></ul></div></div>'
      },
      {
        id: 'rv-5', type: 'reveal', title: 'Click to reveal: CTS insights', nav: 'Reveal',
        items: [
          { q: 'Why is CTS done after placement?', a: 'The tree must reach the actual positions of the flip-flops; before placement those are unknown.' },
          { q: 'Why not just use one huge buffer?', a: 'The wire to far sinks is long and resistive: far sinks would still see a slow, late edge. Distributed buffers fix both.' },
          { q: 'What does "balancing" mean physically?', a: 'Adding buffers, delay cells or extra wire (snaking) to faster branches so all sinks see the edge at the same time.' },
          { q: 'Why is clock power so high?', a: 'Clock nets switch every cycle and have the largest total capacitance on the chip.' },
          { q: 'Why shield clock wires?', a: 'Neighbouring signal wires can couple noise into the clock (crosstalk); spacing/shielding keeps edges clean.' },
          { q: 'What is insertion delay?', a: 'The delay from the clock source to the flip-flop clock pins through the tree.' }
        ]
      },
      {
        id: 'dd-5', type: 'drag', title: 'Drag & drop: clock-tree terms', nav: 'Drag & drop',
        bins: ['Source / root', 'Buffer level', 'Sink / leaf'],
        items: [['PLL output', 0], ['Clock input port', 0], ['Clock buffer re-driving a branch', 1], ['Clock inverter pair', 1], ['Flip-flop clock pin', 2], ['Memory macro clock pin', 2]]
      },
      {
        id: 'calc5', type: 'calc', title: 'Clock-tree calculations', nav: 'Calculate',
        items: [
          { q: 'A binary tree must reach 1024 sinks with each buffer driving 2 loads. How many levels?', a: 10, h: '2^levels = 1024.', s: '<b>10</b> levels.' },
          { q: 'With fan-out 4 per buffer, how many levels for 4096 sinks?', a: 6, h: '4^6 = 4096.', s: '<b>6</b>.' },
          { q: 'Buffers in a full fan-out-4 tree reaching 64 sinks (levels with buffers: 1 + 4 + 16)?', a: 21, h: 'Sum the buffer levels.', s: '1 + 4 + 16 = <b>21</b> buffers driving 64 sinks.' },
          { q: 'Arrival times at four sinks: 210, 215, 208, 221 ps. Skew (ps)?', a: 13, h: 'max − min.', s: '221 − 208 = <b>13 ps</b>.' },
          { q: 'Each buffer adds 18 ps and wires add 40 ps on a path with 5 buffers. Insertion delay (ps)?', a: 130, h: '5 × 18 + 40.', s: '<b>130 ps</b>.' }
        ]
      },
      {
        id: 'mcq5', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'CTS is performed…', o: ['after placement', 'before floorplanning', 'after GDSII', 'in RTL'], a: 0, w: '' },
          { q: 'An H-tree mainly provides…', o: ['equal path lengths to sinks', 'fewer pins', 'lower IR drop', 'fewer metal layers'], a: 0, w: '' },
          { q: 'A clock driver with too many loads produces…', o: ['slow clock edges', 'faster edges', 'lower power', 'fewer buffers'], a: 0, w: '' },
          { q: 'Balancing a tree typically adds…', o: ['delay cells or wire to fast branches', 'more flip-flops', 'power pads', 'macros'], a: 0, w: '' }
        ]
      },
      {
        id: 'short5', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Why is a clock tree necessary, and what does CTS try to achieve?', k: ['thousands|many|flip-flop|sink', 'load|capacitance|drive', 'buffer', 'skew|balance|same time', 'transition|edge'], m: 'A single clock driver cannot drive the huge capacitance of thousands of flip-flop clock pins and long wires, and distant sinks would see late, slow edges. CTS builds a tree of clock buffers and wires that reaches every sink with balanced arrival times (low skew), sharp transitions, reasonable insertion delay, and minimum buffers, wire and power.' },
          { q: 'Compare an H-tree with a tool-built buffered clock tree.', k: ['symmetric|equal|h-tree', 'balanc', 'flexib|irregular|placement', 'wire|power'], m: 'An H-tree is a recursive symmetric structure with equal path lengths to every endpoint, so it is inherently balanced, but it is rigid and wastes wire when sinks are irregularly placed. A tool-built buffered tree clusters the real sink positions and adds buffers where needed, adapting to any placement, but must be balanced afterwards with delay cells or wire.' }
        ]
      },
      {
        id: 'scen5', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'After CTS, the report shows 40 ps skew between flip-flops at opposite corners and very slow transitions at the leaves.', q: 'What should be adjusted?', o: [{ t: 'Add buffer levels (lower fan-out) and rebalance the branches', ok: true, w: 'Fix both drive strength and balance.' }, { t: 'Remove all clock buffers', ok: false, w: 'Worse.' }, { t: 'Increase utilisation', ok: false, w: 'Unrelated.' }] },
          { s: 'A huge clock tree consumes 35 % of the chip\'s power.', q: 'Which physical change reduces it without losing balance?', o: [{ t: 'Cluster sinks better, avoid unnecessary buffer levels and over-sized buffers (and use clock gating from Level 8)', ok: true, w: 'Fewer, right-sized buffers and shorter clock wire.' }, { t: 'Use a full clock mesh', ok: false, w: 'Meshes use more power.' }, { t: 'Make every buffer bigger', ok: false, w: 'More power.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Clock sinks are…', o: ['flip-flop clock pins', 'power pads', 'I/O pins', 'routing tracks'], a: 0, w: '' },
      { d: 'Easy', q: 'CTS inserts…', o: ['clock buffers', 'scan cells', 'filler cells only', 'macros'], a: 0, w: '' },
      { d: 'Easy', q: 'Skew in a clock tree is…', o: ['difference in clock arrival between sinks', 'the clock period', 'the number of buffers', 'the clock frequency'], a: 0, w: '' },
      { d: 'Medium', q: 'Fan-out 2 tree for 256 sinks needs…', o: ['6 levels', '8 levels', '16 levels', '128 levels'], a: 1, w: '' },
      { d: 'Medium', q: 'Arrivals 300, 312, 305 ps → skew =', o: ['7 ps', '12 ps', '5 ps', '305 ps'], a: 1, w: '' },
      { d: 'Medium', q: 'A daisy-chained clock has…', o: ['large skew', 'zero skew', 'no buffers', 'no wire'], a: 0, w: '' },
      { d: 'Medium', q: 'Clock nets are often routed…', o: ['on upper metals with extra spacing/shielding', 'only on polysilicon', 'after GDSII', 'with minimum width always'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is an H-tree inherently balanced?', o: ['all paths from the root have equal length and the same number of buffers', 'it uses no buffers', 'it is routed on metal 1', 'it has one sink'], a: 0, w: '' },
      { d: 'Hard', q: 'Balancing a tree costs…', o: ['extra delay cells / wire and power', 'nothing', 'fewer flip-flops', 'lower insertion delay'], a: 0, w: '' },
      { d: 'Hard', q: 'A clock mesh is chosen when…', o: ['very low skew and robustness justify high power', 'area must be minimal', 'there is no clock', 'power is critical'], a: 0, w: '' }
    ]
  });
})();
