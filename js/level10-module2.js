/* Level 10 · Module 2 – Floorplanning */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var C = 12, Rw = 8, CELL = 40, OX = 40, OY = 40;          // core grid: 12 × 8 sites
  var SIDES = [['N', 'North (top)'], ['E', 'East (right)'], ['S', 'South (bottom)'], ['W', 'West (left)']];

  /* ---------- Widget: floorplan lab ---------- */
  function floorLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Floorplan lab · move macros, place pins, set utilisation</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var M = [
      { id: 'A', name: 'SRAM A', w: 3, h: 2, io: 'mem', x: 3, y: 3, col: '#5856d6' },
      { id: 'B', name: 'SRAM B', w: 3, h: 2, io: 'mem', x: 6, y: 3, col: '#5856d6' },
      { id: 'P', name: 'PLL', w: 2, h: 2, io: 'clk', x: 5, y: 0, col: '#ff9500' }
    ];
    var pins = { mem: 'N', clk: 'W', io: 'N' }, util = 92, sel = 'A', best = false;
    var PINS = [['mem', 'Memory bus pins (to SRAM A and B)'], ['clk', 'Clock input (to PLL)'], ['io', 'GPIO pins (to standard-cell logic)']];

    body.appendChild(L.h('p', 'l7-hint', 'Select a macro, then tap the core where its top-left corner should go. Set the side for each pin group and the core utilisation.'));
    var mrow = L.h('div', 'l7-row'); body.appendChild(mrow);
    var mbtn = {};
    M.forEach(function (m) { mbtn[m.id] = L.btn('Move ' + m.name, '', function () { sel = m.id; draw(); }); mrow.appendChild(mbtn[m.id]); });
    var prow = L.h('div', 'l7-row'); body.appendChild(prow);
    PINS.forEach(function (pg) { L.select(prow, pg[1], SIDES, pins[pg[0]], function (v) { pins[pg[0]] = v; draw(); }); });
    var srow = L.h('div', ''); body.appendChild(srow);
    L.slider(srow, 'Core utilisation (standard cells / free placement area)', 50, 95, 1, util, function (v) { return v + ' %'; }, function (v) { util = v; draw(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);

    function onEdge(m) { return m.x === 0 || m.y === 0 || m.x + m.w === C || m.y + m.h === Rw; }
    function faces(m, side) { return side === 'N' ? m.y === 0 : side === 'S' ? m.y + m.h === Rw : side === 'W' ? m.x === 0 : m.x + m.w === C; }
    function overlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
    function occ(x, y) { return M.filter(function (m) { return x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h; })[0]; }
    function narrowCells() {
      var set = {};
      for (var y = 0; y < Rw; y++) for (var x = 0; x < C; x++) {
        if (occ(x, y)) continue;
        var hl = 0, hr = 0, vu = 0, vd = 0, i;
        for (i = x - 1; i >= 0 && !occ(i, y); i--) hl++; var lb = i >= 0 || false;
        for (i = x + 1; i < C && !occ(i, y); i++) hr++; var rb = i < C;
        for (i = y - 1; i >= 0 && !occ(x, i); i--) vu++; var ub = i >= 0;
        for (i = y + 1; i < Rw && !occ(x, i); i++) vd++; var db = i < Rw;
        // a gap only 1 site wide between a macro and something (macro or core edge)
        if ((hl + hr + 1 <= 1 && (lb || rb)) || (vu + vd + 1 <= 1 && (ub || db))) set[x + ',' + y] = 1;
      }
      return set;
    }
    function analyse() {
      var issues = [], good = [], narrow = narrowCells(), nNarrow = Object.keys(narrow).length;
      M.forEach(function (m) {
        if (!onEdge(m)) issues.push(m.name + ' sits in the middle of the core: standard-cell routes must detour around it on all sides.');
        else if (!faces(m, pins[m.io])) issues.push(m.name + ' does not face its pins (' + pins[m.io] + ' side): its connections must cross the whole core.');
        else good.push(m.name + ' on the edge facing its pins');
      });
      if (pins.io === pins.mem) issues.push('GPIO pins share the ' + pins.io + ' side with the memory bus: too many pins crowd one edge.');
      if (nNarrow) issues.push(nNarrow + ' site' + (nNarrow > 1 ? 's' : '') + ' in 1-site-wide channels: too narrow to route through, wasted for placement.');
      if (util > 85) issues.push('Utilisation ' + util + ' %: too dense – not enough free space for routing and optimisation.');
      if (util < 60) issues.push('Utilisation ' + util + ' %: lots of empty core – the die is larger (and more expensive) than needed.');
      return { issues: issues, narrow: narrow, nNarrow: nNarrow };
    }
    function heat(x, y, a) {
      var h = util / 100 * 0.6;
      if (a.narrow[x + ',' + y]) h += 0.45;
      M.forEach(function (m) {
        var dx = Math.max(m.x - x, 0, x - (m.x + m.w - 1)), dy = Math.max(m.y - y, 0, y - (m.y + m.h - 1)), d = dx + dy;
        if (!onEdge(m) && d === 1) h += 0.25;
        if (!faces(m, pins[m.io])) {
          var cx = m.x + m.w / 2, cy = m.y + m.h / 2, side = pins[m.io];
          var onPath = side === 'N' ? (Math.abs(x + 0.5 - cx) < 1.6 && y < m.y) : side === 'S' ? (Math.abs(x + 0.5 - cx) < 1.6 && y >= m.y + m.h) : side === 'W' ? (Math.abs(y + 0.5 - cy) < 1.6 && x < m.x) : (Math.abs(y + 0.5 - cy) < 1.6 && x >= m.x + m.w);
          if (onPath) h += 0.3;
        }
      });
      return Math.min(1, h);
    }
    function color(h) { var r = Math.round(52 + 203 * h), g = Math.round(199 - 140 * h), b = Math.round(89 - 40 * h); return 'rgba(' + r + ',' + g + ',' + b + ',' + (0.18 + 0.5 * h) + ')'; }
    function draw() {
      M.forEach(function (m) { mbtn[m.id].classList.toggle('is-on', m.id === sel); });
      var a = analyse(), o = '';
      o += R(4, 4, C * CELL + 72, Rw * CELL + 72, 'box', 10) + T(16, 22, 'die', 't-dim t-sm', 'start');
      o += '<rect x="' + OX + '" y="' + OY + '" width="' + C * CELL + '" height="' + Rw * CELL + '" fill="none" stroke="#1d1d1f" stroke-width="1.5"/>';
      for (var y = 0; y < Rw; y++) for (var x = 0; x < C; x++) {
        if (occ(x, y)) continue;
        o += '<rect class="fp-cell" data-x="' + x + '" data-y="' + y + '" x="' + (OX + x * CELL + 1) + '" y="' + (OY + y * CELL + 1) + '" width="' + (CELL - 2) + '" height="' + (CELL - 2) + '" rx="3" fill="' + color(heat(x, y, a)) + '" style="cursor:pointer"/>';
        if (a.narrow[x + ',' + y]) o += T(OX + x * CELL + CELL / 2, OY + y * CELL + CELL / 2 + 5, '✕', 't-bad t-b t-sm');
      }
      M.forEach(function (m) {
        o += '<rect x="' + (OX + m.x * CELL + 2) + '" y="' + (OY + m.y * CELL + 2) + '" width="' + (m.w * CELL - 4) + '" height="' + (m.h * CELL - 4) + '" rx="6" fill="' + m.col + '" opacity="' + (m.id === sel ? 0.95 : 0.75) + '" stroke="' + (m.id === sel ? '#1d1d1f' : 'none') + '" stroke-width="2"/>';
        o += T(OX + (m.x + m.w / 2) * CELL, OY + (m.y + m.h / 2) * CELL + 5, m.name, 't-b t-sm').replace('class="', 'fill="#fff" class="');
      });
      PINS.forEach(function (pg, k) {
        var side = pins[pg[0]], n = 3, lab = pg[0] === 'mem' ? 'MEM' : pg[0] === 'clk' ? 'CLK' : 'GPIO';
        var same = PINS.filter(function (q) { return pins[q[0]] === side; }).map(function (q) { return q[0]; }), slot = same.indexOf(pg[0]), cnt = same.length;
        for (var i = 0; i < (pg[0] === 'clk' ? 1 : n); i++) {
          var t = (slot + (i + 1) / ((pg[0] === 'clk' ? 1 : n) + 1)) / cnt, px, py;
          if (side === 'N' || side === 'S') { px = OX + t * C * CELL; py = side === 'N' ? OY - 14 : OY + Rw * CELL + 14; }
          else { py = OY + t * Rw * CELL; px = side === 'W' ? OX - 14 : OX + C * CELL + 14; }
          o += '<rect x="' + (px - 6) + '" y="' + (py - 6) + '" width="12" height="12" rx="2" fill="' + (pg[0] === 'clk' ? '#ff9500' : pg[0] === 'mem' ? '#5856d6' : '#34c759') + '"/>';
        }
        var lx = side === 'W' ? OX - 30 : side === 'E' ? OX + C * CELL + 30 : OX + ((slot + 0.5) / cnt) * C * CELL, ly = side === 'N' ? OY - 26 : side === 'S' ? OY + Rw * CELL + 34 : OY + ((slot + 0.5) / cnt) * Rw * CELL - 14;
        o += T(lx, ly, lab, 't-ink t-b t-sm');
      });
      pic.innerHTML = S(C * CELL + 80, Rw * CELL + 80, o, 'Floorplan');
      L.$$('rect.fp-cell', pic).forEach(function (r) {
        r.addEventListener('click', function () {
          var m = M.filter(function (q) { return q.id === sel; })[0], nx = Math.min(+r.getAttribute('data-x'), C - m.w), ny = Math.min(+r.getAttribute('data-y'), Rw - m.h);
          var test = { x: nx, y: ny, w: m.w, h: m.h };
          if (M.some(function (q) { return q !== m && overlap(test, q); })) { L.fb(fb, 'bad', 'Macros cannot overlap – choose another position.'); return; }
          m.x = nx; m.y = ny; draw();
        });
      });
      var macroSites = M.reduce(function (s, m) { return s + m.w * m.h; }, 0), free = C * Rw - macroSites - a.nNarrow;
      out.innerHTML = '<span class="k">Core</span> ' + C * Rw + ' sites · <span class="k">macros</span> ' + macroSites + ' · <span class="k">usable for standard cells</span> <span class="v">' + free + '</span> · <span class="k">wasted (narrow channels)</span> <span class="' + (a.nNarrow ? 'c' : 'v') + '">' + a.nNarrow + '</span>' +
        '<br><span class="k">Standard-cell demand at ' + util + ' %</span> ' + Math.round(free * util / 100) + ' sites · <span class="k">routing headroom</span> ' + (100 - util) + ' %<br><span class="k">Heat map</span> green = easy to route · red = congested';
      verdict.className = 'l7-verdict ' + (a.issues.length ? 'bad' : 'ok');
      verdict.innerHTML = a.issues.length ? '⚠️ ' + a.issues.length + ' floorplan problem' + (a.issues.length > 1 ? 's' : '') + '<small>' + a.issues.join('<br>') + '</small>' : '✅ Good floorplan<small>Macros on the edges facing their pins, no narrow channels, pins spread out, utilisation in the 60–85 % sweet spot. Placement and routing now have a fair chance.</small>';
      if (!a.issues.length && !best) { best = true; api.done(); }
    }
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    draw();
  }

  function fpFrame(k) {
    var o = '';
    o += R(30, 20, 300, 170, 'box', 8) + T(40, 36, 'die', 't-dim t-sm', 'start');
    if (k >= 1) o += '<rect x="60" y="45" width="240" height="120" fill="none" stroke="#1d1d1f" stroke-width="1.5"/>' + T(66, 60, 'core', 't-dim t-sm', 'start');
    if (k >= 1) for (var i = 0; i < 8; i++) o += '<line x1="60" x2="300" y1="' + (45 + i * 15) + '" y2="' + (45 + i * 15) + '" stroke="#d2d2d7"/>';
    if (k >= 2) for (var j = 0; j < 10; j++) o += '<rect x="' + (70 + j * 24) + '" y="24" width="10" height="10" rx="2" fill="#34c759"/>';
    if (k >= 3) o += '<rect x="62" y="47" width="70" height="44" rx="4" fill="#5856d6" opacity=".8"/><rect x="228" y="47" width="70" height="44" rx="4" fill="#5856d6" opacity=".8"/>';
    if (k >= 4) o += '<rect x="56" y="43" width="80" height="52" fill="none" stroke="#ff2d55" stroke-dasharray="4 3"/><rect x="132" y="47" width="10" height="44" fill="rgba(255,45,85,.18)"/>';
    o += T(350, 60, ['1. The die: the whole piece of silicon', '2. Core: where cells go, divided into rows', '3. I/O pins (or pads) around the edge', '4. Macros placed first, at the edges', '5. Halos / keep-outs and blockages'][k], 't-vio t-b t-sm', 'start');
    o += T(350, 84, ['including the I/O ring', 'rows have the height of one standard cell', 'positions agreed with the package', 'big, fixed blocks: RAMs, PLLs, IPs', 'protect macro pins and routing'][k], 't-dim t-sm', 'start');
    return S(600, 200, o, 'Floorplan elements');
  }

  L.module({
    n: 2,
    lead: 'The floorplan decides where everything big goes before a single standard cell is placed: the size and shape of the chip, where the pins are, where the memories and IP blocks sit. A good floorplan makes every later step easier; a bad one cannot be rescued by any tool.',
    tags: ['die & core', 'utilisation', 'aspect ratio', 'rows', 'I/O placement', 'macro placement', 'blockages & halos', 'floorplan quality'],
    sections: [
      {
        id: 'st-fp', type: 'steps', title: 'Animation: building a floorplan', nav: 'Floorplan elements',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['The <b>die</b> is the rectangle of silicon. Its size sets the cost.', 'The <b>core</b> holds the logic; it is filled with <b>rows</b> of standard-cell height. The gap between core and die carries the I/O and power ring.', '<b>I/O pins</b> (or pad cells) are placed on the boundary, usually as required by the package.', '<b>Macros</b> – memories, PLLs, analogue IPs – are placed next, normally against the core edges.', '<b>Halos / keep-out</b> regions around macros and <b>blockages</b> reserve space for pins, routing and power.'][k], svg: fpFrame(k) }; })
      },
      {
        id: 'c-util', type: 'concept', title: 'Die, core, utilisation and aspect ratio', nav: 'Utilisation',
        html: '<div class="l7-eq">Core utilisation = total standard-cell (and macro) area / core area      Aspect ratio = core height / core width</div>' +
          '<div class="l7-grid3"><div class="l7-box cu"><h4>Too high (&gt; 85 %)</h4><p>no room for buffers, resizing or routing → congestion, failures</p></div><div class="l7-box ok"><h4>Typical (60–80 %)</h4><p>room to optimise and route</p></div><div class="l7-box sig"><h4>Too low (&lt; 60 %)</h4><p>wasted silicon → larger, more expensive die, longer wires</p></div></div>' +
          '<p style="margin-top:12px">Aspect ratio near 1 (square) usually gives the shortest average wires; packages or neighbouring blocks may force another shape.</p>'
      },
      { id: 'w-fp', type: 'widget', title: 'Floorplan lab', nav: 'Floorplan lab', intro: 'This floorplan has every classic mistake. Move the macros, choose the pin sides and set the utilisation until the verdict says "Good floorplan".', build: floorLab },
      {
        id: 'c-macro', type: 'concept', title: 'Macro and I/O placement guidelines', nav: 'Macro rules',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Macros</h4><ul><li>Place at the core edges, pins facing the core</li><li>Place close to the I/O or logic they talk to</li><li>Avoid narrow channels between macros (or leave them wide enough to route)</li><li>Add a halo for pin access and power</li></ul></div><div class="l7-box"><h4>I/O pins</h4><ul><li>Follow the package / top-level requirements</li><li>Group related signals (buses) together</li><li>Spread pins to avoid crowding one edge</li><li>Keep clock and sensitive analogue pins away from noisy buses</li></ul></div></div>'
      },
      {
        id: 'c-blk', type: 'concept', title: 'Blockages, keep-out regions and floorplan quality', nav: 'Blockages',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Type</th><th>Effect</th><th>Typical use</th></tr>' +
          '<tr><td>Hard placement blockage</td><td>no cells at all</td><td>reserved areas, near sensitive IP</td></tr>' +
          '<tr><td>Soft / partial blockage</td><td>only buffers or a max density</td><td>channels between macros</td></tr>' +
          '<tr><td>Routing blockage</td><td>no wires on chosen layers</td><td>over analogue blocks, under pads</td></tr>' +
          '<tr><td>Halo (keep-out)</td><td>empty ring around a macro</td><td>macro pin access, power hook-up</td></tr></table></div>' +
          '<p><b>Signs of a good floorplan:</b> short estimated wire length, no congestion hot spots, macros not fragmenting the core, utilisation in range, pins matching the package.</p>'
      },
      {
        id: 'rv-2', type: 'reveal', title: 'Click to reveal: floorplanning insights', nav: 'Reveal',
        items: [
          { q: 'Why are macros usually placed at the edges?', a: 'A macro in the middle splits the standard-cell area and forces every route to go around it; at the edge it leaves one continuous region.' },
          { q: 'What is a "channel" between macros?', a: 'The space between two macros (or a macro and the core edge). If it is narrow, few wires fit through it, so it becomes a congestion hot spot or wasted area.' },
          { q: 'Why not use 100 % utilisation?', a: 'Optimisation needs space for buffers and bigger cells, and routing needs empty tracks; a full core cannot be routed.' },
          { q: 'Who decides the pin locations?', a: 'Usually the package designer or the top-level floorplan (for a block); the block floorplan must respect them.' },
          { q: 'What happens if the floorplan is changed late?', a: 'Placement, CTS and routing must be redone – which is why time spent on the floorplan is well invested.' },
          { q: 'What is aspect ratio 2?', a: 'A core twice as tall as it is wide.' }
        ]
      },
      {
        id: 'dd-2', type: 'drag', title: 'Drag & drop: good or poor floorplan decision?', nav: 'Drag & drop',
        bins: ['Good practice', 'Poor floorplanning'],
        items: [['SRAM against the core edge, pins facing the logic', 0], ['Halo around each macro', 0], ['Utilisation about 70 %', 0], ['Memory bus pins next to the memory', 0], ['Two macros with a 1-site gap', 1], ['PLL in the exact centre of the core', 1], ['95 % utilisation to save area', 1], ['All 200 pins on one edge', 1]]
      },
      {
        id: 'calc2', type: 'calc', title: 'Floorplan calculations', nav: 'Calculate',
        items: [
          { q: 'Standard cells 0.21 mm², macros 0.09 mm². For 75 % utilisation, what core area is needed (mm²)?', a: 0.4, tol: 0.01, h: '(0.21 + 0.09) / 0.75.', s: '<b>0.40 mm²</b>.' },
          { q: 'A core is 400 µm wide and 600 µm tall. What is its aspect ratio (height/width)?', a: 1.5, h: '600 / 400.', s: '<b>1.5</b>.' },
          { q: 'A core of 500 µm × 500 µm contains cells of total area 175,000 µm². Utilisation (%)?', a: 70, h: '175,000 / 250,000.', s: '<b>70 %</b>.' },
          { q: 'The core is 500 µm high, rows are 1.4 µm. How many rows (whole)?', a: 357, h: 'floor(500 / 1.4).', s: '<b>357</b>.' },
          { q: 'A macro of 100 × 80 µm gets a 5 µm halo on every side. Total area it blocks (µm²)?', a: 9900, h: '110 × 90.', s: '<b>9900 µm²</b>.' }
        ]
      },
      {
        id: 'mcq2', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Core utilisation is…', o: ['cell area / core area', 'core area / die area', 'number of pins / area', 'routing layers used'], a: 0, w: '' },
          { q: 'Macros are normally placed…', o: ['in the middle', 'at the core edges', 'outside the die', 'randomly'], a: 1, w: '' },
          { q: 'A halo is…', o: ['a keep-out region around a macro', 'a power ring', 'a clock buffer', 'a routing layer'], a: 0, w: '' },
          { q: 'Very high utilisation causes…', o: ['congestion and routing failures', 'a smaller GDSII file only', 'better timing always', 'nothing'], a: 0, w: '' }
        ]
      },
      {
        id: 'short2', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'List three rules for good macro placement and explain why each matters.', k: ['edge|boundary', 'pin|face|close', 'channel|gap|narrow', 'halo|keep-out'], m: 'Place macros at the core edges so they do not split the standard-cell area; orient their pins toward the logic or I/O they connect to and place them close to it to keep nets short; avoid narrow channels between macros (or make them wide enough), which otherwise become congested or wasted; add halos for pin access and power connections.' },
          { q: 'Explain the trade-off in choosing core utilisation.', k: ['high|dense', 'low|empty|waste', 'rout|congest', 'area|cost|die'], m: 'High utilisation means a smaller, cheaper die but leaves little space for buffering, resizing and routing, causing congestion and timing problems. Low utilisation makes routing easy but wastes silicon and lengthens wires. Typical designs use about 60–80 %.' }
        ]
      },
      {
        id: 'scen2', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Placement shows a red congestion hot spot in the 2-site gap between two RAM macros.', q: 'Best floorplan fix?', o: [{ t: 'Abut the RAMs (or widen the gap enough to route) and add a partial blockage in the channel', ok: true, w: 'Remove the narrow channel.' }, { t: 'Increase utilisation', ok: false, w: 'That adds more cells.' }, { t: 'Move the clock pin', ok: false, w: 'Unrelated.' }] },
          { s: 'Your block\'s pins are fixed on the west side by the top level, but its SRAM is on the east edge.', q: 'What happens and what should you do?', o: [{ t: 'Long nets cross the block – move the SRAM to the west edge, facing the pins', ok: true, w: 'Keep macros near what they connect to.' }, { t: 'Nothing – distance does not matter', ok: false, w: 'Long wires cost timing, power and routing.' }, { t: 'Rotate the die', ok: false, w: 'The pins are fixed relative to the die.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The core is…', o: ['the area where cells and macros are placed', 'the package', 'the I/O ring only', 'the metal stack'], a: 0, w: '' },
      { d: 'Easy', q: 'Standard cells are placed in…', o: ['rows', 'columns of pins', 'the I/O ring', 'macros'], a: 0, w: '' },
      { d: 'Easy', q: 'Which is a macro?', o: ['SRAM', 'NAND2', 'via', 'track'], a: 0, w: '' },
      { d: 'Medium', q: 'Cells 60,000 µm² in a 100,000 µm² core: utilisation =', o: ['40 %', '60 %', '75 %', '100 %'], a: 1, w: '' },
      { d: 'Medium', q: 'A narrow channel between macros leads to…', o: ['congestion or wasted area', 'lower power', 'better timing', 'fewer pins'], a: 0, w: '' },
      { d: 'Medium', q: 'A core 300 µm wide and 300 µm high has aspect ratio…', o: ['0.5', '1', '2', '3'], a: 1, w: '' },
      { d: 'Medium', q: 'A routing blockage prevents…', o: ['wires on chosen layers in an area', 'all cells', 'clock buffers only', 'pins'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is a PLL in the centre of the core a poor choice?', o: ['it fragments the standard-cell area and forces detours', 'PLLs must be square', 'it lowers utilisation', 'it removes the clock'], a: 0, w: '' },
      { d: 'Hard', q: 'Target 70 % utilisation with 0.14 mm² of cells needs a core of…', o: ['0.1 mm²', '0.2 mm²', '0.098 mm²', '0.14 mm²'], a: 1, w: '0.14 / 0.7.' },
      { d: 'Hard', q: 'A soft blockage typically allows…', o: ['only buffers or a limited density', 'nothing', 'only macros', 'only pins'], a: 0, w: '' }
    ]
  });
})();
