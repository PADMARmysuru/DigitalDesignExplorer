/* Level 13 · Module 8 – Memory & Interconnect Architecture */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Widget: memory hierarchy explorer ---------- */
  function memLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Memory hierarchy explorer · average memory access time (AMAT)</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var c = { h1: 80, h2: 50, l2: true, l3: false, h3: 60 }, done = false;
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Latencies</span> registers 0.3 ns · L1 1 ns · L2 4 ns · L3 12 ns · DRAM 80 ns · SSD 80,000 ns<br><span class="k">Goal</span> AMAT ≤ 3 ns'));
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'L1 hit rate', 50, 99, 1, c.h1, function (v) { return v + ' %'; }, function (v) { c.h1 = v; draw(); });
    L.slider(c1, 'L2 local hit rate', 10, 95, 1, c.h2, function (v) { return v + ' %'; }, function (v) { c.h2 = v; draw(); });
    L.slider(c2, 'L3 local hit rate', 10, 95, 1, c.h3, function (v) { return v + ' %'; }, function (v) { c.h3 = v; draw(); });
    var bl2 = L.btn('L2 cache: ON', 'is-on', function () { c.l2 = !c.l2; draw(); }); c2.appendChild(bl2);
    var bl3 = L.btn('L3 cache: OFF', '', function () { c.l3 = !c.l3; draw(); }); c2.appendChild(bl3);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      bl2.innerHTML = 'L2 cache: ' + (c.l2 ? 'ON' : 'OFF'); bl2.classList.toggle('is-on', c.l2);
      bl3.innerHTML = 'L3 cache: ' + (c.l3 ? 'ON' : 'OFF'); bl3.classList.toggle('is-on', c.l3);
      var mem = 80, below = mem;
      if (c.l3) below = 12 + (1 - c.h3 / 100) * mem;
      var afterL1 = c.l2 ? 4 + (1 - c.h2 / 100) * below : below;
      var amat = 1 + (1 - c.h1 / 100) * afterL1;
      var lv = [['Registers', '0.3 ns', '~1 KB', 1], ['L1 cache', '1 ns', '32–64 KB', 1], ['L2 cache', '4 ns', '256 KB–2 MB', c.l2], ['L3 cache', '12 ns', '8–64 MB', c.l3], ['DRAM', '80 ns', '8–64 GB', 1], ['Storage (SSD)', '80 µs', 'TBs', 1]], o = '';
      lv.forEach(function (x, i) { var w = 160 + i * 60, X = 300 - w / 2; o += '<rect x="' + X + '" y="' + (10 + i * 32) + '" width="' + w + '" height="28" rx="6" fill="' + (x[3] ? ['#5856d6', '#0071e3', '#00a7c4', '#34c759', '#d48a00', '#8e8e93'][i] : '#e8e8ed') + '" opacity="' + (x[3] ? 0.85 : 1) + '"/>' + T(300, 29 + i * 32, x[0] + ' · ' + x[1] + ' · ' + x[2], x[3] ? 't-sm' : 't-dim t-sm').replace('class="', x[3] ? 'fill="#fff" class="' : 'class="'); });
      o += T(300, 214, 'faster, smaller, costlier per byte  ↑      ↓  slower, larger, cheaper', 't-dim t-sm');
      pic.innerHTML = S(600, 224, o, 'Memory hierarchy');
      var ok = amat <= 3;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'bad');
      verdict.innerHTML = 'AMAT = ' + amat.toFixed(2) + ' ns<small>AMAT = L1 time + L1 miss rate × (L2 time + L2 miss rate × (…)). ' + (ok ? '✅ Goal met – each level catches most misses of the one above, so the slow DRAM is rarely visited.' : 'Too slow: improve hit rates or add a cache level.') + '</small>';
      if (ok && !done && c.h1 < 99) { done = true; api.done(); mark('mem'); }
    }
    draw();
  }

  /* ---------- Widget: NoC routing explorer ---------- */
  function nocLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Network-on-chip routing explorer · 4 × 4 mesh</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var src = [0, 3], dst = [3, 0], mode = 'xy', hot = false, pick = 'src', seen = {}, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var bs = L.btn('Tap a router to set: SOURCE', 'pri', function () { pick = pick === 'src' ? 'dst' : 'src'; draw(); }); row.appendChild(bs);
    L.select(row, 'Routing', [['xy', 'XY (dimension-ordered)'], ['ad', 'Adaptive (avoid congestion)']], mode, function (v) { mode = v; draw(); });
    var bh = L.btn('Congested link: OFF', '', function () { hot = !hot; draw(); }); row.appendChild(bh);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    var HOT = [[1, 3], [2, 3]];   // congested link on the bottom row
    function isHot(a, b) { return hot && ((a[0] === HOT[0][0] && a[1] === HOT[0][1] && b[0] === HOT[1][0] && b[1] === HOT[1][1]) || (b[0] === HOT[0][0] && b[1] === HOT[0][1] && a[0] === HOT[1][0] && a[1] === HOT[1][1])); }
    function route() {
      var p = [src.slice()], cur = src.slice();
      function step(dx, dy) { var n = [cur[0] + dx, cur[1] + dy]; p.push(n); cur = n; }
      if (mode === 'xy') { while (cur[0] !== dst[0]) step(cur[0] < dst[0] ? 1 : -1, 0); while (cur[1] !== dst[1]) step(0, cur[1] < dst[1] ? 1 : -1); }
      else {
        while (cur[0] !== dst[0] || cur[1] !== dst[1]) {
          var opts = [];
          if (cur[0] !== dst[0]) opts.push([cur[0] < dst[0] ? 1 : -1, 0]);
          if (cur[1] !== dst[1]) opts.push([0, cur[1] < dst[1] ? 1 : -1]);
          var good = opts.filter(function (d) { return !isHot(cur, [cur[0] + d[0], cur[1] + d[1]]); });
          var d = (good.length ? good : opts)[0]; step(d[0], d[1]);
        }
      }
      return p;
    }
    function draw() {
      bs.innerHTML = 'Tap a router to set: ' + (pick === 'src' ? 'SOURCE' : 'DESTINATION');
      bh.innerHTML = 'Congested link: ' + (hot ? 'ON' : 'OFF'); bh.classList.toggle('is-on', hot);
      var p = route(), o = '', G = 110, X0 = 60, Y0 = 30, lat = 0, hits = 0;
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) { if (x < 3) o += '<line x1="' + (X0 + x * G) + '" y1="' + (Y0 + y * G * 0.6) + '" x2="' + (X0 + (x + 1) * G) + '" y2="' + (Y0 + y * G * 0.6) + '" stroke="' + (isHot([x, y], [x + 1, y]) ? '#ff3b30' : '#d2d2d7') + '" stroke-width="' + (isHot([x, y], [x + 1, y]) ? 6 : 3) + '"/>'; if (y < 3) o += '<line x1="' + (X0 + x * G) + '" y1="' + (Y0 + y * G * 0.6) + '" x2="' + (X0 + x * G) + '" y2="' + (Y0 + (y + 1) * G * 0.6) + '" stroke="#d2d2d7" stroke-width="3"/>'; }
      for (var i = 1; i < p.length; i++) { var a = p[i - 1], b = p[i]; if (isHot(a, b)) hits++; o += '<line x1="' + (X0 + a[0] * G) + '" y1="' + (Y0 + a[1] * G * 0.6) + '" x2="' + (X0 + b[0] * G) + '" y2="' + (Y0 + b[1] * G * 0.6) + '" stroke="#0071e3" stroke-width="5" stroke-linecap="round"/>'; }
      for (y = 0; y < 4; y++) for (x = 0; x < 4; x++) { var isS = x === src[0] && y === src[1], isD = x === dst[0] && y === dst[1]; o += '<g class="click" data-x="' + x + '" data-y="' + y + '"><rect x="' + (X0 + x * G - 16) + '" y="' + (Y0 + y * G * 0.6 - 16) + '" width="32" height="32" rx="7" fill="' + (isS ? '#34c759' : isD ? '#ff9500' : '#fff') + '" stroke="#1d1d1f"/>' + T(X0 + x * G, Y0 + y * G * 0.6 + 5, isS ? 'S' : isD ? 'D' : (y * 4 + x), 't-ink t-b t-sm') + '</g>'; }
      pic.innerHTML = S(460, 236, o, 'Mesh NoC');
      L.$$('g.click', pic).forEach(function (gr) { gr.addEventListener('click', function () { var c = [+gr.getAttribute('data-x'), +gr.getAttribute('data-y')]; if (pick === 'src') { src = c; pick = 'dst'; } else { dst = c; pick = 'src'; } draw(); }); });
      var hops = p.length - 1; lat = hops * 3 + hits * 12;
      seen[mode + (hot ? 'H' : '') + (hits ? 'X' : '')] = 1;
      if (src[0] !== 0 || src[1] !== 3 || dst[0] !== 3 || dst[1] !== 0) seen.moved = 1;
      var ok = seen.moved && seen.xyHX && seen.adH;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'warn');
      verdict.innerHTML = 'Hops ' + hops + ' · latency ≈ ' + lat + ' cycles (3 per hop' + (hits ? ' + 12 waiting at the congested link' : '') + ')<small>' + (ok ? '✅ XY routing is simple and deadlock-free but cannot avoid a congested link; adaptive routing picks another minimal path.' : 'Tasks: move the source/destination; turn on the congested link with XY routing so the packet crosses it; then switch to adaptive routing.') + '</small>';
      if (ok && !done) { done = true; api.done(); mark('noc'); }
    }
    draw();
  }
  var marks = {};
  function mark(k) { marks[k] = 1; }

  function busFrame(k) {
    var o = '';
    if (k === 0) { o += P('M40 90H560', 'w-on'); ['CPU', 'GPU', 'DMA', 'Memory', 'I/O'].forEach(function (n, i) { o += R(50 + i * 105, 30, 80, 36, 'box-on', 6) + T(90 + i * 105, 53, n, 't-ink t-b t-sm') + P('M' + (90 + i * 105) + ' 66V90', 'w-on'); }); o += T(300, 130, 'Shared bus: one transfer at a time – an arbiter decides who goes next', 't-vio t-b t-sm'); }
    else { for (var y = 0; y < 3; y++) for (var x = 0; x < 4; x++) { o += R(60 + x * 130, 14 + y * 38, 34, 26, 'box-on', 5); if (x < 3) o += P('M' + (94 + x * 130) + ' ' + (27 + y * 38) + 'H' + (190 + x * 130), 'w'); if (y < 2) o += P('M' + (77 + x * 130) + ' ' + (40 + y * 38) + 'V' + (52 + y * 38), 'w'); } o += T(300, 140, 'Network-on-chip: routers and links – many transfers in parallel', 't-vio t-b t-sm'); }
    return S(600, 150, o, 'Interconnect');
  }

  L.module({
    n: 8,
    lead: 'A fast core is useless if data cannot reach it. Explore the memory hierarchy from registers to storage, how latency and bandwidth trade against size and cost, and how on-chip interconnects – buses and networks-on-chip – move data between many cores.',
    tags: ['memory hierarchy', 'registers', 'cache', 'DRAM', 'storage', 'latency', 'bandwidth', 'bus', 'arbitration', 'interconnect', 'NoC'],
    sections: [
      {
        id: 'c-hier', type: 'concept', title: 'The memory hierarchy', nav: 'Hierarchy',
        html: '<div class="l7-eq">AMAT = hit time(L1) + miss rate(L1) × [hit time(L2) + miss rate(L2) × (… + memory time)]</div><p><b>Latency</b> = time for one access; <b>bandwidth</b> = data per second. DRAM has high bandwidth but long latency; caches hide the latency by keeping the working set close.</p>'
      },
      { id: 'w-mem', type: 'widget', title: 'Memory hierarchy explorer', nav: 'Hierarchy explorer', intro: 'Adjust hit rates and cache levels until the average memory access time is at most 3 ns (without assuming a 99 % L1 hit rate).', build: memLab },
      {
        id: 'st-bus', type: 'steps', title: 'Animation: bus vs network-on-chip', nav: 'Bus vs NoC',
        frames: [0, 1].map(function (k) { return { t: ['A <b>shared bus</b> is simple, but only one master can transfer at a time; <b>arbitration</b> (priority, round-robin) decides who.', 'A <b>network-on-chip</b> connects routers with point-to-point links, so many transfers happen at once – essential for many-core chips.'][k], svg: busFrame(k) }; })
      },
      { id: 'w-noc', type: 'widget', title: 'NoC routing explorer', nav: 'NoC explorer', intro: 'Route packets across the mesh. Compare XY and adaptive routing when a link is congested.', build: nocLab },
      {
        id: 'rv-8', type: 'reveal', title: 'Click to reveal: memory & interconnect insights', nav: 'Reveal',
        items: [
          { q: 'Why is XY routing popular?', a: 'It is simple and provably deadlock-free on a mesh, because packets never turn from Y back to X.' },
          { q: 'What is the "memory wall"?', a: 'Processor speed grew much faster than DRAM latency improved, so memory access dominates performance.' },
          { q: 'Why do GPUs care about bandwidth more than latency?', a: 'They hide latency with thousands of threads but need huge data throughput.' },
          { q: 'What does an arbiter do?', a: 'Grants the shared resource to one requester at a time according to a policy (fixed priority, round-robin).' }
        ]
      },
      {
        id: 'dd-8', type: 'drag', title: 'Drag & drop: latency or bandwidth?', nav: 'Drag & drop',
        bins: ['Latency', 'Bandwidth'],
        items: [['80 ns to get the first byte from DRAM', 0], ['1 ns L1 hit time', 0], ['25.6 GB/s memory channel', 1], ['512-bit-wide data path', 1], ['3 cycles per NoC hop', 0]]
      },
      {
        id: 'calc8', type: 'calc', title: 'Memory calculations', nav: 'Calculate',
        items: [
          { q: 'L1 1 ns, 95 % hit; memory 80 ns (no L2). AMAT (ns)?', a: 5, h: '1 + 0.05 × 80.', s: '<b>5 ns</b>.' },
          { q: 'Add an L2: 4 ns, 80 % local hit rate. AMAT (ns)?', a: 2, h: '1 + 0.05 × (4 + 0.2 × 80).', s: '<b>2 ns</b>.' },
          { q: 'XY route from (0,0) to (3,2): hops?', a: 5, h: '3 + 2.', s: '<b>5</b>.' }
        ]
      },
      {
        id: 'mcq8', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Which level is fastest?', o: ['registers', 'L2', 'DRAM', 'SSD'], a: 0, w: '' },
          { q: 'An arbiter is needed on…', o: ['a shared bus', 'a register', 'an ALU', 'a cache line'], a: 0, w: '' },
          { q: 'XY routing first moves…', o: ['along X, then Y', 'along Y, then X', 'randomly', 'diagonally'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen8', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A 64-core chip uses a single shared bus; cores spend most of their time waiting for the bus.', q: 'Architectural fix?', o: [{ t: 'Replace the bus with a network-on-chip', ok: true, w: 'Parallel links scale with core count.' }, { t: 'Faster ALUs', ok: false, w: 'Not the bottleneck.' }, { t: 'Remove caches', ok: false, w: 'Worse.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Moving down the hierarchy, memories get…', o: ['larger and slower', 'smaller and faster', 'faster and larger', 'unchanged'], a: 0, w: '' },
      { d: 'Easy', q: 'Bandwidth measures…', o: ['data transferred per second', 'time for one access', 'storage size', 'clock rate'], a: 0, w: '' },
      { d: 'Easy', q: 'NoC stands for…', o: ['network-on-chip', 'number of cores', 'node of cache', 'net of clocks'], a: 0, w: '' },
      { d: 'Medium', q: 'L1 2 ns, 90 % hits, memory 60 ns: AMAT =', o: ['8 ns', '6 ns', '62 ns', '2 ns'], a: 0, w: '' },
      { d: 'Medium', q: 'Round-robin arbitration…', o: ['gives each requester a turn in sequence', 'always favours one master', 'is random', 'needs no state'], a: 0, w: '' },
      { d: 'Medium', q: 'A bus allows… transfers at a time', o: ['one', 'unlimited', 'two always', 'none'], a: 0, w: '' },
      { d: 'Medium', q: 'Adaptive routing can…', o: ['avoid congested links', 'never deadlock without care', 'increase hop count always', 'remove routers'], a: 0, w: '' },
      { d: 'Hard', q: 'Adding an L2 helps AMAT most when…', o: ['L1 misses often go to slow DRAM', 'L1 hit rate is 100 %', 'DRAM is fast', 'the bus is idle'], a: 0, w: '' },
      { d: 'Hard', q: 'XY routing is deadlock-free because…', o: ['packets never turn from Y back to X', 'links are wide', 'it is adaptive', 'it has no buffers'], a: 0, w: '' },
      { d: 'Hard', q: 'The memory wall refers to…', o: ['the growing gap between processor and DRAM speed', 'a physical wall', 'cache size limits', 'bus width'], a: 0, w: '' }
    ]
  });
})();
