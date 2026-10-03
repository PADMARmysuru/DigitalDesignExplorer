/* Level 7 · Module 6 – Standard Cell Design */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var PARTS = {
    vdd: ['VDD rail', 'A horizontal metal-1 power rail along the top edge. Every cell in the row connects to it simply by abutting its neighbours.'],
    vss: ['VSS (GND) rail', 'The ground rail along the bottom edge. Adjacent rows are flipped so that two rows share one rail.'],
    nwell: ['N-well', 'The pMOS transistors sit in an n-well in the upper half. The well is continuous along the whole row, so all cells must agree on where it is.'],
    pdiff: ['p+ diffusion (pMOS)', 'Active area of the pMOS transistors. Its width (vertical extent) sets the pMOS strength.'],
    ndiff: ['n+ diffusion (nMOS)', 'Active area of the nMOS transistors in the lower half. Typically narrower than the pMOS diffusion.'],
    poly: ['Poly gates', 'Vertical polysilicon (or metal-gate) lines cross both diffusions and form a pMOS/nMOS pair. Gates sit on a fixed pitch – the contacted poly pitch (CPP) – which sets the cell width grid.'],
    pin: ['Input / output pins', 'Metal-1 shapes the router connects to. Pins are placed on routing tracks so the router can reach them.'],
    height: ['Cell height', 'Fixed for every cell in the library, measured in routing tracks (e.g. 9 tracks × metal pitch). Only the width varies, in multiples of the placement site.']
  };

  /* ---------- Widget: anatomy of a cell (NAND2) ---------- */
  function anatomy(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Anatomy of a NAND2 standard cell · tap the parts</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = null, seen = {};
    var split = L.h('div', 'l7-lab-split'); body.appendChild(split);
    var pic = L.h('div', 'l7-svgbox'); split.appendChild(pic);
    var info = L.h('div', 'l7-readout', 'Tap any part of the cell.'); split.appendChild(info);
    function g(k, inner) { return '<g class="click" data-k="' + k + '" role="button" tabindex="0" aria-label="' + PARTS[k][0] + '">' + inner + '</g>'; }
    function cls(k, base) { return cur === k ? 'box-on' : base; }
    function draw() {
      var o = '';
      o += g('nwell', R(40, 30, 280, 150, cls('nwell', 'box'), 0));
      o += T(300, 50, 'n-well', 't-dim t-sm', 'end');
      o += g('vdd', R(30, 18, 300, 24, cls('vdd', 'box-cu'), 2) + T(180, 35, 'VDD (M1)', 't-ink t-b t-sm'));
      o += g('vss', R(30, 318, 300, 24, cls('vss', 'box-cu'), 2) + T(180, 335, 'VSS (M1)', 't-ink t-b t-sm'));
      o += g('pdiff', R(70, 70, 220, 80, cls('pdiff', 'box-vio'), 3) + T(80, 66, 'p+ diff', 't-vio t-sm', 'start'));
      o += g('ndiff', R(70, 220, 220, 60, cls('ndiff', 'box-vio'), 3) + T(80, 296, 'n+ diff', 't-vio t-sm', 'start'));
      o += g('poly', R(140, 56, 14, 238, cls('poly', 'box-bad'), 2) + R(210, 56, 14, 238, cls('poly', 'box-bad'), 2) + T(147, 312, 'A', 't-ink t-b') + T(217, 312, 'B', 't-ink t-b'));
      o += P('M100 42V100', 'w-cu') + P('M255 42V100', 'w-cu') + P('M100 250V318', 'w-cu');
      o += g('pin', R(170, 170, 26, 32, cls('pin', 'box-ok'), 3) + T(183, 192, 'Y', 't-ok t-b') + R(115, 196, 22, 22, cls('pin', 'box-ok'), 3) + R(228, 196, 22, 22, cls('pin', 'box-ok'), 3));
      o += P('M183 120V170', 'w-cu') + P('M255 250V230H196', 'w-cu');
      o += g('height', P('M350 18V342', cur === 'height' ? 'w-on' : 'w-dash') + P('M342 18H358M342 342H358', cur === 'height' ? 'w-on' : 'w') + T(365, 185, 'height', cur === 'height' ? 't-sig t-b' : 't-dim', 'start') + '<rect x="340" y="18" width="70" height="324" fill="transparent"/>');
      pic.innerHTML = S(420, 356, o, 'NAND2 standard cell layout');
      L.$$('g.click', pic).forEach(function (el) {
        el.addEventListener('click', function () {
          cur = el.getAttribute('data-k'); seen[cur] = 1; if (Object.keys(seen).length >= 6) api.done();
          info.innerHTML = '<span class="v">' + PARTS[cur][0] + '</span><br>' + PARTS[cur][1] + '<br><br><span class="k">Explored</span> ' + Object.keys(seen).length + ' of ' + Object.keys(PARTS).length + ' parts';
          draw();
        });
      });
    }
    draw();
  }

  /* ---------- Widget: drive strength ---------- */
  function drive(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Drive-strength explorer · INV_X1 … INV_X8</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var R1 = 6, Cp1 = 2, Ci1 = 1.5, load = 20, n = 0;
    L.slider(body, 'Load capacitance', 2, 120, 2, load, function (v) { return v + ' fF'; }, function (v) { load = v; n++; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function upd() {
      if (n >= 3) api.done();
      var ks = [1, 2, 4, 8], d = ks.map(function (k) { return 0.69 * (R1 / k) * (load + k * Cp1); }), mx = Math.max.apply(null, d), best = d.indexOf(Math.min.apply(null, d)), o = '';
      ks.forEach(function (k, i) {
        var y = 14 + i * 50, w = 300 * d[i] / mx;
        o += T(10, y + 20, 'X' + k, 't-ink t-b', 'start') + T(10, y + 36, 'Cin ' + (k * Ci1) + ' fF · area ' + k + '×', 't-dim t-sm', 'start');
        o += '<rect x="150" y="' + (y + 6) + '" width="' + w.toFixed(1) + '" height="22" rx="4" fill="' + (i === best ? 'var(--l7-sig)' : 'var(--l7-cu)') + '" opacity=".85"/>';
        o += T(158 + w, y + 22, d[i].toFixed(1) + ' ps', 't-ink t-b t-sm', 'start');
      });
      pic.innerHTML = S(560, 214, o, 'Delay of each drive strength');
      L.fb(fb, 'info', 'Model: t ≈ 0.69 · (R<sub>X1</sub>/k) · (C<sub>load</sub> + k·C<sub>par</sub>) with R<sub>X1</sub> = 6 kΩ, C<sub>par</sub> = 2 fF per unit. A k-times stronger cell has k-times wider transistors: k-times lower resistance, but k-times more input capacitance (a bigger load for the previous gate), parasitic capacitance, area and leakage. For a small load the extra self-loading wastes area; for a large load stronger cells win. Fastest here: <b>X' + ks[best] + '</b>.');
    }
    upd();
  }

  function rowFrame(k) {
    var o = '', cells = [['INV', 3], ['NAND2', 4], ['AOI21', 6], ['NOR2', 4], ['INV', 3], ['DFF', 14]];
    var site = 18, x0 = 30;
    var rows = k >= 3 ? 2 : 1;
    for (var r = 0; r < rows; r++) {
      var y = 40 + r * 110, flip = r === 1;
      o += R(x0, y, site * 34, 90, 'box', 0);
      o += R(x0, flip ? y + 84 : y - 6, site * 34, 12, 'box-cu', 2) + R(x0, flip ? y - 6 : y + 84, site * 34, 12, 'box-cu', 2);
      o += T(x0 + site * 34 + 8, flip ? y + 94 : y + 4, flip ? 'VDD' : 'VDD', 't-cu t-sm', 'start') + T(x0 + site * 34 + 8, flip ? y + 4 : y + 94, 'VSS', 't-cu t-sm', 'start');
      if (k >= 1) {
        var x = x0, n = k >= 2 ? cells.length : 2;
        for (var i = 0; i < n; i++) { var w = cells[i][1] * site; o += R(x + 1, y + 8, w - 2, 74, i % 2 ? 'box-vio' : 'box-on', 3) + T(x + w / 2, y + 50, cells[i][0], 't-ink t-sm'); x += w; }
      }
      if (k === 0) for (var s = 0; s < 34; s++) o += P('M' + (x0 + s * site) + ' ' + (y + 6) + 'V' + (y + 84), 'w-thin');
    }
    o += T(40, 22, ['A placement row: a grid of sites between VDD and VSS', 'Cells snap to sites and abut', 'Any mix of cells: all share height and rails', 'Flipped rows share rails (VSS–VSS / VDD–VDD)'][k], 't-vio t-b', 'start');
    return S(700, k >= 3 ? 270 : 150, o, 'Standard cell row');
  }

  L.module({
    n: 6,
    lead: 'Most digital chips are built from a library of pre-designed, pre-verified standard cells. Learn how a cell is constructed – fixed height, power rails, wells and pins – and why each function comes in several drive strengths.',
    tags: ['cell architecture', 'cell height & tracks', 'rails & wells', 'drive strength', 'sizing', 'layout rules', 'library'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-sc', type: 'concept', title: 'The standard-cell concept', nav: 'Concept',
        html: '<p>A <b>standard-cell library</b> is a collection of small logic blocks – inverters, NAND/NOR, AOI/OAI, multiplexers, XOR, adders, flip-flops, latches, buffers and special cells – each designed once at transistor and layout level, verified and characterised. Synthesis maps a design onto these cells and automatic placement and routing assembles them, so a chip with millions of gates can be designed without drawing transistors by hand.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Fixed height</h4><p>All cells share the same height so they can sit side by side in rows.</p></div><div class="l7-box cu"><h4>Shared rails</h4><p>VDD and VSS run along the top and bottom edges; abutting cells connect automatically.</p></div><div class="l7-box vio"><h4>Variable width</h4><p>Width depends on the function and drive strength, in multiples of a placement site.</p></div></div>'
      },
      {
        id: 'c-arch', type: 'concept', title: 'Cell architecture and cell height', nav: 'Architecture',
        html: '<p>Inside a cell, pMOS devices sit in an n-well in the top half and nMOS devices in the bottom half; vertical gate lines cross both, forming complementary pairs. Inputs and outputs are metal-1 (or metal-0) shapes on the routing grid.</p>' +
          '<div class="l7-eq">Cell height = number of tracks × metal routing pitch      Cell width = n × placement-site width (≈ gate pitch)</div>' +
          '<p>The <b>track count</b> describes how many horizontal routing tracks fit in the height. Tall libraries (12T) give wide transistors and high drive; short libraries (6T–7.5T) give dense, low-power designs. Many designs mix a high-performance and a high-density library.</p>'
      },
      { id: 'w-anat', type: 'widget', title: 'Anatomy lab: inside a NAND2 cell', nav: 'Anatomy lab', intro: 'Tap at least six parts of the cell to learn what each one does.', build: anatomy },
      {
        id: 'st-row', type: 'steps', title: 'Animation: how cells form placement rows', nav: 'Rows animation',
        frames: [
          { t: 'A placement row is a strip with VDD at the top and VSS at the bottom, divided into equal-width <b>sites</b>.', svg: rowFrame(0) },
          { t: 'Cells are placed on site boundaries. Their rails touch, so power is connected by <b>abutment</b> – no extra wiring.', svg: rowFrame(1) },
          { t: 'Any combination of cells fits, because every cell has the same height, rail positions and well boundary.', svg: rowFrame(2) },
          { t: 'Alternate rows are mirrored so two rows share one VDD or VSS rail, saving area. The router then wires cell pins in the metal layers above.', svg: rowFrame(3) }
        ]
      },
      {
        id: 'c-drive', type: 'concept', title: 'Drive strength and cell sizing', nav: 'Drive strength',
        html: '<p>Each logic function is offered in several <b>drive strengths</b> (often named X1, X2, X4, X8 or D1, D2, D4). An X2 cell has transistors about twice as wide as X1, usually built as parallel “fingers” sharing diffusion, so it has about half the output resistance.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Benefits of a stronger cell</h4><ul><li>Drives a larger load (long wire, high fanout) faster</li><li>Sharper output transitions</li></ul></div><div class="l7-box cu"><h4>Costs</h4><ul><li>Larger input capacitance – a heavier load for the previous gate</li><li>More area and leakage</li><li>More switching power</li></ul></div></div>' +
          '<p style="margin-top:12px">Inside each cell, pMOS/nMOS widths are chosen to balance rise and fall (pMOS ≈ 1.5–2× wider) and series stacks are made wider. Choosing which drive strength to use where is done by synthesis and timing optimisation (Levels 8–9).</p>'
      },
      { id: 'w-drive', type: 'widget', title: 'Drive-strength explorer', nav: 'Drive lab', intro: 'Move the load slider several times. When does X8 win, and when is X1 or X2 enough?', build: drive },
      {
        id: 'c-layout', type: 'concept', title: 'Layout considerations and the library', nav: 'Layout & library',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Layout considerations</h4><ul><li>Design rules: minimum width, spacing, enclosure; advanced nodes add strict gate-pitch and fin rules</li><li>Pins on the routing grid and reachable from several directions</li><li>Shared diffusion between adjacent transistors to save area</li><li>Well and substrate ties (taps) to prevent latch-up</li><li>Regular, unidirectional patterns for lithography</li></ul></div>' +
          '<div class="l7-box"><h4>What a simple library contains</h4><ul><li>Logic: INV, BUF, NAND/NOR 2–4, AND/OR, AOI/OAI, XOR/XNOR, MUX, half/full adder</li><li>Sequential: D flip-flops (with reset, enable, scan variants), latches</li><li>Physical-only: fillers, well taps, end caps, decoupling capacitors, tie-high/tie-low</li><li>Each in several drive strengths, often in multiple threshold-voltage flavours</li></ul></div></div>' +
          '<p style="margin-top:12px">For each cell the library provides several <b>views</b>: the layout (GDS), an abstract with pins and blockages for placement and routing (LEF), timing and power models (Liberty .lib), and logic/transistor netlists. How the timing and power tables are characterised is covered later.</p>'
      },
      {
        id: 'rv-sc', type: 'reveal', title: 'Click to reveal: standard-cell questions', nav: 'Reveal',
        items: [
          { q: 'Why must every cell have exactly the same height?', a: 'So that cells can be placed in any order in a row and still connect to the shared VDD/VSS rails and the continuous n-well.' },
          { q: 'What is a filler cell?', a: 'A cell with no logic that fills gaps between cells to keep the wells, implants and rails continuous along the row.' },
          { q: 'Why do flip-flop cells have a scan version?', a: 'A scan flip-flop includes an input mux so flip-flops can be chained for manufacturing test. (Test methods are covered in Level 12.)' },
          { q: 'Why is a 6-track library denser but slower?', a: 'Its smaller height leaves less room for transistor width, so devices are weaker, but more cells fit in the same area.' },
          { q: 'What are multi-Vt cells?', a: 'The same function with high, standard or low threshold-voltage transistors: low-Vt is faster but leaks more, high-Vt leaks less but is slower.' },
          { q: 'What does a well-tap cell do?', a: 'It connects the n-well to VDD and the substrate to VSS at regular intervals, preventing latch-up.' }
        ]
      },
      {
        id: 'dd-sc', type: 'drag', title: 'Drag & drop: which library view contains it?', nav: 'Drag & drop',
        bins: ['Layout (GDS)', 'Abstract (LEF)', 'Timing/power (Liberty)', 'Netlist (Verilog / SPICE)'],
        items: [['Polygons on every mask layer', 0], ['Exact transistor geometry', 0], ['Cell boundary, pin shapes and blockages for the router', 1], ['Placement site and symmetry', 1], ['Delay tables vs load and input slew', 2], ['Leakage and internal power', 2], ['Pin capacitance', 2], ['Transistor connections for circuit simulation', 3], ['Logic function for simulation', 3]]
      },
      { part: 'Practice' },
      {
        id: 'calc6', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'A library uses 9 tracks with a metal-2 pitch of 0.1 µm. What is the cell height (µm)?', a: 0.9, u: 'µm', h: 'height = tracks × pitch.', s: '9 × 0.1 = <b>0.9 µm</b>.' },
          { q: 'A NAND2 cell is 4 sites wide with a site width of 0.2 µm and the height above. What is its area (µm²)?', a: 0.72, u: 'µm²', h: 'Width = 4 × 0.2 µm.', s: '0.8 µm × 0.9 µm = <b>0.72 µm²</b>.' },
          { q: 'An INV_X1 has input capacitance 1.5 fF. What is the input capacitance of INV_X4 (fF)?', a: 6, u: 'fF', h: 'Input capacitance scales with transistor width.', s: '4 × 1.5 = <b>6 fF</b>.' },
          { q: 'Using t = 0.69·(6 kΩ/k)·(C<sub>load</sub> + k·2 fF), find the delay of INV_X2 driving 20 fF (in ps).', a: 49.68, u: 'ps', h: 'k = 2: R = 3 kΩ, C = 20 + 4 fF.', s: '0.69 × 3 kΩ × 24 fF = <b>49.7 ps</b>.' },
          { q: 'A placement row is 120 µm long and the average cell is 1.5 µm wide. At 80 % utilisation, how many cells fit in the row?', a: 64, tol: 0, abs: 0.5, h: 'Usable width = 0.8 × 120 µm.', s: '96 µm / 1.5 µm = <b>64 cells</b>.' }
        ]
      },
      {
        id: 'mcq6', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'In a standard-cell row, cells connect to power by…', o: ['individual routed wires', 'abutting their VDD/VSS rails', 'through-silicon vias', 'bond wires'], a: 1, w: 'Rails run edge to edge.' },
          { q: 'Cell height is usually specified in…', o: ['transistors', 'routing tracks', 'gates', 'nanoseconds'], a: 1, w: 'e.g. 9-track library.' },
          { q: 'An X4 inverter compared with X1 has…', o: ['¼ the input capacitance', 'about ¼ the output resistance and 4× the input capacitance', 'the same area', 'lower leakage'], a: 1, w: 'Four times wider transistors.' },
          { q: 'Why are alternate rows flipped?', o: ['to reverse logic polarity', 'so neighbouring rows share a power rail', 'to reduce gate count', 'for test access'], a: 1, w: 'Saves one rail per pair of rows.' }
        ]
      },
      {
        id: 'short6', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'List the main architectural rules every cell in a standard-cell library must follow, and why.', k: ['height', 'rail|vdd|vss', 'well', 'pin|grid|track', 'site|width'], m: 'All cells have the same height and identical VDD/VSS rail positions so they abut in rows and share power; the n-well boundary is at the same height so wells merge; widths are multiples of the placement site; and pins lie on the routing grid so the router can reach them. Together these allow any cells to be placed side by side automatically.' },
          { q: 'Explain the trade-off involved in choosing a higher drive-strength cell.', k: ['faster|delay|drive', 'input capacitance|load', 'area', 'power|leakage'], m: 'A higher drive strength has wider transistors and lower output resistance, so it drives large loads faster with sharper edges. But it presents more input capacitance to the previous stage, occupies more area and consumes more switching and leakage power. It is worthwhile only when the load is large.' }
        ]
      },
      {
        id: 'scen6', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'An X1 inverter must drive a long wire with 100 fF of load and is too slow, but the gate that drives it is already heavily loaded.', q: 'What is a good approach?', o: [{ t: 'Insert a buffer chain: e.g. X1 → X4 → driving the wire', ok: true, w: 'Gradual up-sizing keeps every stage reasonably loaded.' }, { t: 'Replace the X1 with an X16 directly', ok: false, w: 'Its large input capacitance would slow down the already-loaded previous stage.' }, { t: 'Use a smaller cell to reduce capacitance', ok: false, w: 'A weaker driver makes the long wire even slower.' }] },
          { s: 'A team designs a very low-power IoT chip running at 50 MHz.', q: 'Which library choice fits best?', o: [{ t: 'A short-track, high-density library with high-Vt cells', ok: true, w: 'Dense, low-leakage cells suit relaxed speed targets.' }, { t: 'A 12-track low-Vt library', ok: false, w: 'Fast but large and leaky – wrong priorities.' }, { t: 'Full-custom layout for every gate', ok: false, w: 'Far too costly for a low-speed design.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'Standard cells in one library share the same…', o: ['width', 'height', 'number of transistors', 'drive strength'], a: 1, w: 'Fixed height, variable width.' },
      { q: 'In a typical cell, pMOS transistors are placed…', o: ['in the bottom half', 'in an n-well in the top half', 'outside the cell', 'on top of the nMOS'], a: 1, w: 'pMOS in the n-well near VDD.' },
      { q: 'The width of a cell is a multiple of the…', o: ['track pitch', 'placement site', 'wafer size', 'via size'], a: 1, w: 'Placement-site width (related to gate pitch).' },
      { q: 'A 7.5-track library compared with a 12-track library is…', o: ['faster and larger', 'denser and generally lower power', 'identical', 'only for memories'], a: 1, w: 'Shorter cells, weaker devices, more density.' },
      { q: 'Increasing drive strength mainly reduces…', o: ['input capacitance', 'output resistance', 'area', 'leakage'], a: 1, w: 'Wider transistors conduct more current.' },
      { q: 'Which cell contains no logic but keeps wells and rails continuous?', o: ['tie-high', 'filler', 'buffer', 'latch'], a: 1, w: 'Fillers close gaps.' },
      { q: 'The LEF abstract view mainly describes…', o: ['delays', 'cell size, pins and blockages for placement and routing', 'transistor sizes', 'logic function'], a: 1, w: 'Physical abstract for P&R tools.' },
      { q: 'Which file holds timing and power models of cells?', o: ['GDS', 'LEF', 'Liberty (.lib)', 'SPICE netlist'], a: 2, w: 'Liberty timing/power tables.' },
      { q: 'Well-tap cells prevent…', o: ['crosstalk', 'latch-up', 'electromigration', 'setup violations'], a: 1, w: 'They tie wells and substrate to the supplies.' },
      { q: 'Transistors of a high-drive cell are usually built as…', o: ['one very long device', 'several parallel fingers', 'series stacks', 'capacitors'], a: 1, w: 'Fingers keep the cell height fixed.' }
    ]
  });
})();
