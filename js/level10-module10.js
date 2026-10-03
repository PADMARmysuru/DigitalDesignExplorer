/* Level 10 · Module 10 – GDSII, Tape-out & 🏆 Build Your Chip */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var SIDES = [['N', 'North'], ['E', 'East'], ['S', 'South'], ['W', 'West']];
  var STEPS = ['I/O pins', 'Macros', 'Floorplan', 'Power grid', 'Placement', 'Clock tree', 'Routing', 'Congestion', 'Violations', 'Verification', 'GDSII'];
  var VTYPES = ['DRC', 'LVS', 'ERC', 'Antenna', 'IR drop'];

  function model(s) {
    var demand = 2.5 + (s.util - 65) * 0.12 + ({ edge: 0, split: 1, center: 2.5 })[s.macro] + ({ random: 1.5, cluster: 1.0, timing: 0 })[s.place] + Math.max(0, s.straps - 6) * 0.25;
    var cap = ({ 4: 3, 6: 5, 8: 7 })[s.layers];
    var fix = (s.fx.spread ? 1.0 : 0) + (s.fx.util ? 0.6 : 0) + (s.fx.halo ? 0.5 : 0) + (s.fx.layers ? 2 : 0);
    var ir = (s.ring ? 2 : 4) + 12 / (s.straps + 1);
    var skew = ({ none: 60, unbal: 18, htree: 2 })[s.cts];
    return { demand: demand, cap: cap, ovf0: Math.max(0, demand - cap), ovf: Math.max(0, demand - cap - fix), ir: ir, skew: skew };
  }
  function violations(s, m) {
    var v = [{ t: 'Net data[7] is split into two pieces at a strap crossing (missing via).', a: 1 }];
    if (s.layers === 4 || s.place === 'random') v.push({ t: 'A 380 µm metal-2 wire connects only to the gate of U118 before reaching upper metal.', a: 3 });
    if (s.macro !== 'edge' || m.ovf0 > 1.5) v.push({ t: 'Two metal-3 wires in the congested macro channel are 0.04 µm apart (rule 0.07 µm).', a: 0 });
    if (m.ir > 5) v.push({ t: 'Cells in the far corner see VDD 7 % below nominal.', a: 4 });
    v.push({ t: 'Input B of a spare NAND2 is not connected to any net.', a: 2 });
    return v;
  }
  function score(s, m, nv) {
    var area = (s.util >= 65 && s.util <= 80 ? 20 : s.util >= 60 && s.util <= 85 ? 14 : 8) - (s.aspect === '2' ? 2 : 0);
    var cong = m.ovf0 === 0 ? 20 : m.ovf0 <= 1 ? 15 : m.ovf0 <= 2 ? 10 : 5;
    var nfx = Object.keys(s.fx).filter(function (k) { return s.fx[k]; }).length;
    var route = Math.max(5, ({ 4: 16, 6: 20, 8: 14 })[s.layers] - 3 * nfx);
    var viol = Math.max(5, 20 - 5 * (nv - 2));
    var qual = (s.macro === 'edge' ? 6 : 1) + (m.ir <= 5 ? 5 : 1) + (s.cts === 'htree' ? 6 : s.cts === 'unbal' ? 3 : 0) + (s.place === 'timing' ? 3 : 1) - (s.pins.mem === s.pins.uart ? 2 : 0);
    var parts = [['Area', area], ['Congestion', cong], ['Routing quality', route], ['Violations', viol], ['Design quality', Math.max(0, qual)]];
    return { parts: parts, total: parts.reduce(function (a, p) { return a + p[1]; }, 0) };
  }

  /* ---------- Widget: Build Your Chip ---------- */
  function chipLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>🏆 Build Your Chip · tiny SoC: logic core + 2 SRAMs + UART + clock</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var s, nav = L.h('div', 'l7-row'), bar = L.h('div', 'l7-row'), view = L.h('div', '');
    function reset() { s = { step: 0, max: 0, pins: { mem: 'N', uart: 'N', clk: 'W' }, macro: null, util: 90, aspect: '1', ring: false, straps: 1, place: null, cts: null, layers: 6, fx: {}, vok: {}, verified: false }; }
    reset();
    body.appendChild(bar); body.appendChild(view); body.appendChild(nav);
    function go(i) { s.step = i; s.max = Math.max(s.max, i); draw(); }
    function ok() {
      var m = model(s);
      switch (s.step) {
        case 1: return !!s.macro;
        case 4: return !!s.place;
        case 5: return !!s.cts;
        case 7: return m.ovf <= 0;
        case 8: return violations(s, m).every(function (v, i) { return s.vok[i]; });
        case 9: return s.verified;
        default: return s.step < 10;
      }
    }
    function fbBox(kind, html) { var e = L.h('div', 'l7-verdict ' + kind, html); view.appendChild(e); return e; }
    function choices(list, key) {
      var ch = L.h('div', 'l7-choice'); view.appendChild(ch);
      list.forEach(function (c) { var b = L.h('button', s[key] === c[0] ? 'is-pick' : '', c[1]); b.type = 'button'; b.addEventListener('click', function () { s[key] = c[0]; draw(); }); ch.appendChild(b); });
    }
    function chip(full) {
      var o = R(6, 6, 308, 228, 'box', 8), cx = 30, cy = 30, cw = 260, chh = s.aspect === '2' ? 130 : 180;
      o += '<rect x="' + cx + '" y="' + cy + '" width="' + cw + '" height="' + chh + '" fill="#fbfbfd" stroke="#1d1d1f"/>';
      var side = { N: [cx + cw / 2, cy - 12], S: [cx + cw / 2, cy + chh + 12], W: [cx - 12, cy + chh / 2], E: [cx + cw + 12, cy + chh / 2] };
      [['mem', '#5856d6', 'MEM'], ['uart', '#34c759', 'UART'], ['clk', '#ff9500', 'CLK']].forEach(function (p, i) { var q = side[s.pins[p[0]]]; o += '<rect x="' + (q[0] - 8 + i * 6) + '" y="' + (q[1] - 5) + '" width="10" height="10" fill="' + p[1] + '"/>'; });
      if (s.macro) {
        var mm = s.macro === 'center' ? [[cx + 70, cy + chh / 2 - 25], [cx + 140, cy + chh / 2 - 25]] : s.macro === 'split' ? [[cx + 2, cy + 2], [cx + cw - 62, cy + chh - 52]] : (function () { var d = s.pins.mem; return d === 'N' ? [[cx + 60, cy + 2], [cx + 140, cy + 2]] : d === 'S' ? [[cx + 60, cy + chh - 52], [cx + 140, cy + chh - 52]] : d === 'W' ? [[cx + 2, cy + 20], [cx + 2, cy + 90]] : [[cx + cw - 62, cy + 20], [cx + cw - 62, cy + 90]]; })();
        mm.forEach(function (q) { o += '<rect x="' + q[0] + '" y="' + q[1] + '" width="60" height="50" rx="4" fill="#5856d6" opacity=".75"/>'; });
      }
      if (full >= 3) { if (s.ring) o += '<rect x="' + (cx - 5) + '" y="' + (cy - 5) + '" width="' + (cw + 10) + '" height="' + (chh + 10) + '" fill="none" stroke="#0071e3" stroke-width="3"/>'; for (var i = 0; i < s.straps; i++) o += '<line x1="' + (cx + (i + 0.5) * cw / s.straps) + '" x2="' + (cx + (i + 0.5) * cw / s.straps) + '" y1="' + cy + '" y2="' + (cy + chh) + '" stroke="#3a62c7" stroke-width="2" opacity=".6"/>'; }
      if (full >= 4) for (var r = 0; r < 9; r++) for (var c = 0; c < 14; c++) if ((r * 7 + c * 3) % 5 < 3) o += '<rect x="' + (cx + 8 + c * 18) + '" y="' + (cy + 8 + r * (chh - 16) / 9) + '" width="12" height="' + Math.max(4, (chh - 16) / 9 - 6) + '" fill="#34c759" opacity=".35"/>';
      if (full >= 5 && s.cts) o += '<path d="M' + (cx + cw / 2) + ' ' + (cy + chh / 2) + 'H' + (cx + cw / 4) + 'M' + (cx + cw / 2) + ' ' + (cy + chh / 2) + 'H' + (cx + 3 * cw / 4) + 'M' + (cx + cw / 4) + ' ' + (cy + chh / 4) + 'V' + (cy + 3 * chh / 4) + 'M' + (cx + 3 * cw / 4) + ' ' + (cy + chh / 4) + 'V' + (cy + 3 * chh / 4) + '" stroke="#ff9500" stroke-width="2.5" fill="none"/>';
      if (full >= 6) for (var w = 0; w < 7; w++) o += '<path d="M' + (cx + 12 + w * 34) + ' ' + (cy + 20 + (w % 3) * 40) + 'h' + (24 + w * 3) + 'v' + (30 + (w % 2) * 20) + '" stroke="' + (w % 2 ? '#ff2d55' : '#0071e3') + '" stroke-width="1.5" fill="none" opacity=".7"/>';
      return S(320, 240, o, 'Chip layout');
    }
    function draw() {
      var m = model(s);
      bar.innerHTML = '';
      STEPS.forEach(function (t, i) { var b = L.btn((i < s.max ? '✓ ' : '') + (i + 1) + '. ' + t, i === s.step ? 'is-on' : '', function () { if (i <= s.max) go(i); }); b.style.fontSize = '.76rem'; if (i > s.max) b.disabled = true; bar.appendChild(b); });
      view.innerHTML = '';
      var h = function (x, c) { var e = L.h('div', c || '', x); view.appendChild(e); return e; };
      h('<h3 style="margin:10px 0 6px">Step ' + (s.step + 1) + ' of 11 · ' + STEPS[s.step] + '</h3>');
      var grid = L.h('div', 'l7-grid2'); view.appendChild(grid);
      var left = L.h('div', ''), right = L.h('div', 'l7-svgbox', chip(s.step)); grid.appendChild(left); grid.appendChild(right);
      var keep = view; view = left;
      if (s.step === 0) {
        h('<p>Your synthesized netlist has a 64-bit memory bus to two SRAM macros, a UART and one clock input. Choose a side of the die for each pin group.</p>');
        var row = L.h('div', 'l7-row'); left.appendChild(row);
        [['mem', 'Memory bus'], ['uart', 'UART'], ['clk', 'Clock']].forEach(function (p) { L.select(row, p[1], SIDES, s.pins[p[0]], function (v) { s.pins[p[0]] = v; draw(); }); });
        fbBox(s.pins.mem === s.pins.uart ? 'warn' : 'ok', s.pins.mem === s.pins.uart ? '⚠️ Memory bus and UART share one side<small>Too many pins crowd one edge – consider spreading them.</small>' : '✅ Pins spread over the die<small>The memory macros should go next to the memory-bus pins (' + s.pins.mem + ').</small>');
      }
      if (s.step === 1) {
        h('<p>Where do the two SRAM macros go?</p>');
        choices([['edge', 'Against the ' + ({ N: 'north', S: 'south', E: 'east', W: 'west' })[s.pins.mem] + ' edge, facing the memory-bus pins'], ['center', 'Side by side in the centre of the core'], ['split', 'One in each opposite corner']], 'macro');
        if (s.macro) fbBox(s.macro === 'edge' ? 'ok' : 'bad', s.macro === 'edge' ? '✅ Short memory nets, one continuous logic area<small>The classic macro placement.</small>' : s.macro === 'center' ? '❌ Macros in the centre<small>They split the core and every route must detour around them – expect congestion.</small>' : '❌ Opposite corners<small>One SRAM is far from the memory pins – long wires and an extra channel.</small>');
      }
      if (s.step === 2) {
        L.slider(left, 'Core utilisation', 55, 95, 1, s.util, function (v) { return v + ' %'; }, function (v) { s.util = v; draw(); });
        var r2 = L.h('div', 'l7-row'); left.appendChild(r2);
        L.select(r2, 'Aspect ratio', [['1', '1 : 1 (square)'], ['2', '2 : 1']], s.aspect, function (v) { s.aspect = v; draw(); });
        fbBox(s.util > 85 ? 'bad' : s.util < 60 ? 'warn' : 'ok', s.util > 85 ? '❌ ' + s.util + ' % – too dense<small>No room for optimisation and routing.</small>' : s.util < 60 ? '⚠️ ' + s.util + ' % – a lot of empty silicon<small>Larger die, higher cost.</small>' : '✅ ' + s.util + ' % utilisation<small>' + (s.aspect === '2' ? 'Works, though a square core usually gives shorter wires.' : 'Good balance of area and routability.') + '</small>');
      }
      if (s.step === 3) {
        var rb = L.btn('Core power ring: ' + (s.ring ? 'ON' : 'OFF'), s.ring ? 'is-on' : '', function () { s.ring = !s.ring; draw(); }); left.appendChild(rb);
        L.slider(left, 'Power straps', 0, 10, 1, s.straps, null, function (v) { s.straps = v; draw(); });
        fbBox(m.ir <= 5 ? (s.straps > 6 ? 'warn' : 'ok') : 'bad', 'Worst IR drop ' + m.ir.toFixed(1) + ' %' + '<small>' + (m.ir > 5 ? 'Too high – add the ring and/or more straps (you may continue, but it will be found later).' : s.straps > 6 ? 'Safe, but many straps take routing tracks.' : 'Safe power grid.') + '</small>');
      }
      if (s.step === 4) {
        h('<p>Choose the placement strategy.</p>');
        choices([['random', 'Quick random spread'], ['cluster', 'Pack connected cells as tightly as possible'], ['timing', 'Timing-driven placement with a 70 % local density limit']], 'place');
        if (s.place) fbBox(s.place === 'timing' ? 'ok' : 'bad', s.place === 'timing' ? '✅ Short critical wires and no dense hot spots' : s.place === 'random' ? '❌ Long wires everywhere<small>More routing demand and slower paths.</small>' : '❌ Very short wires but dense hot spots<small>Congestion around the clusters.</small>');
      }
      if (s.step === 5) {
        h('<p>Build the clock tree to the ~2,000 flip-flops.</p>');
        choices([['none', 'No tree – drive all flip-flops from the clock pin'], ['unbal', 'Quick buffer tree without balancing'], ['htree', 'Buffered H-tree with balancing']], 'cts');
        if (s.cts) fbBox(s.cts === 'htree' ? 'ok' : 'bad', 'Clock skew ≈ ' + m.skew + ' ps<small>' + (s.cts === 'htree' ? 'Balanced, sharp edges.' : s.cts === 'none' ? 'One driver cannot drive 2,000 loads: slow edges, huge skew.' : 'Unbalanced branches – timing will suffer.') + '</small>');
      }
      if (s.step === 6) {
        var r3 = L.h('div', 'l7-row'); left.appendChild(r3);
        L.select(r3, 'Metal layers available for routing', [['4', '4 layers (cheapest)'], ['6', '6 layers'], ['8', '8 layers (more masks, higher cost)']], String(s.layers), function (v) { s.layers = +v; draw(); });
        fbBox(m.ovf0 ? 'bad' : 'ok', 'Routing demand ' + m.demand.toFixed(1) + ' vs capacity ' + m.cap + (m.ovf0 ? ' → overflow ' + m.ovf0.toFixed(1) : ' → fits') + '<small>' + (m.ovf0 ? 'Some regions have more wires than tracks. You will have to resolve this in the next step.' : 'Every net can be routed.') + '</small>');
      }
      if (s.step === 7) {
        if (m.ovf0 === 0) fbBox('ok', '✅ No congestion to resolve<small>Your floorplan and placement left enough room – nothing to fix.</small>');
        else {
          h('<p>Overflow ' + m.ovf0.toFixed(1) + '. Apply fixes until it reaches 0 (each fix costs something).</p>');
          [['spread', 'Spread cells in the hot spots (−1.0)'], ['util', 'Lower utilisation by 5 % – larger die (−0.6)'], ['halo', 'Add macro halos (−0.5)'], ['layers', 'Add two routing layers – extra masks (−2.0)']].forEach(function (f) { var b = L.btn((s.fx[f[0]] ? '✓ ' : '') + f[1], s.fx[f[0]] ? 'is-on' : '', function () { s.fx[f[0]] = !s.fx[f[0]]; draw(); }); b.style.margin = '4px 0'; left.appendChild(b); });
          fbBox(m.ovf <= 0 ? 'ok' : 'bad', m.ovf <= 0 ? '✅ Overflow resolved' : 'Remaining overflow ' + m.ovf.toFixed(1) + (m.ovf0 > 4.1 ? '<small>Even all four fixes together cannot remove this much congestion. Use ← Back to improve the earlier decisions (macro placement, utilisation, placement strategy, routing layers) – that is exactly how real projects recover.</small>' : '<small>Apply more fixes.</small>'));
        }
      }
      if (s.step === 8) {
        h('<p>Sign-off checks flagged these problems. Classify each one.</p>');
        violations(s, m).forEach(function (v, i) {
          var box = L.h('div', 'l7-box'); box.style.margin = '8px 0'; left.appendChild(box);
          box.appendChild(L.h('p', '', (s.vok[i] ? '✅ ' : '') + v.t));
          if (!s.vok[i]) { var rw = L.h('div', 'l7-row'); box.appendChild(rw); VTYPES.forEach(function (t, k) { var b = L.btn(t, '', function () { if (k === v.a) { s.vok[i] = 1; draw(); } else b.classList.add('is-wrong'); }); b.style.padding = '5px 10px'; rw.appendChild(b); }); }
          else box.appendChild(L.h('p', 'l7-hint', '→ ' + VTYPES[v.a]));
        });
      }
      if (s.step === 9) {
        var vs = violations(s, m);
        left.appendChild(L.btn(s.verified ? '✓ Fixes applied – all checks re-run' : '🔧 Apply fixes and re-run DRC / LVS / ERC / antenna', s.verified ? 'is-on' : 'pri', function () { s.verified = true; draw(); }));
        if (s.verified) h('<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Check</th><th>Before</th><th>After</th></tr>' + ['DRC', 'LVS', 'ERC', 'Antenna'].map(function (c, k) { var n = vs.filter(function (v) { return v.a === k; }).length; return '<tr><td>' + c + '</td><td>' + n + '</td><td class="better">0 ✓</td></tr>'; }).join('') + '</table></div>');
      }
      if (s.step === 10) {
        var vs2 = violations(s, m), sc = score(s, m, vs2.length);
        h('<p>Your layout has been streamed out as GDSII and taped out. 🎉</p>');
        h('<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Category</th><th>Score</th></tr>' + sc.parts.map(function (p) { return '<tr><td>' + p[0] + '</td><td>' + p[1] + ' / 20</td></tr>'; }).join('') + '<tr><td><b>Total</b></td><td><b>' + sc.total + ' / 100</b></td></tr></table></div>');
        fbBox(sc.total >= 85 ? 'ok' : sc.total >= 65 ? 'warn' : 'bad', (sc.total >= 85 ? '🏆 Excellent chip' : sc.total >= 65 ? '👍 Working chip – room to improve' : '⚠️ It works, but it was a hard fight') + ' · ' + sc.total + ' / 100<small>Use "Build again" to try different decisions – the best floorplans need almost no fixing later.</small>');
        left.appendChild(L.btn('↺ Build again', 'ghost', function () { reset(); draw(); }));
        api.done();
      }
      view = keep;
      nav.innerHTML = '';
      if (s.step > 0) nav.appendChild(L.btn('← Back', 'ghost', function () { go(s.step - 1); }));
      if (s.step < 10) { var nb = L.btn('Next: ' + STEPS[s.step + 1] + ' →', 'pri', function () { go(s.step + 1); }); nb.disabled = !ok(); nav.appendChild(nb); }
    }
    draw();
  }

  function fabFrame(k) {
    var o = '';
    o += R(20, 40, 100, 70, k >= 0 ? 'box-on' : 'box', 8) + T(70, 80, 'GDSII', 't-ink t-b');
    if (k >= 1) { o += P('M120 75H160', 'w-on'); for (var i = 0; i < 4; i++) o += R(160 + i * 8, 44 + i * 8, 70, 50, 'box-cu', 4); o += T(215, 130, '~60–80 masks', 't-dim t-sm'); }
    if (k >= 2) o += P('M250 75H290', 'w-on') + '<circle cx="350" cy="75" r="50" fill="#d2d2d7" stroke="#8e8e93"/>' + T(350, 140, 'wafer: layer by layer', 't-dim t-sm');
    if (k >= 2) for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) { var x = 316 + c * 14, y = 41 + r * 14; if ((x - 350 + 7) * (x - 350 + 7) + (y - 75 + 7) * (y - 75 + 7) < 1900) o += '<rect x="' + x + '" y="' + y + '" width="12" height="12" fill="#5856d6" opacity=".6"/>'; }
    if (k >= 3) o += P('M400 75H440', 'w-on') + R(440, 50, 60, 50, 'box-vio', 6) + T(470, 80, 'chip', 't-ink t-b') + T(470, 130, 'test, dice, package', 't-dim t-sm');
    o += T(300, 172, ['The verified layout is streamed out as a GDSII (or OASIS) file.', 'Mask data preparation turns each layer into a photomask.', 'The fab prints the masks onto wafers, one layer at a time.', 'Wafers are tested, diced and packaged into chips.'][k], 't-vio t-b t-sm');
    return S(600, 186, o, 'From GDSII to silicon');
  }

  L.module({
    n: 10,
    lead: 'The last step of physical design hands the chip to manufacturing. Learn what sign-off means, what is inside a GDSII file, how masks and wafers follow from it – and then build your own chip from netlist to tape-out.',
    tags: ['final layout', 'sign-off', 'GDSII', 'mask data', 'tape-out', 'fabrication hand-off', 'wafer fabrication', 'post-layout', '🏆 Build Your Chip'],
    sections: [
      {
        id: 'c-signoff', type: 'concept', title: 'Sign-off: the final checks', nav: 'Sign-off',
        html: '<p><b>Sign-off</b> is the set of final analyses that must all pass on the complete layout before tape-out:</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Sign-off area</th><th>Question</th></tr>' +
          '<tr><td>Physical verification</td><td>DRC, LVS, ERC, antenna clean? (Module 8)</td></tr>' +
          '<tr><td>Timing</td><td>Does STA with extracted parasitics pass at every corner? (Level 8 methods)</td></tr>' +
          '<tr><td>Power integrity</td><td>IR drop and EM within limits? (Modules 3 and 7)</td></tr>' +
          '<tr><td>Signal integrity</td><td>Crosstalk noise and delay acceptable?</td></tr>' +
          '<tr><td>Manufacturability</td><td>Density/fill rules, lithography-friendly patterns</td></tr></table></div>'
      },
      {
        id: 'st-fab', type: 'steps', title: 'Animation: from GDSII to silicon', nav: 'GDSII → chip',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['<b>GDSII</b>: a binary database of polygons, organised by layer and by cell hierarchy.', '<b>Mask data preparation</b>: each manufacturing layer becomes a photomask (with fill and optical proximity correction added by the foundry).', '<b>Wafer fabrication</b>: the masks are used in lithography, one layer at a time, on silicon wafers carrying many copies of the chip.', 'The finished wafers are tested, diced and packaged. (Testing methods are Level 12.)'][k], svg: fabFrame(k) }; })
      },
      {
        id: 'c-gds', type: 'concept', title: 'GDSII, mask data and tape-out', nav: 'GDSII & tape-out',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>GDSII</h4><p>The industry-standard layout format: polygons on numbered layers, grouped into cells (OASIS is a newer, more compact alternative). It contains geometry only – no logic, no timing.</p></div><div class="l7-box cu"><h4>Tape-out</h4><p>The moment the final GDSII is released to the foundry. The name comes from the days when the data was written to magnetic tape. After tape-out, changes are extremely expensive (new masks).</p></div><div class="l7-box vio"><h4>Fabrication hand-off</h4><p>The foundry runs its own checks, prepares the masks, and schedules the wafers. A mask set for an advanced node costs millions of dollars.</p></div><div class="l7-box"><h4>Post-layout considerations</h4><p>Post-silicon bring-up and validation, test (Level 12), yield learning, and ECOs for a respin if a bug is found.</p></div></div>'
      },
      { id: 'w-chip', type: 'widget', title: '🏆 Build Your Chip', nav: 'Build Your Chip', intro: 'Take the design through all 11 steps. Every decision has consequences later – and the final score shows how good your physical design was.', build: chipLab },
      {
        id: 'rv-10', type: 'reveal', title: 'Click to reveal: tape-out insights', nav: 'Reveal',
        items: [
          { q: 'Why is tape-out such a big moment?', a: 'Everything after it costs real money and months: masks, wafers, packaging. A bug found later may need a new mask set.' },
          { q: 'Does GDSII contain the netlist?', a: 'No – only polygons. LVS is what proves the polygons implement the netlist.' },
          { q: 'What is metal fill?', a: 'Dummy metal added to empty areas to meet density rules for uniform polishing.' },
          { q: 'What is a metal-only ECO?', a: 'A late fix that changes only some metal layers (using spare cells), so only a few masks must be remade.' },
          { q: 'Why do foundries check the GDSII again?', a: 'To protect their process: they run their own DRC and mask-preparation checks before committing wafers.' },
          { q: 'What comes after the chip returns from the fab?', a: 'Testing (Level 12), bring-up and validation on boards, and characterisation across voltage and temperature.' }
        ]
      },
      {
        id: 'dd-10', type: 'drag', title: 'Drag & drop: order the end of the flow', nav: 'Flow order',
        bins: ['Before tape-out', 'Tape-out / hand-off', 'After tape-out'],
        items: [['Physical verification clean', 0], ['Timing and IR sign-off', 0], ['Stream out GDSII', 1], ['Release data to the foundry', 1], ['Mask data preparation', 2], ['Wafer fabrication', 2], ['Dicing and packaging', 2]]
      },
      {
        id: 'calc10', type: 'calc', title: 'Tape-out calculations', nav: 'Calculate',
        items: [
          { q: 'A 300 mm wafer has an area of about 70,700 mm². How many 50 mm² dies fit, ignoring edge loss?', a: 1414, tol: 0.01, h: '70,700 / 50.', s: '≈ <b>1414</b>.' },
          { q: 'If 85 % of those dies work, how many good dies?', a: 1202, tol: 0.01, h: '1414 × 0.85.', s: '≈ <b>1202</b>.' },
          { q: 'A design uses 9 metal layers and 30 other layers. How many masks (one per layer)?', a: 39, h: '9 + 30.', s: '<b>39</b>.' },
          { q: 'A metal-only ECO changes metals 4 to 6. How many masks must be remade?', a: 3, h: 'M4, M5, M6 (ignoring via layers).', s: '<b>3</b>.' },
          { q: 'A die area of 50 mm² at 75 % utilisation: how much area (mm²) is filled with cells?', a: 37.5, h: '50 × 0.75.', s: '<b>37.5 mm²</b>.' }
        ]
      },
      {
        id: 'mcq10', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'GDSII contains…', o: ['layout polygons by layer', 'the RTL', 'timing reports', 'test vectors'], a: 0, w: '' },
          { q: 'Tape-out is…', o: ['releasing the final layout to the foundry', 'packaging the chip', 'writing RTL', 'placing cells'], a: 0, w: '' },
          { q: 'Masks are produced from…', o: ['the GDSII layers', 'the SDC', 'the testbench', 'the netlist'], a: 0, w: '' },
          { q: 'Sign-off includes…', o: ['DRC/LVS, timing, IR/EM checks', 'only simulation', 'only synthesis', 'only placement'], a: 0, w: '' }
        ]
      },
      {
        id: 'short10', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Describe what happens from a clean layout to a packaged chip.', k: ['sign-off', 'gds', 'mask', 'wafer|fab', 'package|dice|test'], m: 'After all sign-off checks pass, the layout is streamed out as GDSII and released to the foundry (tape-out). The foundry prepares mask data and photomasks for each layer, fabricates wafers layer by layer with lithography, then the wafers are tested, diced and packaged into chips.' },
          { q: 'Why are changes after tape-out so expensive, and how can late fixes be limited?', k: ['mask|cost', 'time|month|wafer', 'metal-only|eco|spare'], m: 'After tape-out every change requires new masks and new wafers, costing large sums and months of delay. Late fixes are limited by thorough sign-off and by planning for metal-only ECOs: spare cells are placed in advance so a bug can be fixed by changing only a few metal masks.' }
        ]
      },
      {
        id: 'scen10', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'The day before tape-out, LVS reports one short you cannot explain.', q: 'What should the team do?', o: [{ t: 'Delay tape-out until it is understood and fixed – a short can make every die fail', ok: true, w: 'Never tape out with an unexplained LVS error.' }, { t: 'Tape out anyway – one short is small', ok: false, w: 'It could kill every chip.' }, { t: 'Waive it without analysis', ok: false, w: 'Waivers need understanding.' }] },
          { s: 'Silicon comes back with a logic bug in one block. Spare cells exist nearby.', q: 'Cheapest fix?', o: [{ t: 'A metal-only ECO using the spare cells', ok: true, w: 'Only a few metal masks change.' }, { t: 'Redo the whole flow from RTL', ok: false, w: 'All masks would change.' }, { t: 'Change the package', ok: false, w: 'Does not fix logic.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The file sent to the foundry is…', o: ['GDSII / OASIS', 'Verilog', 'SDC', 'LEF only'], a: 0, w: '' },
      { d: 'Easy', q: 'Tape-out happens…', o: ['after sign-off', 'before placement', 'during synthesis', 'after packaging'], a: 0, w: '' },
      { d: 'Easy', q: 'Masks are used for…', o: ['lithography on wafers', 'simulation', 'routing', 'STA'], a: 0, w: '' },
      { d: 'Medium', q: 'GDSII does NOT contain…', o: ['logic functions or timing', 'polygons', 'layers', 'cell hierarchy'], a: 0, w: '' },
      { d: 'Medium', q: '1000 dies at 90 % yield gives…', o: ['900 good dies', '100', '1000', '90'], a: 0, w: '' },
      { d: 'Medium', q: 'Metal fill is added to satisfy…', o: ['density rules', 'LVS', 'timing', 'pin rules'], a: 0, w: '' },
      { d: 'Medium', q: 'In Build Your Chip, placing SRAMs in the core centre mainly increases…', o: ['congestion', 'IR drop', 'clock frequency', 'pin count'], a: 0, w: '' },
      { d: 'Hard', q: 'A metal-only ECO is attractive because…', o: ['only a few masks are remade', 'it needs no masks', 'it changes transistors', 'it avoids LVS'], a: 0, w: '' },
      { d: 'Hard', q: 'Sign-off timing uses…', o: ['extracted parasitics of the real layout', 'wire-load estimates only', 'RTL simulation', 'no constraints'], a: 0, w: '' },
      { d: 'Hard', q: 'Why must foundries re-check the GDSII?', o: ['to protect their process before making masks', 'to write RTL', 'to place cells', 'they do not'], a: 0, w: '' }
    ]
  });
})();
