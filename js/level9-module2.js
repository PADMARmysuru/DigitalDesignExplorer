/* Level 9 · Module 2 – SystemVerilog for Synthesizable RTL */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var HW = ['Multiplexer', 'Register', 'Counter', 'Decoder', 'Adder', 'Comparator'];

  /* ---------- Widget: what will this synthesize into? ---------- */
  function synthDrill(root, api) {
    L.drill(root, api, {
      bar: '"What will this synthesize into?"', label: 'RTL', fixed: true,
      items: [
        { c: 'module m #(parameter W = 8) (\n  input  logic [W-1:0] a, b,\n  input  logic         s,\n  output logic [W-1:0] y);\n  always_comb\n    y = s ? b : a;\nendmodule', o: HW, a: 0, w: 'Pure selection between two inputs in always_comb: a W-bit 2:1 multiplexer.' },
        { c: 'always_ff @(posedge clk or negedge rst_n)\n  if (!rst_n)  q <= \'0;\n  else if (en) q <= d;', o: HW, a: 1, w: 'always_ff with a clock edge: flip-flops (with asynchronous active-low reset and an enable).' },
        { c: 'always_ff @(posedge clk)\n  if (clr)     n <= \'0;\n  else if (up) n <= n + 1\'b1;', o: HW, a: 2, w: 'A register whose next value is its own value + 1: a counter (register + incrementer).' },
        { c: 'always_comb begin\n  y = \'0;              // default\n  y[sel] = 1\'b1;      // sel: 3 bits, y: 8 bits\nend', o: HW, a: 3, w: 'Exactly one of 8 outputs goes high for each value of sel: a 3-to-8 decoder.' },
        { c: 'assign {cout, s} = a + b + cin;   // a, b: 16 bits', o: HW, a: 4, w: 'The + operator on vectors becomes an adder; synthesis chooses its architecture (ripple, prefix…) from the timing constraints.' },
        { c: 'always_comb begin\n  gt = (a > b);\n  eq = (a == b);\nend', o: HW, a: 5, w: 'Relational and equality operators become a magnitude comparator.' }
      ]
    });
  }

  /* ---------- Widget: blocking vs non-blocking ---------- */
  function bnbLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Blocking vs non-blocking · same code, one character different</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var mode = 'nb', seen = { nb: 0, b: 0 }, D = [1, 0, 1, 1, 0, 0, 1, 0], state, cyc;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var bNb = L.btn('Non-blocking  <=', 'is-on', function () { setMode('nb'); });
    var bB = L.btn('Blocking  =', '', function () { setMode('b'); });
    row.appendChild(bNb); row.appendChild(bB);
    var codeBox = L.h('div', ''); body.appendChild(codeBox);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var r2 = L.h('div', 'l7-row'); body.appendChild(r2);
    r2.appendChild(L.btn('⏱ Clock edge', 'pri', step));
    r2.appendChild(L.btn('↺ Reset', 'ghost', reset));
    var tbl = L.h('div', 'l7-table-wrap'); body.appendChild(tbl);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function setMode(m) { mode = m; bNb.classList.toggle('is-on', m === 'nb'); bB.classList.toggle('is-on', m === 'b'); reset(); }
    function reset() { state = { q1: 0, q2: 0, q3: 0 }; cyc = []; draw(); }
    function step() {
      if (cyc.length >= D.length) return;
      var d = D[cyc.length];
      if (mode === 'nb') state = { q1: d, q2: state.q1, q3: state.q2 };   // all right-hand sides read BEFORE any update
      else { state.q1 = d; state.q2 = state.q1; state.q3 = state.q2; }   // each line sees the line above
      cyc.push({ d: d, q1: state.q1, q2: state.q2, q3: state.q3 });
      seen[mode]++;
      draw();
      if (seen.nb >= 4 && seen.b >= 4) { api.done(); L.fb(fb, 'ok', '🎉 Compare the two tables: with <= you get a 3-stage shift register; with = all three outputs copy d at once – the "shift register" collapsed. Rule: <= in always_ff, = in always_comb.'); }
    }
    function draw() {
      var op = mode === 'nb' ? '<=' : '= ';
      codeBox.innerHTML = L.code('always_ff @(posedge clk) begin\n  q1 ' + op + ' d;\n  q2 ' + op + ' q1;\n  q3 ' + op + ' q2;\nend');
      var o = '', ff = function (x, lbl) { return R(x, 30, 70, 56, 'box-on', 8) + T(x + 35, 54, 'D  Q', 't-dim t-sm') + T(x + 35, 74, lbl, 't-ink t-b') + '<path d="M' + x + ' 78l8 -5l-8 -5" class="w"/>'; };
      o += T(14, 62, 'd', 't-ink t-b', 'start');
      if (mode === 'nb') {
        o += P('M28 58H90', 'w-on') + ff(90, 'q1') + P('M160 58H230', 'w-on') + ff(230, 'q2') + P('M300 58H370', 'w-on') + ff(370, 'q3') + P('M440 58H470', 'w-on');
        o += T(300, 112, 'Synthesized: a 3-stage shift register (3 flip-flops in a chain)', 't-ok t-b t-sm');
      } else {
        o += P('M28 58H90M60 58V140H230V100M60 140H370V100', 'w-bad') + ff(90, 'q1') + ff(230, 'q2') + ff(370, 'q3');
        o += P('M230 100V86M370 100V86', 'w-bad') + T(300, 160, 'Synthesized: three flip-flops all loaded from d (often merged into ONE)', 't-bad t-b t-sm');
      }
      pic.innerHTML = S(600, 172, o, mode === 'nb' ? 'Shift register' : 'Collapsed registers');
      tbl.innerHTML = '<table class="l7-cmp"><tr><th>Clock</th><th>d</th><th>q1</th><th>q2</th><th>q3</th></tr>' +
        (cyc.length ? cyc.map(function (c, i) { return '<tr><td>' + (i + 1) + '</td><td>' + c.d + '</td><td>' + c.q1 + '</td><td>' + c.q2 + '</td><td>' + c.q3 + '</td></tr>'; }).join('') : '<tr><td colspan="5">Press "Clock edge" (d = 1, 0, 1, 1, 0, 0, 1, 0)</td></tr>') + '</table>';
      if (!(seen.nb >= 4 && seen.b >= 4)) L.fb(fb, 'info', 'Step at least 4 clock edges with <b>&lt;=</b> and 4 with <b>=</b>. (' + seen.nb + ' / 4 and ' + seen.b + ' / 4)');
    }
    reset();
  }

  /* ---------- Widget: parameters and generate ---------- */
  function paramLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Parameters + generate · one RTL description, many hardware sizes</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { W: 8, N: 4 }, n = 0;
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'Data width W', 4, 32, 4, p.W, function (v) { return v + ' bits'; }, function (v) { p.W = v; n++; upd(); });
    L.slider(c2, 'Pipeline stages N (generate loop)', 1, 8, 1, p.N, null, function (v) { p.N = v; n++; upd(); });
    var code = L.h('div', ''); body.appendChild(code);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function upd() {
      if (n >= 3) api.done();
      code.innerHTML = L.code('module delay_line #(parameter int W = ' + p.W + ', N = ' + p.N + ') (\n  input  logic         clk,\n  input  logic [W-1:0] d,\n  output logic [W-1:0] q);\n  logic [W-1:0] stage [0:N];\n  assign stage[0] = d;\n  for (genvar i = 0; i < N; i++) begin : g_stage   // generate loop\n    always_ff @(posedge clk) stage[i+1] <= stage[i];\n  end\n  assign q = stage[N];\nendmodule');
      var o = '', w = Math.min(64, 520 / p.N - 10);
      for (var i = 0; i < p.N; i++) { var x = 30 + i * (520 / p.N); o += R(x, 30, w, 50, 'box-on', 6) + T(x + w / 2, 60, 'W=' + p.W, 't-ink t-sm'); if (i < p.N - 1) o += P('M' + (x + w) + ' 55H' + (x + 520 / p.N), 'w-on'); }
      o += T(10, 59, 'd', 't-ink t-b', 'start') + T(300, 104, p.N + ' copies of a ' + p.W + '-bit register – created by the generate loop', 't-dim t-sm');
      pic.innerHTML = S(600, 114, o, 'Generated registers');
      out.innerHTML = '<span class="k">Flip-flops</span> N × W = ' + p.N + ' × ' + p.W + ' = <span class="v">' + p.N * p.W + '</span><br><span class="k">Latency</span> ' + p.N + ' clock cycle' + (p.N > 1 ? 's' : '') + '<br><span class="k">RTL lines changed</span> 0 – only the parameter values';
    }
    upd();
  }

  function procFrame(k) {
    var o = '';
    if (k < 2) {
      o += T(300, 22, k === 0 ? 'always_comb → combinational logic' : 'Every output assigned on every path → no latch', 't-vio t-b');
      o += R(60, 50, 120, 60, 'box', 8) + T(120, 85, 'inputs a, b, s', 't-ink t-sm') + P('M180 80H250', 'w-on flow') + R(250, 45, 120, 70, 'box-on', 10) + T(310, 85, 'logic', 't-ink t-b') + P('M370 80H440', 'w-on flow') + T(450, 85, 'y', 't-ink t-b', 'start');
      o += T(310, 140, k === 0 ? 'Output changes whenever an input changes – no clock, no memory' : 'Default value at the top of the block guarantees it', 't-dim t-sm');
    } else {
      o += T(300, 22, k === 2 ? 'always_ff → flip-flops' : 'Next-state logic + register', 't-vio t-b');
      o += R(60, 45, 140, 70, 'box', 8) + T(130, 85, k === 2 ? 'd' : 'next = f(q, in)', 't-ink t-sm') + P('M200 80H260', 'w-on') + R(260, 45, 90, 70, 'box-on', 8) + T(305, 80, 'FF', 't-ink t-b') + T(305, 98, '@posedge', 't-dim t-sm');
      o += P('M350 80H430', 'w-on') + T(440, 85, 'q', 't-ink t-b', 'start');
      if (k === 3) o += P('M390 80V140H100V115', 'w-cu') + T(245, 156, 'feedback: q is an input of the logic', 't-cu t-sm');
      else o += T(305, 140, 'q updates only on the clock edge (use <=)', 't-dim t-sm');
    }
    return S(600, 166, o, 'Procedural blocks and hardware');
  }

  L.module({
    n: 2,
    lead: 'You already know Verilog and SystemVerilog syntax. This module is about writing it the way RTL engineers do: code that synthesizes into exactly the hardware you intend – no more, no less.',
    tags: ['always_comb', 'always_ff', 'blocking vs non-blocking', 'parameters', 'generate', 'functions', 'interfaces', 'enums', 'coding conventions'],
    sections: [
      {
        id: 'c-subset', type: 'concept', title: 'The synthesizable subset', nav: 'Synthesizable subset',
        html: '<p>HDLs were designed for both <b>modelling</b> (simulation, testbenches) and <b>design</b>. Only part of the language describes real hardware. RTL code uses that part only:</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Synthesizable</h4><ul><li>always_comb, always_ff, assign</li><li>if / case / ? : on signals</li><li>arithmetic, logic, comparison operators</li><li>parameters, generate, functions, enums, structs, interfaces</li><li>for-loops with constant bounds (unrolled)</li></ul></div>' +
          '<div class="l7-box cu"><h4>Simulation-only</h4><ul><li># delays, wait, forever without a clock</li><li>initial blocks (except some FPGA ROM/RAM init)</li><li>$display, $random, file I/O</li><li>classes, dynamic arrays, fork/join</li><li>loops whose bound changes at run time</li></ul></div></div>'
      },
      {
        id: 'st-proc', type: 'steps', title: 'Animation: procedural blocks become hardware', nav: 'Blocks → hardware',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['<code>always_comb</code> describes combinational logic. The tool even checks that you did not accidentally create storage.', 'If some path does not assign the output, the hardware must remember the old value → a latch. Assign a default first.', '<code>always_ff @(posedge clk)</code> describes flip-flops. The tool checks that only flip-flops are inferred.', 'Real RTL = next-state logic (always_comb) feeding registers (always_ff), with the register outputs fed back.'][k], svg: procFrame(k) }; })
      },
      {
        id: 'c-proc', type: 'concept', title: 'always_comb, always_ff and the assignment rules', nav: 'Assignment rules',
        html: L.code('// combinational: blocking =, default first\nalways_comb begin\n  y = \'0;\n  if (en) y = a & b;\nend\n\n// sequential: non-blocking <=, reset + clock only\nalways_ff @(posedge clk or negedge rst_n)\n  if (!rst_n) q <= \'0;\n  else        q <= d;') +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Rule</th><th>Why</th></tr>' +
          '<tr><td>Use <code>&lt;=</code> in always_ff</td><td>All registers update together, like real flip-flops; order of lines does not matter.</td></tr>' +
          '<tr><td>Use <code>=</code> in always_comb</td><td>Intermediate values are used immediately, like signals flowing through gates.</td></tr>' +
          '<tr><td>Never mix them in one block</td><td>Simulation and synthesis can disagree.</td></tr>' +
          '<tr><td>Assign each signal in only one block</td><td>Two blocks driving one signal = multiple drivers.</td></tr></table></div>'
      },
      { id: 'w-bnb', type: 'widget', title: 'Blocking vs non-blocking lab', nav: 'B vs NB lab', intro: 'Clock the same 3-register code with <= and with =. Watch what the hardware becomes.', build: bnbLab },
      { id: 'w-syn', type: 'widget', title: '"What will this synthesize into?"', nav: 'Synthesis drill', intro: 'Pick the hardware each fragment creates: mux, register, counter, decoder, adder or comparator.', build: synthDrill },
      {
        id: 'c-param', type: 'concept', title: 'Parameters, generate and functions', nav: 'Parameters & generate',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>parameter / localparam</h4><p>Compile-time constants. Set per instance with <code>#(.W(16))</code>; localparam cannot be overridden.</p></div><div class="l7-box cu"><h4>generate</h4><p>for / if / case at elaboration time: creates N copies or chooses between structures. Always name the block.</p></div><div class="l7-box vio"><h4>function</h4><p>Reusable combinational logic (no timing). Declare <code>automatic</code>; tasks with delays are not synthesizable.</p></div></div>' +
          L.code('function automatic logic [3:0] popcount4 (input logic [3:0] x);\n  return x[0] + x[1] + x[2] + x[3];\nendfunction')
      },
      { id: 'w-par', type: 'widget', title: 'Parameters + generate lab', nav: 'Generate lab', intro: 'Change W and N (at least three changes). The RTL text stays the same; the hardware grows.', build: paramLab },
      {
        id: 'c-types', type: 'concept', title: 'enums, structs and interfaces', nav: 'Types & interfaces',
        html: L.code('typedef enum logic [1:0] {IDLE, LOAD, RUN, DONE} state_t;   // readable FSM states\nstate_t state, next;\n\ntypedef struct packed { logic valid; logic [7:0] data; } pkt_t;  // grouped signals\n\ninterface bus_if (input logic clk);\n  logic valid, ready; logic [31:0] data;\n  modport src (output valid, data, input  ready);\n  modport dst (input  valid, data, output ready);\nendinterface') +
          '<p><b>enum</b> gives states names (and lets the tool choose the encoding), <b>packed struct</b> groups related bits into one vector, and an <b>interface</b> bundles a protocol\'s wires so ports stay short and consistent.</p>'
      },
      {
        id: 'c-conv', type: 'concept', title: 'RTL coding conventions', nav: 'Conventions',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Naming</h4><ul><li><code>_n</code> for active-low (rst_n)</li><li><code>_q</code> / <code>_d</code> for register outputs / inputs</li><li><code>u_</code> for instances, <code>g_</code> for generate blocks</li><li>UPPER_CASE for parameters</li></ul></div><div class="l7-box"><h4>Structure</h4><ul><li>One module per file; file name = module name</li><li>Separate combinational and sequential blocks</li><li>Register outputs of reusable blocks</li><li>Every case has a default; every if-chain assigns everything</li></ul></div></div>'
      },
      {
        id: 'rv-2', type: 'reveal', title: 'Click to reveal: coding insights', nav: 'Reveal',
        items: [
          { q: 'Why prefer always_comb over always @(*)?', a: 'always_comb has a correct automatic sensitivity list, runs once at time zero, and tools warn if it infers a latch or if a variable is written by another block.' },
          { q: 'Is a for-loop synthesizable?', a: 'Yes, if its bounds are constants: it is unrolled into parallel hardware. It is not a loop in time.' },
          { q: 'What does an interface synthesize into?', a: 'Nothing special – its signals become ordinary wires and ports. It is a coding convenience.' },
          { q: 'Can a function contain a clock?', a: 'No. Functions describe combinational logic and complete in zero time.' },
          { q: 'Why give generate blocks names?', a: 'Named blocks (g_stage[3]) produce predictable hierarchical names in netlists, reports and waveforms.' },
          { q: 'Does the order of always blocks in a file matter?', a: 'No – they are concurrent hardware.' }
        ]
      },
      {
        id: 'dd-2', type: 'drag', title: 'Drag & drop: synthesizable or simulation-only?', nav: 'Drag & drop',
        bins: ['Synthesizable', 'Simulation only'],
        items: [['always_ff @(posedge clk)', 0], ['parameter WIDTH = 16', 0], ['for (genvar i = 0; i < 8; i++)', 0], ['typedef enum logic [1:0]', 0], ['#5 a = 1;', 1], ['$display("x=%d", x);', 1], ['initial forever #5 clk = ~clk;', 1], ['class packet;', 1]]
      },
      {
        id: 'calc2', type: 'calc', title: 'Code-sizing calculations', nav: 'Calculate',
        items: [
          { q: 'A delay_line has W = 12 and N = 5. How many flip-flops does it create?', a: 60, h: 'N × W.', s: '5 × 12 = <b>60</b>.' },
          { q: 'An enum has 6 states and is binary-encoded. How many state bits are needed?', a: 3, h: 'ceil(log2 6).', s: '<b>3</b> bits (one-hot would need 6).' },
          { q: 'A generate loop instantiates one 8-bit adder for each of 16 channels. How many 1-bit full adders (ripple) is that?', a: 128, h: '16 × 8.', s: '<b>128</b>.' },
          { q: 'A packed struct holds valid (1), id (4) and data (32). How wide is it in bits?', a: 37, h: 'Add the fields.', s: '<b>37</b> bits.' },
          { q: 'With non-blocking assignments, after 3 clock edges of d = 1, 0, 1 (all registers starting at 0), what is q3 in the 3-stage shift register?', a: 1, h: 'q3 holds d from 3 edges ago.', s: 'q3 = first d = <b>1</b>.' }
        ]
      },
      {
        id: 'mcq2', type: 'mcq', title: 'Code-based MCQs', nav: 'MCQ',
        items: [
          { q: 'Inside <code>always_ff</code> you should use…', o: ['=', '<=', 'assign', '#1'], a: 1, w: '' },
          { q: '<code>always_comb y = s ? a : b;</code> creates…', o: ['a register', 'a mux', 'a latch', 'a counter'], a: 1, w: '' },
          { q: 'Which is NOT synthesizable?', o: ['parameter', 'always_ff', '#10 delay', 'case'], a: 2, w: '' },
          { q: 'A localparam…', o: ['can be overridden per instance', 'cannot be overridden', 'exists only in simulation', 'is a register'], a: 1, w: '' }
        ]
      },
      {
        id: 'short2', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain why non-blocking assignments are used for registers and blocking assignments for combinational logic.', k: ['same time|together|simultaneous', 'order', 'immediate|flow', 'mismatch|race|collapse'], m: 'Non-blocking assignments evaluate every right-hand side before any register updates, so all registers change together on the clock edge, as in hardware, and the order of statements does not matter. Blocking assignments update immediately, so values flow from one statement to the next like signals through gates. Using blocking in clocked blocks can collapse pipelines or cause simulation races and simulation/synthesis mismatches.' },
          { q: 'What do parameters and generate let a designer do?', k: ['parameter|width', 'generate', 'copies|replicat|instances', 'reuse'], m: 'Parameters make sizes and options configurable per instance; generate creates multiple copies of logic or chooses between structures at elaboration time. Together they let one RTL description serve many configurations, improving reuse.' }
        ]
      },
      {
        id: 'scen2', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A 4-stage pipeline written with blocking assignments in one always_ff works in simulation as a 1-cycle delay instead of 4.', q: 'What is the fix?', o: [{ t: 'Use non-blocking <= for all register assignments', ok: true, w: 'Then each stage takes the previous stage\'s OLD value.' }, { t: 'Reorder the lines from last stage to first', ok: false, w: 'That happens to work but is fragile; use <=.' }, { t: 'Add #1 delays', ok: false, w: 'Delays are ignored by synthesis.' }] },
          { s: 'The same 32-bit FIFO is needed with depths 8, 16 and 64 in three places.', q: 'Best approach?', o: [{ t: 'One parameterised FIFO module with DEPTH and WIDTH parameters', ok: true, w: 'Reuse with different parameter values.' }, { t: 'Three copied modules', ok: false, w: 'Hard to maintain.' }, { t: 'A single 64-deep FIFO used everywhere', ok: false, w: 'Wastes area.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'always_ff describes…', o: ['combinational logic', 'flip-flops', 'latches only', 'testbenches'], a: 1, w: '' },
      { d: 'Easy', q: 'Which is simulation-only?', o: ['assign', '$display', 'parameter', 'generate'], a: 1, w: '' },
      { d: 'Easy', q: 'typedef enum is mainly used for…', o: ['delays', 'named FSM states', 'memories', 'clocks'], a: 1, w: '' },
      { d: 'Medium', q: '<code>always_ff @(posedge clk) cnt &lt;= cnt + 1;</code> synthesizes into…', o: ['adder only', 'counter', 'latch', 'decoder'], a: 1, w: '' },
      { d: 'Medium', q: 'A generate loop with N = 4 around one register creates…', o: ['1 register', '4 registers', 'a counter', 'nothing'], a: 1, w: '' },
      { d: 'Medium', q: 'Using = for q2 = q1; q1 = d; (in that order) in always_ff gives…', o: ['a shift register', 'two registers both from d', 'a latch', 'a mux'], a: 0, w: 'Reverse order happens to work – but <= is the correct style.' },
      { d: 'Medium', q: 'A 5-state enum, one-hot encoded, needs…', o: ['3 bits', '5 bits', '2 bits', '8 bits'], a: 1, w: '' },
      { d: 'Hard', q: 'Two always_comb blocks both assign y. The result is…', o: ['an OR gate', 'multiple drivers – an error', 'a latch', 'a mux'], a: 1, w: '' },
      { d: 'Hard', q: 'An interface with modports synthesizes into…', o: ['special bus hardware', 'ordinary wires/ports', 'a FIFO', 'nothing at all'], a: 1, w: '' },
      { d: 'Hard', q: 'Why is <code>for (i = 0; i &lt; n; i++)</code> with n an input signal not synthesizable?', o: ['loops are never synthesizable', 'the bound must be a constant to unroll', 'i must be a genvar', 'n must be signed'], a: 1, w: '' }
    ]
  });
})();
