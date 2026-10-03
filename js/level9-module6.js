/* Level 9 · Module 6 – Logic Synthesis */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  function gate(x, y, lbl, cls) { return R(x, y, 64, 40, cls || 'box-on', 8) + T(x + 32, y + 25, lbl, 't-ink t-b t-sm'); }
  function dff(x, y) { return R(x, y - 6, 60, 52, 'box-vio', 6) + T(x + 30, y + 18, 'DFF', 't-ink t-b t-sm') + '<path d="M' + x + ' ' + (y + 38) + 'l7 -5l-7 -5" class="w"/>'; }

  var STAGES = [
    { n: 'RTL', what: 'Your SystemVerilog. The tool reads it, checks syntax and builds a model of the design.',
      view: function () { return L.code('module top (input logic clk, a, b, c, output logic q);\n  always_ff @(posedge clk)\n    q <= (a & b) | (a & c);\nendmodule'); },
      stats: 'Lines of RTL: 4 · no gates yet' },
    { n: 'Elaborated design', what: 'Elaboration expands parameters and generate loops and translates every operator into generic, technology-independent gates and flip-flops (e.g. GTECH). Nothing is optimised yet: each operator becomes its own gate.',
      view: function () { var o = T(20, 44, 'a', 't-ink t-b', 'start') + T(20, 84, 'b', 't-ink t-b', 'start') + T(20, 124, 'c', 't-ink t-b', 'start'); o += gate(60, 30, 'AND') + gate(60, 100, 'AND') + gate(200, 64, 'OR') + dff(340, 66); o += P('M34 40H60M34 80H48V58H60M34 40H44V110H60M34 120H60M124 50H160V78H200M124 120H160V92H200M264 84H340M400 86H440', 'w'); return S(460, 160, o, 'Elaborated'); },
      stats: 'Generic gates: 2 AND + 1 OR + 1 DFF' },
    { n: 'Optimized logic', what: 'Boolean optimisation and minimisation: ab + ac = a(b + c). Redundant logic, constants and unused gates are removed; logic is restructured to meet the constraints.',
      view: function () { var o = T(20, 44, 'b', 't-ink t-b', 'start') + T(20, 84, 'c', 't-ink t-b', 'start') + T(20, 134, 'a', 't-ink t-b', 'start'); o += gate(60, 40, 'OR') + gate(200, 80, 'AND') + dff(340, 86); o += P('M34 40H48V54H60M34 80H48V66H60M124 60H170V92H200M34 130H170V108H200M264 100H340M400 106H440', 'w'); o += T(230, 160, 'ab + ac  →  a(b + c)', 't-cu t-b t-sm'); return S(460, 170, o, 'Optimized'); },
      stats: 'Generic gates: 1 OR + 1 AND + 1 DFF (one gate saved)' },
    { n: 'Technology mapping', what: 'The optimised logic is covered with real cells from the technology library (.lib). The tool chooses among cells by function, area, delay and power: here one complex cell OA21 implements a(b + c).',
      view: function () { var o = T(20, 44, 'b', 't-ink t-b', 'start') + T(20, 74, 'c', 't-ink t-b', 'start') + T(20, 104, 'a', 't-ink t-b', 'start'); o += R(70, 30, 120, 90, 'box-cu', 10) + T(130, 70, 'OA21_X1', 't-ink t-b t-sm') + T(130, 90, 'area 1.6', 't-dim t-sm') + dff(260, 56); o += P('M34 40H70M34 70H70M34 100H70M190 76H260M320 76H360', 'w'); o += T(300, 140, 'DFF_X1 · area 4.5', 't-dim t-sm'); return S(460, 160, o, 'Mapped'); },
      stats: 'Library cells: OA21_X1 + DFF_X1 · total area 6.1' },
    { n: 'Gate-level netlist', what: 'The result: a structural Verilog netlist of library cells and the nets between them. It is used for gate-level simulation, timing analysis (Level 8) and physical design (Level 10).',
      view: function () { return L.code('module top ( clk, a, b, c, q );\n  input clk, a, b, c;\n  output q;\n  wire n1;\n  OA21_X1 U1     ( .A1(b), .A2(c), .B(a), .Z(n1) );\n  DFF_X1  q_reg  ( .D(n1), .CK(clk), .Q(q), .QN() );\nendmodule'); },
      stats: 'Cells: 2 · Nets: 6 · Area: 6.1 units' }
  ];

  /* ---------- Widget: clickable synthesis flow ---------- */
  function flowLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Synthesis flow · click each stage</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, seen = {};
    var bar = L.h('div', 'l7-row'); body.appendChild(bar);
    var view = L.h('div', ''); body.appendChild(view);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function show(i) {
      cur = i; seen[i] = 1;
      bar.innerHTML = '';
      STAGES.forEach(function (st, k) {
        bar.appendChild(L.btn((seen[k] ? '✓ ' : '') + (k + 1) + '. ' + st.n, k === cur ? 'is-on' : '', function () { show(k); }));
        if (k < STAGES.length - 1) bar.appendChild(L.h('span', 'l7-unit', '↓'));
      });
      var st = STAGES[i];
      view.innerHTML = '<h4 style="margin:10px 0 4px">' + (i + 1) + '. ' + st.n + '</h4><p>' + st.what + '</p><div class="l7-svgbox">' + st.view() + '</div><div class="l7-readout">' + st.stats + '</div>';
      var nav = L.h('div', 'l7-row'); view.appendChild(nav);
      if (i > 0) nav.appendChild(L.btn('← Previous stage', 'ghost', function () { show(i - 1); }));
      if (i < STAGES.length - 1) nav.appendChild(L.btn('Next stage →', 'pri', function () { show(i + 1); }));
      var n = Object.keys(seen).length;
      if (n === STAGES.length) { L.fb(fb, 'ok', '🎉 You followed the whole flow: 4 RTL lines → 4 generic gates → 3 optimised gates → 2 library cells.'); api.done(); }
      else L.fb(fb, 'info', 'Stages explored: ' + n + ' of ' + STAGES.length + '.');
    }
    show(0);
  }

  /* ---------- Widget: technology mapping and cell selection ---------- */
  var LIB = { INV: [0.7, 1], NAND2: [1.0, 1], NOR2: [1.0, 1.2], AND2: [1.3, 1.6], OR2: [1.3, 1.7], AOI22: [1.6, 1.4] };
  var MAPS = [
    { cells: ['AND2', 'AND2', 'NOR2'], f: function (a, b, c, d) { return !((a && b) || (c && d)); }, lv: [['AND2'], ['NOR2']] },
    { cells: ['NAND2', 'NAND2', 'AND2'], f: function (a, b, c, d) { return !(a && b) && !(c && d); }, lv: [['NAND2'], ['AND2']] },
    { cells: ['AOI22'], f: function (a, b, c, d) { return !((a && b) || (c && d)); }, lv: [['AOI22']] },
    { cells: ['AND2', 'AND2', 'OR2', 'INV'], f: function (a, b, c, d) { return !((a && b) || (c && d)); }, lv: [['AND2'], ['OR2'], ['INV']] },
    { cells: ['NAND2', 'NAND2', 'NAND2'], f: function (a, b, c, d) { return !(!(a && b) && !(c && d)); }, lv: [['NAND2'], ['NAND2']] }
  ];
  function mapLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Technology mapping · implement y = ~((a & b) | (c & d))</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Library (area, delay)</span> ' + Object.keys(LIB).map(function (k) { return k + ' (' + LIB[k][0] + ', ' + LIB[k][1] + ')'; }).join(' · ')));
    body.appendChild(L.h('p', 'l7-hint', 'Choose a mapping. The tool must keep the function correct, then minimise area (unless timing forces otherwise).'));
    var ch = L.h('div', 'l7-choice'); body.appendChild(ch);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var tried = {};
    MAPS.forEach(function (m, i) {
      var b = L.h('button', '', m.cells.join(' + ')); b.type = 'button';
      b.addEventListener('click', function () {
        tried[i] = 1;
        L.$$('button', ch).forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); });
        var ok = true;
        for (var v = 0; v < 16; v++) { var a = !!(v & 8), bb = !!(v & 4), c = !!(v & 2), d = !!(v & 1); if (m.f(a, bb, c, d) !== !((a && bb) || (c && d))) ok = false; }
        var area = m.cells.reduce(function (s, c) { return s + LIB[c][0]; }, 0), delay = m.lv.reduce(function (s, l) { return s + LIB[l[0]][1]; }, 0);
        out.innerHTML = '<span class="k">Function</span> ' + (ok ? '<span class="v">correct for all 16 input combinations</span>' : '<span class="c">WRONG – differs from the RTL</span>') + '<br><span class="k">Cells</span> ' + m.cells.length + ' · <span class="k">area</span> ' + area.toFixed(1) + ' · <span class="k">delay</span> ' + delay.toFixed(1) + ' (' + m.lv.length + ' level' + (m.lv.length > 1 ? 's' : '') + ')';
        var best = i === 2;
        b.classList.add(ok && best ? 'is-right' : 'is-wrong');
        L.fb(fb, ok && best ? 'ok' : 'bad', !ok ? '✗ This mapping is not equivalent (it computes the OR, not the NOR). Synthesis never accepts a non-equivalent mapping.' : best ? '✓ AOI22 (AND-OR-INVERT) does the whole function in one cell: smallest area (1.6) and shortest delay. Complex cells like this are why mapped netlists are smaller than generic ones.' : '✗ Correct function, but area ' + area.toFixed(1) + ' – there is a smaller, faster choice in the library.');
        if (ok && best) api.done();
      });
      ch.appendChild(b);
    });
  }

  function optFrame(k) {
    var rows = [
      ['y = a·b·c + a·b·c\' + a·b\'·c', '3 AND3 + 1 OR3 + 2 INV', 'RTL as written'],
      ['y = a·b·(c + c\') + a·b\'·c', 'combine terms: c + c\' = 1', 'Boolean identity'],
      ['y = a·b + a·b\'·c', '2 AND + 1 OR + 1 INV', 'fewer literals'],
      ['y = a·(b + c)', '1 OR + 1 AND', 'absorption: b + b\'c = b + c']
    ], o = '';
    rows.forEach(function (r, i) {
      var y = 26 + i * 44, on = i === k;
      o += R(20, y, 330, 34, on ? 'box-on' : i < k ? 'box-ok' : 'box', 8) + T(185, y + 22, r[0], on ? 't-ink t-b t-sm' : 't-dim t-sm');
      o += T(370, y + 15, r[1], on ? 't-cu t-b t-sm' : 't-dim t-sm', 'start') + T(370, y + 30, r[2], 't-dim t-sm', 'start');
    });
    return S(600, 206, o, 'Boolean optimisation');
  }

  L.module({
    n: 6,
    lead: 'Synthesis turns RTL into a netlist of real library cells. Follow the flow step by step – elaboration, Boolean optimisation, technology mapping – and see why the same RTL can give very different gates depending on the library and the constraints.',
    tags: ['purpose of synthesis', 'elaboration', 'Boolean optimisation', 'technology libraries', 'technology mapping', 'netlist', 'area optimisation', 'timing-aware synthesis'],
    sections: [
      {
        id: 'c-why', type: 'concept', title: 'What synthesis does', nav: 'Purpose',
        html: '<p><b>Logic synthesis</b> converts RTL into an equivalent gate-level netlist built from the cells of a specific technology library, while meeting timing, area and power goals given as constraints.</p>' +
          '<div class="l7-eq">Synthesis = Translation (elaboration) + Logic optimisation + Technology mapping</div>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Inputs</h4><p>RTL · technology library (.lib) · constraints (SDC, Module 7)</p></div><div class="l7-box cu"><h4>Output</h4><p>gate-level netlist (Verilog) + reports (Module 8)</p></div><div class="l7-box vio"><h4>Guarantee</h4><p>the netlist is logically equivalent to the RTL</p></div></div>'
      },
      {
        id: 'st-opt', type: 'steps', title: 'Animation: Boolean optimisation step by step', nav: 'Optimisation steps',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['The RTL expression as written: three product terms – 3 AND gates, an OR and inverters.', 'The tool spots c + c\' = 1 in the first two terms.', 'Fewer literals, fewer gates.', 'Absorption (b + b\'c = b + c) leaves just two gates. The tool does this automatically – the function is unchanged.'][k], svg: optFrame(k) }; })
      },
      { id: 'w-flow', type: 'widget', title: 'Synthesis flow visualisation', nav: 'Flow explorer', intro: 'Click through all five stages for a small design. Watch the gate count fall.', build: flowLab },
      {
        id: 'c-lib', type: 'concept', title: 'Technology libraries', nav: 'Libraries',
        html: '<p>A <b>standard-cell library</b> (Liberty .lib file) describes every cell the foundry offers. Synthesis reads, for each cell:</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Data</th><th>Example</th><th>Used for</th></tr>' +
          '<tr><td>Function</td><td>AOI22: Y = !(A1·A2 + B1·B2)</td><td>mapping</td></tr>' +
          '<tr><td>Area</td><td>1.6 units</td><td>area optimisation</td></tr>' +
          '<tr><td>Timing tables</td><td>delay vs input slew and load</td><td>timing-aware choices</td></tr>' +
          '<tr><td>Power tables</td><td>internal and leakage power</td><td>power optimisation</td></tr>' +
          '<tr><td>Drive strengths</td><td>X1, X2, X4 versions</td><td>sizing</td></tr></table></div>' +
          '<p>One library per operating corner (process, voltage, temperature). How the cells themselves are designed is Level 7.</p>'
      },
      {
        id: 'c-opt', type: 'concept', title: 'Boolean optimisation and logic minimisation', nav: 'Optimisation',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Two-level / multi-level minimisation</h4><p>Factoring, sharing common terms: <code>ab + ac → a(b + c)</code>; <code>ab + ab\' → a</code>.</p></div><div class="l7-box"><h4>Constant propagation</h4><p>Inputs tied to 0/1 and parameters simplify logic away.</p></div><div class="l7-box"><h4>Redundancy removal</h4><p>Logic whose outputs are never used, or duplicated logic, is deleted.</p></div><div class="l7-box"><h4>Restructuring</h4><p>Re-balance logic so late-arriving signals pass fewer levels (timing-driven).</p></div></div>'
      },
      { id: 'w-map', type: 'widget', title: 'Technology mapping and cell selection', nav: 'Mapping lab', intro: 'Try the candidate mappings. Find the one a synthesis tool would choose.', build: mapLab },
      {
        id: 'c-timing', type: 'concept', title: 'Area optimisation and timing-aware synthesis', nav: 'Area vs timing',
        html: '<p>Synthesis is driven by constraints: it first meets timing on critical paths, then recovers area elsewhere.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Loose clock</h4><p>small cells, ripple-carry adders, shared logic → minimum area.</p></div><div class="l7-box cu"><h4>Tight clock</h4><p>larger drive strengths, faster adder architectures (carry look-ahead / prefix), duplicated logic → more area and power.</p></div></div>' +
          '<p style="margin-top:12px">The same RTL <code>s = a + b;</code> can become a 32-cell ripple adder or a 200-cell prefix adder, purely because of the clock constraint.</p>'
      },
      {
        id: 'rv-6', type: 'reveal', title: 'Click to reveal: synthesis insights', nav: 'Reveal',
        items: [
          { q: 'Is synthesis output always identical for the same RTL?', a: 'No – it depends on the library, the constraints, tool settings and even the order of optimisations. Equivalence to the RTL is what is guaranteed.' },
          { q: 'What is GTECH?', a: 'A generic, technology-independent gate library used internally after elaboration, before mapping.' },
          { q: 'Why are complex cells like AOI/OAI useful?', a: 'They implement AND-OR-INVERT functions in one stage – less area and delay than separate gates.' },
          { q: 'How is equivalence checked after synthesis?', a: 'With formal equivalence checking between RTL and netlist (covered as a methodology in Level 11).' },
          { q: 'What happens to unused outputs?', a: 'Their driving logic is removed; reports list such removed or unloaded cells.' },
          { q: 'Why can a tighter clock increase power?', a: 'Bigger, faster cells and duplicated logic switch more capacitance.' }
        ]
      },
      {
        id: 'dd-6', type: 'drag', title: 'Drag & drop: which synthesis step?', nav: 'Drag & drop',
        bins: ['Elaboration', 'Logic optimisation', 'Technology mapping'],
        items: [['Expand generate loops and parameters', 0], ['Translate + into a generic adder', 0], ['ab + ac → a(b + c)', 1], ['Remove logic driving nothing', 1], ['Choose AOI22_X1 for a NOR of ANDs', 2], ['Pick X2 drive strength on a critical net', 2]]
      },
      {
        id: 'calc6', type: 'calc', title: 'Synthesis calculations', nav: 'Calculate',
        items: [
          { q: 'Using the library in the mapping lab, what is the area of AND2 + AND2 + NOR2?', a: 3.6, tol: 0.01, h: '1.3 + 1.3 + 1.0.', s: '<b>3.6</b>.' },
          { q: 'How much area does AOI22 save compared with AND2 + AND2 + OR2 + INV (area units)?', a: 3, tol: 0.01, h: '(1.3×3 + 0.7) − 1.6.', s: '4.6 − 1.6 = <b>3.0</b>.' },
          { q: 'A design maps to 1200 NAND2-equivalent cells of area 1.0 and 300 flip-flops of area 4.5. Total area?', a: 2550, h: '1200 + 300 × 4.5.', s: '<b>2550</b> units.' },
          { q: 'The flow example went from 4 generic gates (including the DFF) to how many library cells?', a: 2, h: 'OA21 + DFF.', s: '<b>2</b>.' },
          { q: 'ab + ab\' minimises to a. How many 2-input gates does the original need (2 AND + 1 OR + 1 INV) minus the minimised version (0)?', a: 4, h: 'The minimised version is a wire.', s: '<b>4</b> gates removed.' }
        ]
      },
      {
        id: 'mcq6', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The three main inputs to synthesis are…', o: ['RTL, library, constraints', 'GDS, LEF, DEF', 'testbench, waveforms, coverage', 'C code, compiler, OS'], a: 0, w: '' },
          { q: 'Technology mapping…', o: ['writes RTL', 'covers logic with library cells', 'places cells on the die', 'creates the clock tree'], a: 1, w: 'Placement and CTS are Level 10.' },
          { q: 'A tighter clock constraint typically gives…', o: ['less area', 'faster, larger cells and architectures', 'no change', 'latches'], a: 1, w: '' },
          { q: 'The synthesis output is…', o: ['a gate-level netlist', 'a layout', 'a bitstream only', 'a testbench'], a: 0, w: '' }
        ]
      },
      {
        id: 'short6', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Describe the main steps of logic synthesis.', k: ['elaborat|translat|generic', 'optimi|minimi|boolean', 'mapping|library|cells', 'netlist'], m: 'Elaboration/translation reads the RTL and builds a generic gate-level representation; logic optimisation minimises and restructures the Boolean logic under the constraints; technology mapping implements the logic with cells from the target library, choosing among functions, sizes and drive strengths; the result is written as a gate-level netlist with reports.' },
          { q: 'Explain how timing constraints affect the hardware produced by synthesis.', k: ['clock|constraint|period', 'faster|larger|drive', 'area', 'architecture|adder|duplicat'], m: 'With a relaxed clock the tool minimises area: small cells, simple architectures (ripple adders), shared logic. With a tight clock it must meet timing first: larger drive strengths, faster arithmetic architectures, restructured or duplicated logic – which increases area and power.' }
        ]
      },
      {
        id: 'scen6', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Two engineers synthesise the same RTL; one netlist has 30 % more area.', q: 'Most likely reason?', o: [{ t: 'Different constraints (e.g. a tighter clock) or a different library/corner', ok: true, w: 'Synthesis results follow the constraints and library.' }, { t: 'One of them has a bug in the RTL', ok: false, w: 'The RTL is identical.' }, { t: 'Synthesis is random', ok: false, w: 'Results are deterministic for the same inputs and settings.' }] },
          { s: 'A block meets timing easily with a lot of positive slack, but its area is over budget.', q: 'What should be adjusted?', o: [{ t: 'Check the constraints are realistic and let the tool optimise for area (smaller cells, sharing)', ok: true, w: 'Over-tight or missing area goals waste silicon.' }, { t: 'Tighten the clock further', ok: false, w: 'That increases area.' }, { t: 'Add pipeline registers', ok: false, w: 'Adds area.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Synthesis converts…', o: ['netlist to RTL', 'RTL to a gate-level netlist', 'layout to GDS', 'C to RTL'], a: 1, w: '' },
      { d: 'Easy', q: 'A Liberty (.lib) file contains…', o: ['cell functions, timing, area and power', 'the RTL', 'the testbench', 'the floorplan'], a: 0, w: '' },
      { d: 'Easy', q: 'The first synthesis step is…', o: ['mapping', 'elaboration', 'routing', 'placement'], a: 1, w: '' },
      { d: 'Medium', q: 'ab + ac optimises to…', o: ['a + bc', 'a(b + c)', 'abc', 'b + c'], a: 1, w: '' },
      { d: 'Medium', q: 'AOI22 implements…', o: ['(AB + CD)', '!(AB + CD)', 'A + B + C + D', '!(A + B)'], a: 1, w: '' },
      { d: 'Medium', q: 'Which mapping would synthesis reject?', o: ['a cheaper equivalent one', 'a non-equivalent one', 'one using complex cells', 'one using X2 cells'], a: 1, w: '' },
      { d: 'Medium', q: 'X1, X2, X4 versions of a cell differ in…', o: ['function', 'drive strength (and area)', 'clock', 'library vendor'], a: 1, w: '' },
      { d: 'Hard', q: 'With a very tight clock, s = a + b; is likely mapped to…', o: ['a ripple-carry adder', 'a parallel-prefix (fast) adder', 'a latch', 'a ROM'], a: 1, w: '' },
      { d: 'Hard', q: 'The netlist is used next for…', o: ['RTL coding', 'gate-level simulation, STA and physical design', 'writing the specification', 'nothing'], a: 1, w: '' },
      { d: 'Hard', q: 'Area of 2 × AND2 (1.3) + NOR2 (1.0) vs AOI22 (1.6): AOI22 saves…', o: ['0.6', '1.0', '2.0', '3.6'], a: 2, w: '3.6 − 1.6.' }
    ]
  });
})();
