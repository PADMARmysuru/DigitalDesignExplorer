/* Level 10 · Module 1 – Physical Design Flow */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var STAGES = [
    { n: 'Netlist', icon: '📄', in: 'Gate-level netlist from synthesis (Level 9), SDC constraints, libraries', proc: 'Read the design and the technology data; check that every cell exists in the physical library.', out: 'A design database ready for implementation', prob: 'Missing cells in the LEF/library, mismatched constraints, unresolved references.' },
    { n: 'Floorplan', icon: '📐', in: 'Netlist, die size target, I/O list, macros (RAMs, IPs)', proc: 'Define die and core area, place I/O pins and macros, set rows, blockages and keep-out regions.', out: 'Floorplan: core outline, rows, pin and macro positions', prob: 'Poor macro placement → congestion and long wires; too-high utilisation → no room to route.' },
    { n: 'Power', icon: '🔌', in: 'Floorplan, power budget, metal stack', proc: 'Build VDD/VSS rings around the core, straps across it and rails along every row.', out: 'Power distribution network (PDN)', prob: 'Too few straps → IR drop; narrow wires → electromigration; straps that block routing.' },
    { n: 'Placement', icon: '🧩', in: 'Floorplan + PDN, standard cells of the netlist', proc: 'Global placement, legalisation into rows, detailed placement and optimisation.', out: 'Every standard cell at a legal location', prob: 'Hot spots of high density → congestion; overlaps; long critical nets.' },
    { n: 'CTS', icon: '🌳', in: 'Placed design, clock definitions', proc: 'Build a buffered clock tree from the clock source to every flip-flop and balance it.', out: 'Clock tree with buffers and balanced latency', prob: 'Unbalanced branches (skew), too many buffers (power), clock routing congestion.' },
    { n: 'Routing', icon: '🛣️', in: 'Placed design with clock tree', proc: 'Global routing (plan channels), track assignment, detailed routing with wires and vias on metal layers.', out: 'Fully connected layout (all nets routed)', prob: 'Overflow (more wires than tracks), opens/shorts, DRC violations, crosstalk.' },
    { n: 'Verification', icon: '🔎', in: 'Routed layout, rule deck, netlist', proc: 'DRC (geometry rules), LVS (layout = netlist), ERC, antenna checks; fix and re-check.', out: 'Clean, verified layout', prob: 'Spacing/width violations, shorts or opens found by LVS, antenna violations.' },
    { n: 'GDSII', icon: '💾', in: 'Verified layout', proc: 'Stream out the final layout polygons layer by layer in GDSII (or OASIS) format.', out: 'GDSII file sent to the foundry → tape-out', prob: 'Wrong layer mapping, missing fill/marker layers, late changes after sign-off.' }
  ];

  /* ---------- Widget: interactive physical design pipeline ---------- */
  function pipeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Physical design pipeline · tap a stage</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, seen = {};
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var info = L.h('div', ''); body.appendChild(info);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function draw() {
      var o = '';
      STAGES.forEach(function (s, i) {
        var x = 8 + (i % 4) * 148, y = 14 + Math.floor(i / 4) * 92, on = i === cur;
        o += '<g class="click" data-i="' + i + '" role="button" tabindex="0" aria-label="' + s.n + '">' + R(x, y, 132, 64, on ? 'box-on' : seen[i] ? 'box-ok' : 'box', 12) + T(x + 66, y + 28, s.icon, 't-ink') + T(x + 66, y + 50, (i + 1) + '. ' + s.n, on ? 't-ink t-b t-sm' : 't-dim t-b t-sm') + '</g>';
        if (i % 4 < 3 && i < 7) o += P('M' + (x + 132) + ' ' + (y + 32) + 'H' + (x + 148), 'w-on');
      });
      o += P('M' + (8 + 3 * 148 + 66) + ' 78V92H' + (8 + 66) + 'V106', 'w-on');
      pic.innerHTML = S(600, 196, o, 'Physical design pipeline');
      L.$$('g.click', pic).forEach(function (g) { var go = function () { cur = +g.getAttribute('data-i'); seen[cur] = 1; draw(); }; g.addEventListener('click', go); g.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); }); });
      var s = STAGES[cur]; seen[cur] = 1;
      info.innerHTML = '<div class="l7-grid2"><div class="l7-box sig"><h4>⬇ Input</h4><p>' + s.in + '</p></div><div class="l7-box"><h4>⚙ Process</h4><p>' + s.proc + '</p></div><div class="l7-box ok"><h4>⬆ Output</h4><p>' + s.out + '</p></div><div class="l7-box cu"><h4>⚠ Typical problems</h4><p>' + s.prob + '</p></div></div>';
      var n = Object.keys(seen).length;
      if (n === STAGES.length) { L.fb(fb, 'ok', '🎉 All 8 stages explored. Notice how each output becomes the next stage\'s input.'); api.done(); }
      else L.fb(fb, 'info', 'Stages explored: ' + n + ' of 8.');
    }
    draw();
  }

  /* ---------- Widget: arrange the flow ---------- */
  function arrangeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Arrange the flow · tap the stages in the correct order</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var order = ['Synthesized netlist', 'Floorplanning', 'Power planning', 'Placement', 'Clock tree synthesis', 'Routing', 'Physical verification', 'GDSII', 'Tape-out'];
    var pool, built, mistakes;
    var slots = L.h('div', 'l7-progdots'); body.appendChild(slots);
    var seq = L.h('div', 'l7-readout'); body.appendChild(seq);
    var ch = L.h('div', 'l7-choice'); body.appendChild(ch);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('↺ Start again', 'ghost', reset));
    function reset() { pool = order.slice().sort(function () { return Math.random() - 0.5; }); built = []; mistakes = 0; draw(); L.fb(fb, 'info', 'Tap the first stage of the flow.'); }
    function draw() {
      slots.innerHTML = order.map(function (x, i) { return '<span class="' + (i < built.length ? 'ok' : i === built.length ? 'cur' : '') + '"></span>'; }).join('');
      seq.innerHTML = built.length ? built.map(function (b, i) { return (i ? ' → ' : '') + '<b>' + b + '</b>'; }).join('') : '<span class="k">Your flow will appear here</span>';
      ch.innerHTML = '';
      pool.forEach(function (p) {
        var b = L.h('button', '', p); b.type = 'button';
        b.addEventListener('click', function () {
          if (p === order[built.length]) {
            built.push(p); pool.splice(pool.indexOf(p), 1); draw();
            if (built.length === order.length) { L.fb(fb, 'ok', '🎉 Correct order' + (mistakes ? ' (' + mistakes + ' wrong tap' + (mistakes > 1 ? 's' : '') + ' along the way)' : ' – first time!') + '. Each stage needs the result of the one before: you cannot route before cells are placed, or build a clock tree before the flip-flops have positions.'); api.done(); }
            else L.fb(fb, 'ok', '✓ ' + p + '. What comes next?');
          } else {
            mistakes++; b.classList.add('is-wrong');
            L.fb(fb, 'bad', '✗ Not yet: ' + p + ' needs something that is not ready. ' + (built.length ? 'After ' + built[built.length - 1] + ', ask: what does the next step need?' : 'Start with what synthesis produced.'));
          }
        });
        ch.appendChild(b);
      });
    }
    reset();
  }

  function stackFrame(k) {
    var o = '';
    var layers = [['Substrate + wells', '#e8d9c4'], ['Transistors (diffusion, poly)', '#ffb3b3'], ['Metal 1: cell wiring, rails', '#9ec5ff'], ['Metal 2–4: local routing', '#7aa7ff'], ['Metal 5–6: global routing', '#5c86e8'], ['Top metals: power grid, clock', '#3a62c7']];
    layers.forEach(function (l, i) {
      var y = 168 - i * 26, on = i <= k + 1;
      o += '<rect x="80" y="' + y + '" width="300" height="22" rx="4" fill="' + l[1] + '" opacity="' + (on ? 1 : 0.18) + '"/>' + T(400, y + 16, l[0], on ? 't-ink t-b t-sm' : 't-dim t-sm', 'start');
    });
    o += T(230, 20, ['Front-end of line: transistors (Level 7 territory)', 'Lower metals connect pins inside and between nearby cells', 'Middle metals carry most signal routing', 'Thick top metals carry power and long global nets'][k], 't-vio t-b t-sm');
    return S(600, 196, o, 'Layer stack');
  }

  L.module({
    n: 1,
    lead: 'Synthesis gave you a netlist – a list of cells and wires with no positions. Physical design turns it into geometry: where every cell sits, how power and clock reach it, and which metal tracks carry every connection, until a manufacturable layout (GDSII) is ready.',
    tags: ['netlist → layout', 'PD stages', 'inputs & outputs', 'technology files', 'cell libraries', 'physical constraints', 'RTL → GDSII'],
    sections: [
      {
        id: 'c-what', type: 'concept', title: 'What is physical design?', nav: 'What is PD?',
        html: '<p><b>Physical design</b> (also called <i>physical implementation</i> or <i>place-and-route</i>) converts a gate-level netlist into a <b>layout</b>: a set of polygons on each manufacturing layer that the foundry can turn into masks.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>The netlist knows…</h4><p>which cells exist and how they connect – but nothing about where they are.</p></div><div class="l7-box cu"><h4>The layout knows…</h4><p>the exact x, y position of every cell, every wire segment on every metal layer and every via.</p></div></div>' +
          '<div class="l7-eq">RTL → (synthesis, Level 9) → netlist → (physical design, Level 10) → GDSII → tape-out</div>'
      },
      { id: 'w-pipe', type: 'widget', title: 'The physical design pipeline', nav: 'Pipeline', intro: 'Tap each of the eight stages to see its input, process, output and typical problems.', build: pipeLab },
      {
        id: 'c-io', type: 'concept', title: 'Inputs, technology files and libraries', nav: 'Inputs',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Input</th><th>Contains</th><th>Used for</th></tr>' +
          '<tr><td>Gate-level netlist</td><td>cells and connections (from synthesis)</td><td>what to implement</td></tr>' +
          '<tr><td>Constraints (SDC)</td><td>clocks, I/O delays, exceptions</td><td>timing-driven optimisation</td></tr>' +
          '<tr><td>Technology file / tech LEF</td><td>metal layers, widths, spacings, via rules, routing pitch</td><td>routing and design rules</td></tr>' +
          '<tr><td>Cell LEF (physical library)</td><td>cell outlines, pin shapes, blockages – an abstract of each cell</td><td>placement and pin access</td></tr>' +
          '<tr><td>Timing/power libraries (.lib)</td><td>delay and power of each cell</td><td>timing- and power-aware decisions</td></tr>' +
          '<tr><td>RC / parasitic models</td><td>resistance and capacitance per layer</td><td>wire delay estimation</td></tr>' +
          '<tr><td>Rule decks</td><td>DRC, LVS, antenna rules</td><td>physical verification</td></tr></table></div>'
      },
      {
        id: 'st-stack', type: 'steps', title: 'Animation: the layers a layout is built from', nav: 'Layer stack',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Transistors are built in the silicon at the bottom.', 'Metal 1 (and 2) wire up the inside of cells and carry the power rails along the rows.', 'Intermediate metals carry most signal routes between cells, alternating horizontal and vertical.', 'Thick upper metals have low resistance: power grids, clock trunks and long global nets.'][k], svg: stackFrame(k) }; })
      },
      {
        id: 'c-obj', type: 'concept', title: 'Physical constraints and design objectives', nav: 'Objectives',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Must</h4><ul><li>connect every net</li><li>obey every design rule</li><li>match the netlist (LVS)</li></ul></div><div class="l7-box cu"><h4>Should</h4><ul><li>meet timing with real wires</li><li>keep IR drop and EM safe</li><li>leave no congestion</li></ul></div><div class="l7-box vio"><h4>Optimise</h4><ul><li>smallest die area</li><li>low power</li><li>short design time</li></ul></div></div>' +
          '<p style="margin-top:12px">Physical constraints include the die size, pin locations required by the package, macro positions, placement and routing blockages, and the metal layers allowed for each purpose.</p>'
      },
      { id: 'w-arr', type: 'widget', title: 'Arrange the flow', nav: 'Arrange', intro: 'Put the nine steps from netlist to tape-out in the correct order.', build: arrangeLab },
      {
        id: 'rv-1', type: 'reveal', title: 'Click to reveal: physical design insights', nav: 'Reveal',
        items: [
          { q: 'Why does physical design change timing?', a: 'Real wires have resistance and capacitance. Synthesis only estimated them; after placement and routing the actual delays are known.' },
          { q: 'Why is the order of the flow fixed?', a: 'Each stage needs the previous result: placement needs rows and the power grid, CTS needs flip-flop positions, routing needs placed pins.' },
          { q: 'What is a LEF file?', a: 'Library Exchange Format – the physical abstract of the technology (layers, rules) and of each cell (size, pins, blockages), without the transistor detail.' },
          { q: 'What does "RTL-to-GDSII" mean?', a: 'The complete digital implementation flow from hardware description to the manufacturable layout file.' },
          { q: 'Why iterate?', a: 'Problems found later (congestion, timing, DRC) often need an earlier stage – usually the floorplan or placement – to be changed.' },
          { q: 'Who receives the GDSII?', a: 'The foundry, which turns it into masks after its own checks (tape-out, Module 10).' }
        ]
      },
      {
        id: 'dd-1', type: 'drag', title: 'Drag & drop: which file or input?', nav: 'Drag & drop',
        bins: ['Netlist', 'Technology / LEF', 'Constraints (SDC)', 'Output'],
        items: [['Cells and their connections', 0], ['Instance names like U123', 0], ['Metal pitch and spacing rules', 1], ['Cell outlines and pin shapes', 1], ['Clock period', 2], ['Input and output delays', 2], ['GDSII layout file', 3], ['Polygons on every layer', 3]]
      },
      {
        id: 'calc1', type: 'calc', title: 'Physical design arithmetic', nav: 'Calculate',
        items: [
          { q: 'A design has 40,000 standard cells with an average area of 2.5 µm². What is the total standard-cell area (µm²)?', a: 100000, h: 'count × area.', s: '<b>100,000 µm²</b> = 0.1 mm².' },
          { q: 'If those cells should fill 70 % of the core, what core area is needed (µm², approx.)?', a: 142857, tol: 0.01, h: 'cell area / 0.7.', s: '≈ <b>142,857 µm²</b>.' },
          { q: 'A square core of 142,857 µm²: what is its side length (µm, nearest integer)?', a: 378, tol: 0.01, h: '√area.', s: '≈ <b>378 µm</b>.' },
          { q: 'Rows are 1.2 µm tall. How many rows fit in a 378 µm-high core (whole rows)?', a: 315, h: 'floor(378 / 1.2).', s: '<b>315</b> rows.' },
          { q: 'A metal layer has a routing pitch of 0.1 µm. How many tracks cross a 378 µm-wide core?', a: 3780, h: 'width / pitch.', s: '<b>3780</b> tracks.' }
        ]
      },
      {
        id: 'mcq1', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Physical design starts from…', o: ['RTL', 'the gate-level netlist', 'the specification', 'masks'], a: 1, w: '' },
          { q: 'Which stage comes right after placement?', o: ['routing', 'clock tree synthesis', 'floorplanning', 'GDSII'], a: 1, w: '' },
          { q: 'The LEF file mainly describes…', o: ['timing of cells', 'physical outlines, pins and layer rules', 'RTL', 'test vectors'], a: 1, w: '' },
          { q: 'The final output sent to the foundry is…', o: ['the netlist', 'the SDC', 'GDSII', 'the .lib'], a: 2, w: '' }
        ]
      },
      {
        id: 'short1', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'List the main stages of the physical design flow in order and the output of each.', k: ['floorplan', 'power', 'placement|place', 'clock tree|cts', 'rout', 'verification|drc|lvs', 'gds'], m: 'Floorplanning (core, rows, I/O and macro positions) → power planning (rings, straps, rails) → placement (legal cell positions) → clock tree synthesis (buffered, balanced clock network) → routing (all nets connected on metal layers) → physical verification (DRC/LVS/ERC/antenna clean layout) → GDSII stream-out → tape-out.' },
          { q: 'What information does physical design need that synthesis did not?', k: ['lef|physical library|outline', 'technology|layer|rule', 'die|floorplan|pin', 'parasitic|rc|wire'], m: 'Physical data: the technology file (layers, widths, spacings, vias), physical cell abstracts (LEF: size and pin shapes), die and I/O constraints, macro positions, parasitic RC models for real wires and the DRC/LVS rule decks.' }
        ]
      },
      {
        id: 'scen1', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Routing fails with thousands of overflows in the middle of the chip, where two large RAMs sit close together.', q: 'Which earlier stage should be revisited first?', o: [{ t: 'Floorplanning – move the macros apart / to the edges', ok: true, w: 'Macro placement decides the routing channels.' }, { t: 'GDSII stream-out', ok: false, w: 'Too late.' }, { t: 'RTL coding', ok: false, w: 'The netlist is not the problem here.' }] },
          { s: 'A student tries to build the clock tree before placement.', q: 'Why does this not work?', o: [{ t: 'CTS needs the physical positions of the flip-flops to balance the tree', ok: true, w: 'Without positions there are no wire lengths to balance.' }, { t: 'Clock trees are built after GDSII', ok: false, w: 'No.' }, { t: 'It works fine', ok: false, w: 'It does not.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The input of physical design is…', o: ['RTL', 'gate-level netlist', 'GDSII', 'specification'], a: 1, w: '' },
      { d: 'Easy', q: 'GDSII is…', o: ['a timing report', 'the layout database format sent for manufacturing', 'an RTL language', 'a test pattern'], a: 1, w: '' },
      { d: 'Easy', q: 'Which stage builds the clock network?', o: ['floorplanning', 'CTS', 'routing', 'DRC'], a: 1, w: '' },
      { d: 'Medium', q: 'Correct order:', o: ['floorplan → power → placement → CTS → routing', 'placement → floorplan → routing → CTS', 'routing → placement → floorplan', 'CTS → floorplan → routing'], a: 0, w: '' },
      { d: 'Medium', q: 'Pin shapes and cell outlines come from…', o: ['the cell LEF', 'the SDC', 'the RTL', 'the testbench'], a: 0, w: '' },
      { d: 'Medium', q: 'Which file defines metal spacing and width rules?', o: ['technology file / tech LEF', 'netlist', '.lib', 'SDC'], a: 0, w: '' },
      { d: 'Medium', q: '10,000 cells × 3 µm² at 60 % utilisation need a core of…', o: ['30,000 µm²', '50,000 µm²', '18,000 µm²', '60,000 µm²'], a: 1, w: '30,000 / 0.6.' },
      { d: 'Hard', q: 'Why is timing checked again after routing?', o: ['real wire RC is now known', 'the RTL changed', 'the clock was removed', 'it is not'], a: 0, w: '' },
      { d: 'Hard', q: 'Severe congestion around two adjacent macros is best fixed in…', o: ['floorplanning', 'GDSII', 'tape-out', 'the testbench'], a: 0, w: '' },
      { d: 'Hard', q: 'Upper metal layers are preferred for power grids because…', o: ['they are thicker, with lower resistance', 'they are closer to transistors', 'they are thinner', 'they have no vias'], a: 0, w: '' }
    ]
  });
})();
