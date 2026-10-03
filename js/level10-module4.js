/* Level 10 · Module 4 – Placement */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var COLS = 7, ROWS = 4, W = 66, H = 54, OX = 70, OY = 30;
  var PINS = { IN1: [-1, 0], IN2: [-1, 3], OUT1: [7, 0], OUT2: [7, 3] };
  var CELLS = 'ABCDEFGHIJ'.split('');
  var NETS = [['IN1', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'OUT1'], ['A', 'D'], ['D', 'C'], ['IN2', 'E'], ['E', 'F'], ['F', 'G'], ['G', 'OUT2'], ['E', 'H'], ['H', 'G'], ['D', 'H'], ['I', 'B'], ['I', 'F'], ['J', 'C'], ['J', 'G']];
  var TARGET = 38, CAP = 4.6;           // shortest possible wire length is 30 – but that placement is congested

  function metrics(pos) {
    var placed = CELLS.filter(function (c) { return pos[c]; }), wl = 0, dem = [], y, x;
    for (y = 0; y < ROWS; y++) { dem.push([]); for (x = 0; x < COLS; x++) dem[y].push(0); }
    NETS.forEach(function (n) {
      var a = pos[n[0]] || PINS[n[0]], b = pos[n[1]] || PINS[n[1]];
      if (!a || !b) return;
      wl += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
      var x0 = Math.max(0, Math.min(a[0], b[0])), x1 = Math.min(COLS - 1, Math.max(a[0], b[0])), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
      var area = (x1 - x0 + 1) * (y1 - y0 + 1), w = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + 1) / area;
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) dem[y][x] += w;
    });
    placed.forEach(function (c) { dem[pos[c][1]][pos[c][0]] += 0.35; });
    var mx = 0, hot = 0;
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) { mx = Math.max(mx, dem[y][x]); if (dem[y][x] > CAP) hot++; }
    return { wl: wl, dem: dem, max: mx, hot: hot, placed: placed.length };
  }

  /* ---------- Widget: placement board ---------- */
  function placeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Placement board · 10 cells, 4 rows, 17 nets</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var pos = {}, sel = null, done = false;
    body.appendChild(L.h('p', 'l7-hint', 'Tap a cell (in the tray or on the board), then tap a free site. Tapping an occupied site swaps the two cells. Connected cells should sit close together – but not all crammed into one spot.'));
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('🎲 Random global placement', 'ghost', function () { var s = []; for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) s.push([x, y]); s.sort(function () { return Math.random() - 0.5; }); pos = {}; CELLS.forEach(function (c, i) { pos[c] = s[i]; }); sel = null; draw(); }));
    row.appendChild(L.btn('Clear board', 'ghost', function () { pos = {}; sel = null; draw(); }));
    var tray = L.h('div', 'l7-row'); body.appendChild(tray);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function at(x, y) { return CELLS.filter(function (c) { return pos[c] && pos[c][0] === x && pos[c][1] === y; })[0]; }
    function tapSite(x, y) {
      if (!sel) { var c = at(x, y); if (c) { sel = c; draw(); } return; }
      var other = at(x, y);
      if (other === sel) { sel = null; draw(); return; }
      if (other) { if (pos[sel]) { pos[other] = pos[sel]; } else delete pos[other]; }
      pos[sel] = [x, y]; sel = null; draw();
    }
    function col(d) { var t = Math.min(1, d / (CAP * 1.4)); return 'rgba(' + Math.round(52 + 203 * t) + ',' + Math.round(199 - 140 * t) + ',' + Math.round(89 - 40 * t) + ',' + (0.12 + 0.45 * t) + ')'; }
    function draw() {
      var m = metrics(pos), o = '';
      tray.innerHTML = '';
      CELLS.forEach(function (c) {
        var b = L.btn(c + (pos[c] ? ' ✓' : ''), c === sel ? 'is-on' : pos[c] ? '' : 'pri', function () { sel = sel === c ? null : c; draw(); });
        b.style.minWidth = '46px'; tray.appendChild(b);
      });
      for (var y = 0; y < ROWS; y++) {
        o += R(OX - 4, OY + y * H - 2, COLS * W + 8, H - 2, 'box', 6) + T(OX - 12, OY + y * H + H / 2, 'row ' + (y + 1), 't-dim t-sm', 'end');
        for (var x = 0; x < COLS; x++) o += '<rect class="pl-site" data-x="' + x + '" data-y="' + y + '" x="' + (OX + x * W + 2) + '" y="' + (OY + y * H + 2) + '" width="' + (W - 4) + '" height="' + (H - 8) + '" rx="5" fill="' + col(m.dem[y][x]) + '" style="cursor:pointer"/>';
      }
      NETS.forEach(function (n) {
        var pa = pos[n[0]] || PINS[n[0]], pb = pos[n[1]] || PINS[n[1]];
        if (!pa || !pb) return;                       // one end not placed yet
        var ax = OX + (pa[0] + 0.5) * W, ay = OY + (pa[1] + 0.45) * H, bx = OX + (pb[0] + 0.5) * W, by = OY + (pb[1] + 0.45) * H;
        o += '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="#0071e3" stroke-width="1.4" opacity=".55"/>';
      });
      Object.keys(PINS).forEach(function (p) { var q = PINS[p], px = OX + (q[0] + 0.5) * W, py = OY + (q[1] + 0.45) * H; o += R(px - 22, py - 11, 44, 22, 'box-cu', 4) + T(px, py + 5, p, 't-ink t-b t-sm'); });
      CELLS.forEach(function (c) { if (!pos[c]) return; var cx = OX + pos[c][0] * W, cy = OY + pos[c][1] * H; o += '<rect x="' + (cx + 12) + '" y="' + (cy + 9) + '' + '" width="' + (W - 24) + '" height="' + (H - 22) + '" rx="5" fill="' + (c === sel ? '#1d1d1f' : '#34c759') + '" pointer-events="none"/>' + T(cx + W / 2, cy + H / 2 + 1, c, 't-b').replace('class="', 'pointer-events="none" fill="#fff" class="'); });
      pic.innerHTML = S(COLS * W + 150, ROWS * H + 50, o, 'Placement board');
      L.$$('rect.pl-site', pic).forEach(function (r) { r.addEventListener('click', function () { tapSite(+r.getAttribute('data-x'), +r.getAttribute('data-y')); }); });
      out.innerHTML = '<span class="k">Placed</span> ' + m.placed + ' / 10 · <span class="k">utilisation</span> ' + Math.round(100 * m.placed / (COLS * ROWS)) + ' % of sites' +
        '<br><span class="k">Total wire length (Manhattan)</span> <span class="' + (m.wl <= TARGET && m.placed === 10 ? 'v' : 'c') + '">' + m.wl + '</span> (target ≤ ' + TARGET + ')' +
        '<br><span class="k">Congestion</span> peak demand ' + m.max.toFixed(2) + ' (capacity ' + CAP + ') · <span class="' + (m.hot ? 'c' : 'v') + '">' + m.hot + ' overflowing site' + (m.hot === 1 ? '' : 's') + '</span>' +
        '<br><span class="k">Map</span> green = free routing resources · red = more wires than tracks';
      var probs = [];
      if (m.placed < 10) probs.push((10 - m.placed) + ' cell' + (10 - m.placed > 1 ? 's' : '') + ' still unplaced.');
      if (m.placed === 10 && m.wl > TARGET) probs.push('Wire length ' + m.wl + ' > ' + TARGET + ': connected cells are far apart (long wires = more delay, power and routing).');
      if (m.hot) probs.push(m.hot + ' congested site' + (m.hot > 1 ? 's' : '') + ': too many nets cross the same area – spread the cells a little or separate unrelated groups.');
      verdict.className = 'l7-verdict ' + (probs.length ? (m.placed < 10 ? 'warn' : 'bad') : 'ok');
      verdict.innerHTML = probs.length ? (m.placed < 10 ? '🧩 Placement in progress' : '⚠️ Placement can be improved') + '<small>' + probs.join('<br>') + '</small>' : '✅ Legal, compact and routable placement<small>No overlaps (each site holds one cell), short wires (' + m.wl + ') and no congestion. The very shortest placement (30) is too congested – good placement balances wire length against routability, exactly as real placers do.</small>';
      if (!probs.length && !done) { done = true; api.done(); }
    }
    draw();
  }

  /* ---------- Widget: legalisation ---------- */
  function legalLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Global placement → legalisation → detailed placement</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var stage = 0, done = false;
    var cells = [[0.6, 0.4, 'A'], [1.1, 0.6, 'B'], [1.3, 1.3, 'C'], [2.9, 0.2, 'D'], [3.2, 0.5, 'E'], [3.0, 1.6, 'F'], [4.6, 1.2, 'G'], [4.8, 1.4, 'H']];
    var legal = [[0, 0], [1, 0], [1, 1], [3, 0], [4, 0], [3, 1], [5, 1], [6, 1]];
    var detail = [[0, 0], [1, 0], [2, 1], [3, 0], [4, 0], [3, 1], [5, 1], [6, 1]];
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var btns = ['1. Global placement', '2. Legalisation', '3. Detailed placement'].map(function (t, i) { var b = L.btn(t, i ? '' : 'is-on', function () { stage = i; draw(); }); row.appendChild(b); return b; });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var seen = {};
    function draw() {
      seen[stage] = 1; btns.forEach(function (b, i) { b.classList.toggle('is-on', i === stage); });
      var o = '', CW = 70, RH = 60, ox = 40, oy = 26;
      for (var r = 0; r < 2; r++) { o += R(ox, oy + r * RH, 8 * CW, RH - 6, 'box', 4) + T(ox - 8, oy + r * RH + 30, 'row ' + (r + 1), 't-dim t-sm', 'end'); for (var s = 1; s < 8; s++) o += '<line x1="' + (ox + s * CW) + '" x2="' + (ox + s * CW) + '" y1="' + (oy + r * RH) + '" y2="' + (oy + r * RH + RH - 6) + '" stroke="#e8e8ed"/>'; }
      cells.forEach(function (c, i) {
        var x, y, cls = 'box-on';
        if (stage === 0) { x = ox + c[0] * CW; y = oy + c[1] * RH * 0.75; cls = 'box-cu'; }
        else { var p = (stage === 1 ? legal : detail)[i]; x = ox + p[0] * CW + 6; y = oy + p[1] * RH + 4; }
        o += R(x, y, CW - 12, RH - 14, cls, 6) + T(x + (CW - 12) / 2, y + 28, c[2], 't-ink t-b');
      });
      if (stage === 0) o += T(ox + 4 * CW, oy + 2 * RH + 18, 'cells overlap and sit between rows – fine for estimating wire length, illegal for manufacturing', 't-bad t-sm');
      if (stage === 2) o += '<path d="M' + (ox + 1.5 * CW) + ' ' + (oy + RH + 20) + 'q20 -30 ' + (CW - 6) + ' 0" class="w-on" fill="none"/>' + T(ox + 2 * CW, oy + 2 * RH + 18, 'C moved one site right: shorter wire to D, still legal', 't-ok t-sm');
      pic.innerHTML = S(8 * CW + 60, 2 * RH + 34, o, 'Placement stages');
      L.fb(fb, 'info', ['<b>Global placement</b> spreads cells to minimise total wire length, treating them almost like points – overlaps and off-row positions are allowed.', '<b>Legalisation</b> snaps every cell onto a row and a site with no overlaps, moving each as little as possible.', '<b>Detailed placement</b> makes small local moves and swaps that shorten wires or fix timing, keeping everything legal.'][stage] + (Object.keys(seen).length === 3 ? ' 🎉 All three steps seen.' : ''));
      if (Object.keys(seen).length === 3 && !done) { done = true; api.done(); }
    }
    draw();
  }

  function cgFrame(k) {
    var o = '', g = [[1, 1, 2, 1, 1, 1], [1, 3, 4, 2, 1, 1], [1, 2, 4, 3, 1, 1], [1, 1, 2, 1, 1, 1]];
    var g2 = [[1, 2, 2, 2, 1, 1], [1, 2, 2, 2, 2, 1], [1, 2, 2, 2, 2, 1], [1, 1, 2, 1, 1, 1]];
    var m = k < 2 ? g : g2;
    m.forEach(function (row, y) { row.forEach(function (v, x) { var t = Math.min(1, (v - 1) / 3); o += '<rect x="' + (60 + x * 60) + '" y="' + (20 + y * 36) + '" width="56" height="32" rx="4" fill="rgba(' + Math.round(52 + 203 * t) + ',' + Math.round(199 - 140 * t) + ',' + Math.round(89 - 40 * t) + ',.6)"/>' + T(88 + x * 60, 41 + y * 36, (k === 0 ? '' : v), 't-ink t-b t-sm'); }); });
    o += T(470, 70, ['Cells clustered tightly', 'Numbers = wires wanting to pass', 'Spread the cluster slightly…', '…and the hot spot disappears'][k], 't-vio t-b t-sm', 'start');
    o += T(470, 94, ['around a busy net', 'capacity here: 2 per tile', 'with a density limit', 'at a small wire-length cost'][k], 't-dim t-sm', 'start');
    return S(640, 172, o, 'Congestion map');
  }

  L.module({
    n: 4,
    lead: 'Placement decides the exact position of every standard cell. Good placement keeps connected cells close (short wires), leaves room for routing (no congestion) and keeps every cell on a legal row site without overlaps.',
    tags: ['global placement', 'legalisation', 'detailed placement', 'density', 'overlaps', 'congestion', 'wire length', 'placement optimisation'],
    sections: [
      {
        id: 'c-what', type: 'concept', title: 'What placement does', nav: 'Placement concept',
        html: '<p>After floorplanning and power planning, placement assigns every standard cell of the netlist to a <b>site</b> in a <b>row</b>. Its main goals:</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Short wires</h4><p>minimise total wire length (estimated as half-perimeter or Manhattan distance)</p></div><div class="l7-box cu"><h4>Routability</h4><p>avoid congestion hot spots where more wires want to pass than tracks exist</p></div><div class="l7-box vio"><h4>Legality and timing</h4><p>no overlaps, on rows, power-rail aligned; critical paths kept short</p></div></div>'
      },
      { id: 'w-leg', type: 'widget', title: 'Global placement → legalisation → detailed placement', nav: 'Placement steps', intro: 'Step through the three placement stages.', build: legalLab },
      {
        id: 'c-steps', type: 'concept', title: 'Global, legal and detailed placement', nav: 'Three stages',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Stage</th><th>What happens</th><th>Allowed</th></tr>' +
          '<tr><td>Global placement</td><td>analytic/force-directed spreading to minimise wire length under a density limit</td><td>overlaps, off-row positions</td></tr>' +
          '<tr><td>Legalisation</td><td>snap cells to rows and sites, remove all overlaps with minimal movement</td><td>nothing illegal</td></tr>' +
          '<tr><td>Detailed placement</td><td>local swaps, shifts and mirroring to improve wire length and timing</td><td>only legal moves</td></tr>' +
          '<tr><td>Placement optimisation</td><td>timing-driven buffering and resizing with real positions (Module 9)</td><td>small netlist changes</td></tr></table></div>'
      },
      { id: 'w-place', type: 'widget', title: 'Placement board', nav: 'Placement board', intro: 'Place all ten cells. Reach a wire length of 38 or less with no congested (red) sites. Hint: the very shortest arrangement is too crowded – spread it slightly.', build: placeLab },
      {
        id: 'st-cong', type: 'steps', title: 'Animation: reading a congestion map', nav: 'Congestion map',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['A cluster of highly connected cells placed very tightly.', 'Each tile has a limited number of routing tracks. Where demand exceeds capacity the router will fail (overflow).', 'Placement tools apply a density limit (e.g. 70 % per region) to spread such clusters.', 'Spreading costs a little wire length but makes the design routable.'][k], svg: cgFrame(k) }; })
      },
      {
        id: 'c-dens', type: 'concept', title: 'Density, overlaps and congestion', nav: 'Density',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>Placement density</h4><p>The fraction of a region filled with cells. Even with 70 % overall utilisation, a local region at 98 % can be impossible to route.</p></div><div class="l7-box vio"><h4>Congestion</h4><p>Routing demand / routing capacity per tile (global-routing cell). Above 100 % = overflow → detours, DRC violations or unroutable nets.</p></div></div>' +
          '<p style="margin-top:12px"><b>Remedies at placement time:</b> density limits, cell padding (extra space around complex cells with many pins), spreading hot spots, keeping unrelated logic apart, and placement blockages in narrow channels.</p>'
      },
      {
        id: 'rv-4', type: 'reveal', title: 'Click to reveal: placement insights', nav: 'Reveal',
        items: [
          { q: 'Why can\'t cells be placed anywhere?', a: 'Cells have a fixed height and power pins on top and bottom; they must sit on a row, aligned to sites, so their pins and rails line up.' },
          { q: 'What is HPWL?', a: 'Half-perimeter wire length: half the perimeter of the bounding box of a net\'s pins – a fast estimate of its routed length.' },
          { q: 'Why not pack all connected cells into one corner?', a: 'Very short wires, but all their wires compete for the same tracks – congestion.' },
          { q: 'What is cell flipping in a row?', a: 'Cells in alternate rows are mirrored vertically so VDD and VSS rails are shared between neighbouring rows.' },
          { q: 'What are filler cells?', a: 'Cells with no logic inserted into empty sites after placement to keep wells and rails continuous.' },
          { q: 'What is timing-driven placement?', a: 'Placement that gives critical nets extra weight so their cells are pulled closer together.' }
        ]
      },
      {
        id: 'dd-4', type: 'drag', title: 'Drag & drop: which placement step?', nav: 'Drag & drop',
        bins: ['Global placement', 'Legalisation', 'Detailed placement'],
        items: [['Spread cells to minimise total wire length', 0], ['Overlaps temporarily allowed', 0], ['Snap cells onto rows and sites', 1], ['Remove all overlaps with minimum movement', 1], ['Swap two neighbouring cells to shorten a net', 2], ['Mirror a cell to improve pin access', 2]]
      },
      {
        id: 'calc4', type: 'calc', title: 'Placement calculations', nav: 'Calculate',
        items: [
          { q: 'Two pins at (2, 3) and (7, 1). Manhattan wire length?', a: 7, h: '|7−2| + |1−3|.', s: '5 + 2 = <b>7</b>.' },
          { q: 'A net has pins at (0,0), (4,1) and (2,5). What is its HPWL?', a: 9, h: '(xmax−xmin) + (ymax−ymin).', s: '4 + 5 = <b>9</b>.' },
          { q: 'A region of 400 sites holds 368 cell sites. Local density (%)?', a: 92, h: '368/400.', s: '<b>92 %</b> – probably congested.' },
          { q: 'A tile has 20 tracks and 26 nets want to cross it. Overflow (nets)?', a: 6, h: 'demand − capacity.', s: '<b>6</b>.' },
          { q: 'In the placement board, the best possible wire length is 30. What is the target as a percentage above it (one decimal)?', a: 26.7, tol: 0.01, h: '38/30 − 1.', s: '<b>26.7 %</b>.' }
        ]
      },
      {
        id: 'mcq4', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Legalisation…', o: ['removes overlaps and snaps cells to rows', 'routes nets', 'builds the clock tree', 'writes GDSII'], a: 0, w: '' },
          { q: 'A congestion map shows…', o: ['routing demand vs capacity', 'IR drop', 'clock skew', 'cell delay'], a: 0, w: '' },
          { q: 'Packing highly connected cells too tightly causes…', o: ['congestion', 'IR drop only', 'antenna violations only', 'nothing'], a: 0, w: '' },
          { q: 'Detailed placement makes…', o: ['small legal local moves and swaps', 'the floorplan', 'masks', 'the netlist'], a: 0, w: '' }
        ]
      },
      {
        id: 'short4', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Describe the three main steps of placement.', k: ['global', 'legal', 'detail', 'overlap|row|site'], m: 'Global placement spreads the cells to minimise total wire length under a density target, allowing overlaps; legalisation snaps every cell to a legal row/site and removes overlaps with minimal movement; detailed placement improves the result with local swaps, shifts and flips while keeping it legal.' },
          { q: 'Explain the conflict between short wire length and congestion in placement.', k: ['close|short|cluster', 'track|capacity|demand', 'congest|overflow', 'spread|density'], m: 'Minimising wire length pulls connected cells tightly together, but then all their wires compete for the limited tracks in a small area, creating congestion and overflow. Placers therefore use density limits and spread hot spots, accepting slightly longer wires to keep the design routable.' }
        ]
      },
      {
        id: 'scen4', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Overall utilisation is 68 %, but the congestion map shows a red region around a large multiplier.', q: 'What helps most at placement?', o: [{ t: 'A local density limit / cell padding to spread the multiplier\'s cells', ok: true, w: 'Fix the local density.' }, { t: 'Lower the global utilisation to 50 %', ok: false, w: 'Wastes area everywhere.' }, { t: 'Add straps', ok: false, w: 'More blockage.' }] },
          { s: 'After legalisation, a critical path got longer because two of its cells were pushed apart.', q: 'Which step should recover it?', o: [{ t: 'Timing-driven detailed placement (and optimisation)', ok: true, w: 'Local moves for the critical cells.' }, { t: 'Floorplanning', ok: false, w: 'Too drastic.' }, { t: 'GDSII export', ok: false, w: 'Too late.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Placement positions…', o: ['standard cells', 'masks', 'RTL', 'pins in the package'], a: 0, w: '' },
      { d: 'Easy', q: 'Cells must be placed on…', o: ['rows and sites', 'anywhere', 'the I/O ring', 'top metal'], a: 0, w: '' },
      { d: 'Easy', q: 'Global placement may temporarily allow…', o: ['overlaps', 'shorts', 'opens', 'DRC errors in GDSII'], a: 0, w: '' },
      { d: 'Medium', q: 'Pins (1,1) and (4,5): Manhattan length =', o: ['5', '7', '9', '3'], a: 1, w: '' },
      { d: 'Medium', q: 'Overflow happens when…', o: ['routing demand exceeds capacity', 'utilisation is low', 'cells are legal', 'the clock is slow'], a: 0, w: '' },
      { d: 'Medium', q: 'Cell padding is used to…', o: ['leave space around pin-dense cells', 'add power pads', 'pad the netlist', 'increase utilisation'], a: 0, w: '' },
      { d: 'Medium', q: 'HPWL of pins (0,0), (3,2), (1,4) =', o: ['5', '7', '9', '3'], a: 1, w: '3 + 4.' },
      { d: 'Hard', q: 'Why can a design with 65 % utilisation still be unroutable?', o: ['local density hot spots', 'too many pins', 'low IR drop', 'short wires'], a: 0, w: '' },
      { d: 'Hard', q: 'Timing-driven placement…', o: ['weights critical nets so their cells are closer', 'removes the clock', 'ignores wire length', 'writes SDC'], a: 0, w: '' },
      { d: 'Hard', q: 'Filler cells are inserted…', o: ['in empty sites after placement', 'before floorplanning', 'into the RTL', 'into the package'], a: 0, w: '' }
    ]
  });
})();
