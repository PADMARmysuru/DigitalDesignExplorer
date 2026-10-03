/* Level 10 · Module 6 – Routing */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var C = 12, RW = 8, G = 44, OX = 20, OY = 20;
  function blocked(x, y) { return x >= 4 && x <= 6 && y >= 2 && y <= 4; }          // macro: both layers
  function vBlocked(x) { return x === 9; }                                          // power strap on M3 (vertical layer)
  var EXIST = { id: 'X', cells: [], col: '#8e8e93' };
  for (var ex = 1; ex <= 10; ex++) EXIST.cells.push([ex, 6]);                       // existing route on M2 (horizontal)
  var NETS = [
    { id: 'N1', a: [1, 0], b: [8, 4], col: '#0071e3' },
    { id: 'N2', a: [2, 7], b: [11, 5], col: '#ff9500' },
    { id: 'N3', a: [0, 4], b: [10, 3], col: '#34c759' }
  ];
  function key(p) { return p[0] + ',' + p[1]; }
  function dirOf(p, q) { return p[1] === q[1] ? 'H' : 'V'; }
  function shortest(n) {                         // BFS ignoring other nets: minimum possible length
    var seen = {}, q = [[n.a, 0]]; seen[key(n.a)] = 1;
    while (q.length) {
      var it = q.shift(), p = it[0];
      if (p[0] === n.b[0] && p[1] === n.b[1]) return it[1];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var np = [p[0] + d[0], p[1] + d[1]];
        if (np[0] < 0 || np[1] < 0 || np[0] >= C || np[1] >= RW || seen[key(np)] || blocked(np[0], np[1])) return;
        if (d[1] && (vBlocked(p[0]))) return;
        seen[key(np)] = 1; q.push([np, it[1] + 1]);
      });
    }
    return 99;
  }

  /* ---------- Widget: routing grid ---------- */
  function routeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Routing grid · horizontal wires on M2, vertical wires on M3, turns need a via</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var paths = {}, cur = 0, done = false;
    NETS.forEach(function (n) { paths[n.id] = [n.a.slice()]; });
    body.appendChild(L.h('p', 'l7-hint', 'Route the selected net: tap the next grid square next to the end of its wire. Tap the previous square to step back. Grey = macro (blocked) · dashed column = power strap on M3 (no vertical wires there) · grey line = existing route on M2.'));
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var nb = NETS.map(function (n, i) { var b = L.btn('Route ' + n.id, '', function () { cur = i; draw(); }); row.appendChild(b); return b; });
    row.appendChild(L.btn('↶ Undo step', 'ghost', function () { var p = paths[NETS[cur].id]; if (p.length > 1) p.pop(); draw(); }));
    row.appendChild(L.btn('Clear this net', 'ghost', function () { paths[NETS[cur].id] = [NETS[cur].a.slice()]; draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function complete(n) { var p = paths[n.id], e = p[p.length - 1]; return e[0] === n.b[0] && e[1] === n.b[1]; }
    function usage(exceptId) {                       // layer use by every other net: {key: {H: id, V: id}}
      var u = {};
      function mark(p, l, id) { var k = key(p); u[k] = u[k] || {}; u[k][l] = id; }
      for (var i = 0; i < EXIST.cells.length - 1; i++) { mark(EXIST.cells[i], 'H', 'existing'); mark(EXIST.cells[i + 1], 'H', 'existing'); }
      NETS.forEach(function (n) {
        if (n.id === exceptId) return;
        var p = paths[n.id];
        for (var j = 0; j < p.length - 1; j++) { var l = dirOf(p[j], p[j + 1]); mark(p[j], l, n.id); mark(p[j + 1], l, n.id); }
      });
      return u;
    }
    function tap(x, y) {
      var n = NETS[cur], p = paths[n.id], end = p[p.length - 1], q = [x, y];
      if (p.length > 1 && p[p.length - 2][0] === x && p[p.length - 2][1] === y) { p.pop(); draw(); return; }
      if (complete(n)) { L.fb(fb, 'info', n.id + ' is already connected. Choose another net, or Undo to change it.'); return; }
      if (Math.abs(end[0] - x) + Math.abs(end[1] - y) !== 1) { L.fb(fb, 'bad', 'Wires grow one square at a time: tap a square next to the end of ' + n.id + '.'); return; }
      if (blocked(x, y)) { L.fb(fb, 'bad', '✗ Routing blockage: that is the macro – no wires on these layers.'); return; }
      if (p.some(function (c) { return c[0] === x && c[1] === y; })) { L.fb(fb, 'bad', '✗ The wire would loop back onto itself.'); return; }
      var d = dirOf(end, q);
      if (d === 'V' && vBlocked(x)) { L.fb(fb, 'bad', '✗ Column ' + x + ' is occupied by a power strap on M3: no vertical wire here. Cross it horizontally on M2.'); return; }
      var u = usage(n.id), clash = [end, q].map(function (c) { return (u[key(c)] || {})[d]; }).filter(Boolean)[0];
      if (clash) { L.fb(fb, 'bad', '✗ Short circuit: ' + (clash === 'existing' ? 'the existing route' : clash) + ' already uses ' + (d === 'H' ? 'M2' : 'M3') + ' here. ' + (d === 'H' ? 'Cross it vertically on M3 instead.' : 'Cross it horizontally on M2 instead.')); return; }
      p.push(q);
      if (complete(n)) L.fb(fb, 'ok', '✓ ' + n.id + ' connected.' + (NETS.every(complete) ? '' : ' Select the next net.'));
      else fb.innerHTML = '';
      if (complete(n) && !NETS.every(complete)) { for (var i = 0; i < NETS.length; i++) if (!complete(NETS[i])) { cur = i; break; } }
      draw();
    }
    function vias(p) { var v = 0; for (var i = 1; i < p.length - 1; i++) if (dirOf(p[i - 1], p[i]) !== dirOf(p[i], p[i + 1])) v++; return v; }
    function draw() {
      nb.forEach(function (b, i) { b.classList.toggle('is-on', i === cur); b.innerHTML = (complete(NETS[i]) ? '✓ ' : '') + 'Route ' + NETS[i].id; });
      var o = '', u = usage(null), x, y;
      for (y = 0; y < RW; y++) for (x = 0; x < C; x++) {
        var k = u[key([x, y])] || {}, both = k.H && k.V;
        o += '<rect class="rt-cell" data-x="' + x + '" data-y="' + y + '" x="' + (OX + x * G + 1) + '" y="' + (OY + y * G + 1) + '" width="' + (G - 2) + '" height="' + (G - 2) + '" rx="4" fill="' + (blocked(x, y) ? '#c7c7cc' : both ? 'rgba(255,149,0,.18)' : '#f5f5f7') + '" style="cursor:pointer"/>';
      }
      o += '<rect x="' + (OX + 9 * G + 4) + '" y="' + OY + '" width="' + (G - 8) + '" height="' + RW * G + '" fill="none" stroke="#5856d6" stroke-dasharray="5 4" pointer-events="none"/>' + T(OX + 9.5 * G, OY + RW * G + 14, 'M3 strap', 't-vio t-sm');
      o += T(OX + 5.5 * G, OY + 3.5 * G + 4, 'MACRO', 't-dim t-b t-sm');
      function line(cells, col, w, dash) { if (cells.length < 2) return ''; return '<polyline points="' + cells.map(function (c) { return (OX + (c[0] + 0.5) * G) + ',' + (OY + (c[1] + 0.5) * G); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
      o += line(EXIST.cells, EXIST.col, 6) + T(OX + 1 * G, OY + 6 * G + 12, 'existing route (M2)', 't-dim t-sm', 'start');
      NETS.forEach(function (n, i) {
        var p = paths[n.id];
        o += line(p, n.col, i === cur ? 7 : 5);
        for (var j = 1; j < p.length - 1; j++) if (dirOf(p[j - 1], p[j]) !== dirOf(p[j], p[j + 1])) o += '<rect x="' + (OX + (p[j][0] + 0.5) * G - 5) + '" y="' + (OY + (p[j][1] + 0.5) * G - 5) + '" width="10" height="10" fill="#1d1d1f" pointer-events="none"/>';
        [n.a, n.b].forEach(function (c, e) { o += '<circle cx="' + (OX + (c[0] + 0.5) * G) + '" cy="' + (OY + (c[1] + 0.5) * G) + '" r="13" fill="' + n.col + '" pointer-events="none"/>' + T(OX + (c[0] + 0.5) * G, OY + (c[1] + 0.5) * G + 4, (e ? 'B' : 'A'), 't-b t-sm').replace('class="', 'fill="#fff" pointer-events="none" class="'); });
        var end = p[p.length - 1];
        if (i === cur && !complete(n)) o += '<circle cx="' + (OX + (end[0] + 0.5) * G) + '" cy="' + (OY + (end[1] + 0.5) * G) + '" r="18" fill="none" stroke="' + n.col + '" stroke-width="2" class="pulse" pointer-events="none"/>';
      });
      pic.innerHTML = S(C * G + 40, RW * G + 44, o, 'Routing grid');
      L.$$('rect.rt-cell', pic).forEach(function (r) { r.addEventListener('click', function () { tap(+r.getAttribute('data-x'), +r.getAttribute('data-y')); }); });
      var tot = 0, tv = 0, min = 0, routed = 0;
      out.innerHTML = NETS.map(function (n) { var p = paths[n.id], len = p.length - 1, s = shortest(n); if (complete(n)) { routed++; tot += len; tv += vias(p); min += s; } return '<span class="k">' + n.id + '</span> ' + (complete(n) ? 'routed · length ' + len + ' (shortest possible ' + s + ') · vias ' + vias(p) : 'not routed yet'); }).join('<br>') +
        '<br><span class="k">Orange squares</span> use both layers – the most crowded places';
      if (routed === NETS.length) {
        var detour = Math.round(100 * (tot - min) / min);
        verdict.className = 'l7-verdict ok';
        verdict.innerHTML = '✅ All nets routed – no shorts, no blockage violations<small>Total length ' + tot + ' (detour ' + detour + ' % over the unobstructed minimum), ' + tv + ' vias. ' + (tv > 8 ? 'Many vias: each adds resistance and is a potential defect – straighter routes are better.' : 'Few vias and short detours: good routing quality.') + '</small>';
        if (!done) { done = true; api.done(); }
      } else { verdict.className = 'l7-verdict warn'; verdict.innerHTML = '🛣️ ' + routed + ' of ' + NETS.length + ' nets routed<small>Every wire must avoid the macro, the M3 strap (vertically) and other wires on the same layer.</small>'; }
    }
    draw();
  }

  function grFrame(k) {
    var o = '';
    for (var y = 0; y < 4; y++) for (var x = 0; x < 6; x++) o += R(60 + x * 70, 20 + y * 40, 66, 36, 'box', 4);
    if (k >= 0) o += R(66, 26, 20, 12, 'box-on', 2) + R(450, 146, 20, 12, 'box-on', 2) + T(76, 52, 'A', 't-ink t-b t-sm') + T(460, 142, 'B', 't-ink t-b t-sm');
    if (k >= 1) o += '<path d="M95 38H340V158H440" fill="none" stroke="#0071e3" stroke-width="16" opacity=".22"/>';
    if (k >= 2) o += '<path d="M76 32H330" fill="none" stroke="#0071e3" stroke-width="3"/><path d="M330 32V152" fill="none" stroke="#ff9500" stroke-width="3"/><path d="M330 152H460" fill="none" stroke="#0071e3" stroke-width="3"/>';
    if (k >= 3) o += '<rect x="325" y="27" width="10" height="10" fill="#1d1d1f"/><rect x="325" y="147" width="10" height="10" fill="#1d1d1f"/>';
    o += T(520, 50, ['Pins to connect', 'Global routing: choose the tiles (gcells)', 'Track assignment + detailed routing', 'Vias where the wire changes layer'][k], 't-vio t-b t-sm', 'start');
    o += T(520, 72, ['A and B are pins of two cells', 'a coarse corridor, checking capacity', 'exact wires on M2 (H) and M3 (V)', 'each turn = one via'][k], 't-dim t-sm', 'start');
    return S(700, 186, o, 'Routing stages');
  }

  L.module({
    n: 6,
    lead: 'Routing turns every connection of the netlist into real metal: wires on many layers joined by vias, obeying spacing and width rules, avoiding blockages and each other. It is where a poor floorplan or placement finally becomes visible.',
    tags: ['global routing', 'detailed routing', 'routing layers', 'tracks', 'vias', 'congestion', 'blockages', 'design rules'],
    sections: [
      {
        id: 'st-route', type: 'steps', title: 'Animation: from pins to wires', nav: 'Routing stages',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Every net has pins on placed cells.', '<b>Global routing</b> divides the chip into tiles (gcells) and plans a corridor for each net, balancing demand against capacity.', '<b>Track assignment</b> and <b>detailed routing</b> place exact wire segments on the routing tracks of each layer.', 'Layers alternate preferred directions (e.g. M2 horizontal, M3 vertical); changing layer needs a <b>via</b>.'][k], svg: grFrame(k) }; })
      },
      {
        id: 'c-layers', type: 'concept', title: 'Routing layers, tracks and vias', nav: 'Layers & vias',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Layers</h4><p>A modern chip has 6–15 metal layers. Lower layers are thin and dense (local routing); upper layers are thick (long nets, clock, power).</p></div><div class="l7-box cu"><h4>Tracks</h4><p>Wires run on predefined tracks at a fixed pitch; each layer has a preferred direction (horizontal or vertical).</p></div><div class="l7-box vio"><h4>Vias</h4><p>Vertical connections between adjacent layers. Each via adds resistance and can fail, so tools minimise them and often double them.</p></div></div>'
      },
      { id: 'w-route', type: 'widget', title: 'Routing grid', nav: 'Routing lab', intro: 'Connect all three nets A → B. Avoid the macro, do not run vertically through the power strap, and never share a layer with another wire in the same square.', build: routeLab },
      {
        id: 'c-cong', type: 'concept', title: 'Routing congestion, blockages and design rules', nav: 'Congestion & rules',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>Congestion and overflow</h4><p>When a region needs more wires than it has tracks, the router detours (longer, slower nets), or leaves overflows that become shorts and DRC violations. Fixes go back to placement (spreading) or the floorplan.</p></div><div class="l7-box"><h4>Routing blockages</h4><p>Areas where some or all layers are reserved: over macros, power straps, analogue blocks, or for later fixes.</p></div><div class="l7-box vio"><h4>Design rules</h4><p>Minimum width, minimum spacing, via enclosure, minimum area and end-of-line rules. The detailed router must obey them all (checked again by DRC, Module 8).</p></div><div class="l7-box sig"><h4>Routing optimisation</h4><p>Search-and-repair loops, wire spreading, via doubling, and moving timing-critical nets to faster upper layers.</p></div></div>'
      },
      {
        id: 'rv-6', type: 'reveal', title: 'Click to reveal: routing insights', nav: 'Reveal',
        items: [
          { q: 'Why do layers have preferred directions?', a: 'Alternating horizontal and vertical layers lets wires cross without touching and packs tracks densely.' },
          { q: 'Why are vias minimised?', a: 'Each via adds resistance, takes space on two layers and is a possible manufacturing defect.' },
          { q: 'What is a gcell?', a: 'A global-routing tile; global routing counts how many wires must cross each gcell edge versus how many tracks it has.' },
          { q: 'Why does congestion hurt timing?', a: 'Congested nets detour, becoming longer and slower, and are packed close to neighbours (crosstalk).' },
          { q: 'What is search-and-repair?', a: 'The detailed router\'s loop of ripping up and rerouting nets around violations until none remain.' },
          { q: 'Why route clock and critical nets on upper metals?', a: 'Upper metals are thicker: lower resistance, so less delay over long distances.' }
        ]
      },
      {
        id: 'dd-6', type: 'drag', title: 'Drag & drop: global or detailed routing?', nav: 'Drag & drop',
        bins: ['Global routing', 'Detailed routing'],
        items: [['Plan a corridor of gcells for each net', 0], ['Estimate congestion per tile', 0], ['Balance demand against capacity', 0], ['Place exact wire segments on tracks', 1], ['Insert vias between layers', 1], ['Fix spacing and width rule violations', 1]]
      },
      {
        id: 'calc6', type: 'calc', title: 'Routing calculations', nav: 'Calculate',
        items: [
          { q: 'A gcell is 2 µm wide and the M2 pitch is 0.1 µm. How many M2 tracks cross it?', a: 20, h: 'width / pitch.', s: '<b>20</b>.' },
          { q: '26 nets must pass a gcell edge with 20 tracks. Overflow?', a: 6, h: 'demand − capacity.', s: '<b>6</b>.' },
          { q: 'A route has 9 segments that alternate H, V, H, V… How many vias?', a: 8, h: 'one per direction change.', s: '<b>8</b>.' },
          { q: 'A via has 4 Ω resistance. A net with 6 vias adds how much resistance (Ω)?', a: 24, h: '6 × 4.', s: '<b>24 Ω</b>.' },
          { q: 'With 6 routing layers alternating H/V starting with horizontal M1, how many vertical layers?', a: 3, h: 'Half of them.', s: '<b>3</b>.' }
        ]
      },
      {
        id: 'mcq6', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A via connects…', o: ['two adjacent metal layers', 'two cells in a row', 'the die to the package', 'two clocks'], a: 0, w: '' },
          { q: 'Global routing…', o: ['plans coarse corridors and checks capacity', 'writes GDSII', 'places cells', 'builds the clock tree'], a: 0, w: '' },
          { q: 'Routing overflow means…', o: ['more wires than tracks in a region', 'too few cells', 'low IR drop', 'a short clock'], a: 0, w: '' },
          { q: 'Upper metal layers are mainly used for…', o: ['long nets, clock and power', 'transistor gates', 'cell internals', 'filler cells'], a: 0, w: '' }
        ]
      },
      {
        id: 'short6', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain the difference between global and detailed routing.', k: ['global|corridor|gcell|tile', 'capacity|congestion', 'detailed|exact|track', 'via|rule|drc'], m: 'Global routing divides the chip into tiles (gcells) and assigns each net a coarse corridor, balancing routing demand against track capacity and estimating congestion. Detailed routing then places the exact wire segments on tracks of each layer and the vias between layers, obeying all spacing and width design rules.' },
          { q: 'Why does routing congestion appear, and how can it be reduced?', k: ['demand|more wires|track', 'dense|cluster|macro|placement', 'spread|density|floorplan', 'layer|detour'], m: 'Congestion appears when a region needs more wires than it has tracks – typically around dense clusters of highly connected cells, pin-dense cells, narrow channels between macros or power straps. It is reduced by spreading cells (density limits, padding), improving the floorplan, removing unnecessary blockages, or using more routing layers.' }
        ]
      },
      {
        id: 'scen6', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Detailed routing ends with 1,200 DRC violations, all in a region where placement density was 95 %.', q: 'What is the most effective fix?', o: [{ t: 'Go back to placement: reduce local density / pad cells, then re-route', ok: true, w: 'The root cause is placement.' }, { t: 'Run the router 10 more times', ok: false, w: 'It cannot create tracks that do not exist.' }, { t: 'Ignore them', ok: false, w: 'The chip would have shorts.' }] },
          { s: 'A long critical net routed on M2 has too much delay.', q: 'Which routing change helps?', o: [{ t: 'Promote it to a thicker upper metal layer (layer promotion)', ok: true, w: 'Lower resistance.' }, { t: 'Add more vias', ok: false, w: 'More resistance.' }, { t: 'Route it on polysilicon', ok: false, w: 'Much higher resistance.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Routing connects…', o: ['the pins of every net with metal wires', 'the RTL modules', 'masks', 'test patterns'], a: 0, w: '' },
      { d: 'Easy', q: 'A via is…', o: ['a vertical connection between layers', 'a horizontal wire', 'a buffer', 'a pin'], a: 0, w: '' },
      { d: 'Easy', q: 'Layers usually alternate…', o: ['horizontal and vertical directions', 'VDD and VSS', 'cells and pins', 'clocks'], a: 0, w: '' },
      { d: 'Medium', q: '30 nets, 24 tracks on a gcell edge → overflow =', o: ['6', '24', '54', '0'], a: 0, w: '' },
      { d: 'Medium', q: 'A route with 5 direction changes needs…', o: ['5 vias', '2 vias', '10 vias', '0 vias'], a: 0, w: '' },
      { d: 'Medium', q: 'A routing blockage over a macro…', o: ['reserves those layers – no signal wires there', 'adds cells', 'removes the macro', 'adds power'], a: 0, w: '' },
      { d: 'Medium', q: 'Two wires on the same layer in the same place create…', o: ['a short', 'a via', 'a buffer', 'nothing'], a: 0, w: '' },
      { d: 'Hard', q: 'Why can congestion increase delay?', o: ['nets detour and become longer', 'cells get smaller', 'the clock stops', 'vias disappear'], a: 0, w: '' },
      { d: 'Hard', q: 'Search-and-repair in detailed routing…', o: ['rips up and reroutes nets to remove violations', 'places macros', 'creates masks', 'balances the clock tree'], a: 0, w: '' },
      { d: 'Hard', q: 'Via doubling improves…', o: ['reliability and resistance', 'congestion', 'utilisation', 'pin count'], a: 0, w: '' }
    ]
  });
})();
