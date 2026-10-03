/* Level 9 · Module 1 – RTL Design Fundamentals */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Widget: datapath or control? ---------- */
  var BLOCKS = [
    ['Operand register A', 0, 'Stores data words – a datapath register.'],
    ['Adder', 0, 'Operates on data – datapath.'],
    ['2:1 mux (load / accumulate)', 0, 'Steers data; its select comes from the controller – the mux itself is datapath.'],
    ['Accumulator register', 0, 'Holds the running sum – datapath.'],
    ['Comparator (sum ≥ limit)', 0, 'Computes a STATUS signal from data. It lives in the datapath and reports to the controller.'],
    ['State register', 1, 'Remembers which step the machine is in – control.'],
    ['Next-state logic', 1, 'Decides the next step from state and status – control.'],
    ['Output decoder (load, sel, done)', 1, 'Generates control signals for the datapath – control.']
  ];
  function dpcLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>RTL block diagram · classify every block as datapath or control</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var pick = {};
    var o = '';
    o += R(10, 20, 380, 190, 'box', 14) + T(200, 40, 'DATAPATH', 't-sig t-b t-sm');
    o += R(30, 55, 90, 36, 'box-on', 8) + T(75, 78, 'Reg A', 't-ink t-sm');
    o += R(150, 55, 80, 36, 'box-on', 8) + T(190, 78, 'Adder', 't-ink t-sm');
    o += R(150, 115, 80, 36, 'box-on', 8) + T(190, 138, 'MUX', 't-ink t-sm');
    o += R(260, 115, 110, 36, 'box-on', 8) + T(315, 138, 'ACC reg', 't-ink t-sm');
    o += R(260, 165, 110, 32, 'box-on', 8) + T(315, 185, 'sum ≥ limit', 't-ink t-sm');
    o += P('M120 73H150M230 73H245V133H230M190 115V91M370 133H380V100H200V91M315 151V165', 'w');
    o += R(420, 40, 150, 150, 'box-vio', 14) + T(495, 60, 'CONTROL', 't-vio t-b t-sm');
    o += R(440, 72, 110, 30, 'box', 6) + T(495, 92, 'state reg', 't-ink t-sm') + R(440, 110, 110, 30, 'box', 6) + T(495, 130, 'next-state', 't-ink t-sm') + R(440, 148, 110, 30, 'box', 6) + T(495, 168, 'outputs', 't-ink t-sm');
    o += P('M370 181H420', 'w-cu') + T(395, 176, 'status', 't-cu t-sm');
    o += P('M420 163H400V214H190V151', 'w-vio') + T(300, 228, 'control signals: load, sel, done', 't-vio t-sm');
    body.appendChild(L.h('div', 'l7-svgbox', S(590, 236, o, 'Accumulator datapath with controller')));
    var list = L.h('div', ''); body.appendChild(list);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    BLOCKS.forEach(function (b, i) {
      var row = L.h('div', 'l7-row'); row.style.alignItems = 'center'; row.style.justifyContent = 'space-between'; row.style.borderBottom = '1px solid var(--l7-line)'; row.style.padding = '6px 0';
      row.appendChild(L.h('span', '', '<b>' + b[0] + '</b>'));
      var g = L.h('div', 'l7-row'); g.style.margin = '0';
      ['Datapath', 'Control'].forEach(function (lbl, k) {
        var bt = L.btn(lbl, '', function () {
          pick[i] = k;
          L.$$('button', g).forEach(function (x, j) { x.classList.toggle('is-on', j === k); });
          var ok = k === b[1];
          row.style.background = ok ? 'var(--l7-ok-dim)' : 'var(--l7-bad-dim)';
          L.fb(fb, ok ? 'ok' : 'bad', (ok ? '✓ ' : '✗ ') + b[0] + ': ' + (ok ? b[2] : 'not quite – ask: does it store/transform DATA, or decide WHEN things happen?'));
          var right = BLOCKS.filter(function (x, j) { return pick[j] === x[1]; }).length;
          if (right === BLOCKS.length) { L.fb(fb, 'ok', '🎉 All 8 correct. Datapath = registers and operators on data; control = the FSM that sequences them. Status flows up, control signals flow down.'); api.done(); }
        });
        bt.style.padding = '6px 12px'; g.appendChild(bt);
      });
      row.appendChild(g); list.appendChild(row);
    });
  }

  /* ---------- Widget: what hardware will this RTL create? ---------- */
  var HW = [
    { c: 'always_ff @(posedge clk)\n  if (en) r <= d;', o: ['D flip-flops with an enable (mux feeding back Q)', 'A transparent latch', 'A 2:1 mux only, no storage', 'A counter'], a: 0, w: 'A clocked block with "if (en)" and no else keeps the old value when en = 0: registers whose D input is a mux between d and q (or a clock-enable flip-flop).' },
    { c: 'assign y = sel ? a : b;', o: ['A 2:1 multiplexer', 'A register', 'A tri-state buffer', 'A comparator'], a: 0, w: 'A conditional (ternary) assignment is pure combinational selection: a multiplexer.' },
    { c: 'always_ff @(posedge clk)\n  if (rst) cnt <= 0;\n  else     cnt <= cnt + 1;', o: ['A register plus an incrementer in a feedback loop (counter)', 'Only an adder', 'A shift register', 'A latch with reset'], a: 0, w: 'The register output feeds an incrementer whose result feeds back to the register: a synchronous counter.' },
    { c: '// register-transfer notation\nif (load) R3 <= R1 + R2;', o: ['An adder whose output goes into register R3, enabled by load', 'Three adders', 'A mux between R1 and R2', 'A decoder'], a: 0, w: 'R3 ← R1 + R2 describes one adder (combinational) and one destination register written when load is true.' },
    { c: 'assign eq = (a == b);   // a, b: 8 bits', o: ['An equality comparator: 8 XNORs and an AND tree', 'A subtractor and a register', 'An 8-bit latch', 'A priority encoder'], a: 0, w: 'Equality compares bit pairs (XNOR) and ANDs the results.' },
    { c: 'always_comb\n  case (s)\n    2\'d0: y = 4\'b0001;\n    2\'d1: y = 4\'b0010;\n    2\'d2: y = 4\'b0100;\n    default: y = 4\'b1000;\n  endcase', o: ['A 2-to-4 decoder', 'A 4-to-2 encoder', 'A 4-bit register', 'A barrel shifter'], a: 0, w: 'Each code of s drives exactly one output bit high: a 2-to-4 (one-hot) decoder.' }
  ];
  function hwLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>What hardware will this RTL create?</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, ok = {};
    var dots = L.h('div', 'l7-progdots'); body.appendChild(dots);
    var box = L.h('div', ''); body.appendChild(box);
    function show() {
      var it = HW[cur];
      dots.innerHTML = HW.map(function (x, i) { return '<span class="' + (ok[i] ? 'ok' : i === cur ? 'cur' : '') + '"></span>'; }).join('');
      box.innerHTML = '<p class="l7-hint">RTL ' + (cur + 1) + ' of ' + HW.length + '</p>' + L.code(it.c);
      var ch = L.h('div', 'l7-choice'); box.appendChild(ch);
      var fb = L.h('div', 'l7-fb'); box.appendChild(fb);
      var order = it.o.map(function (x, k) { return k; }).sort(function () { return Math.random() - 0.5; });
      order.forEach(function (k) {
        var t = it.o[k];
        var b = L.h('button', '', t); b.type = 'button';
        b.addEventListener('click', function () {
          L.$$('button', ch).forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); });
          b.classList.add(k === it.a ? 'is-right' : 'is-wrong');
          if (k === it.a) {
            ok[cur] = 1; L.fb(fb, 'ok', '✓ ' + it.w);
            var row = L.h('div', 'l7-row'); fb.appendChild(row);
            var n = Object.keys(ok).length;
            if (n === HW.length) { api.done(); row.appendChild(L.h('b', '', '🎉 All six recognised.')); }
            else row.appendChild(L.btn('Next RTL →', 'pri', function () { cur = (cur + 1) % HW.length; while (ok[cur]) cur = (cur + 1) % HW.length; show(); }));
          } else L.fb(fb, 'bad', '✗ Think about storage (clock?), selection (? : / case) and arithmetic.');
        });
        ch.appendChild(b);
      });
      dots.innerHTML = HW.map(function (x, i) { return '<span class="' + (ok[i] ? 'ok' : i === cur ? 'cur' : '') + '"></span>'; }).join('');
    }
    show();
  }

  function absFrame(k) {
    var lv = [['System / behavioural', 'what the design does (algorithm, transaction)'], ['Register-transfer level', 'registers + operations between them, per clock cycle'], ['Gate level', 'logic gates and flip-flops (the netlist)'], ['Transistor / layout', 'devices and geometry (Levels 4, 7, 10)']];
    var o = '';
    lv.forEach(function (x, i) {
      var y = 14 + i * 50, on = i === k;
      o += R(30 + i * 22, y, 420 - i * 44, 40, on ? 'box-on' : 'box', 10) + T(240, y + 18, x[0], on ? 't-ink t-b' : 't-dim t-b') + T(240, y + 33, x[1], 't-dim t-sm');
    });
    o += P('M490 20V200', 'w-cu') + '<path d="M484 190l6 12l6 -12z" fill="#ff9500"/>' + T(500, 110, 'more detail', 't-cu t-sm', 'start');
    return S(600, 216, o, 'Abstraction levels');
  }

  L.module({
    n: 1,
    lead: 'Real chips are designed at the register-transfer level: registers that hold values and the operations that move data between them on every clock edge. Learn to think in RTL – and to see the hardware behind every line.',
    tags: ['RTL abstraction', 'HDL vs software', 'datapath & control', 'synchronous design', 'hierarchy', 'reusable blocks'],
    sections: [
      {
        id: 'c-rtl', type: 'concept', title: 'What "register-transfer level" means', nav: 'RTL concept',
        html: '<p>At RTL a design is described as <b>registers</b> (state, updated on clock edges) and the <b>combinational operations</b> that compute their next values. One register transfer is written as:</p>' +
          '<div class="l7-eq">R3 ← R1 + R2      (when load = 1, at the next clock edge)</div>' +
          '<p>RTL is the level at which engineers write synthesizable HDL: detailed enough to fix the cycle-by-cycle behaviour and the hardware structure, abstract enough that a synthesis tool chooses the actual gates.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Registers</h4><p>Where values live between clock edges.</p></div><div class="l7-box cu"><h4>Operations</h4><p>Adders, comparators, muxes, logic – everything between registers.</p></div><div class="l7-box vio"><h4>Timing reference</h4><p>The clock: all transfers happen on its edge.</p></div></div>'
      },
      {
        id: 'st-abs', type: 'steps', title: 'Animation: abstraction levels', nav: 'Abstraction',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['<b>Behavioural</b>: "compute the average of 8 samples" – no clock cycles or hardware yet.', '<b>RTL</b>: an accumulator register, an adder, a counter and a shift for ÷8 – fixed per clock cycle. <i>This level is the subject of Level 9.</i>', '<b>Gate level</b>: synthesis turns the RTL into library cells (AND, OR, flip-flops) – the netlist.', '<b>Transistor / layout</b>: the cells become transistors and polygons – covered in Levels 4, 7 and 10.'][k], svg: absFrame(k) }; })
      },
      {
        id: 'c-hdl', type: 'concept', title: 'Hardware description is not software programming', nav: 'HDL vs software',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th></th><th>Software (C, Python)</th><th>RTL (Verilog / SystemVerilog)</th></tr>' +
          '<tr><td>Execution</td><td>statements run one after another</td><td>every block is hardware that exists and works <b>in parallel</b></td></tr>' +
          '<tr><td>A variable</td><td>a memory location</td><td>a wire (combinational) or a register (clocked)</td></tr>' +
          '<tr><td>A loop</td><td>repeats in time</td><td>is <b>unrolled</b> into copies of hardware</td></tr>' +
          '<tr><td>Time</td><td>as fast as possible</td><td>counted in clock cycles</td></tr>' +
          '<tr><td>Cost of a line</td><td>CPU time</td><td>area, delay and power in silicon</td></tr></table></div>' +
          '<p>The habit to build: <b>for every line you write, picture the hardware it creates.</b></p>'
      },
      {
        id: 'c-dpc', type: 'concept', title: 'Datapath and control', nav: 'Datapath & control',
        html: '<p>Almost every RTL design splits into two cooperating parts:</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Datapath</h4><p>Registers, adders, multipliers, muxes, comparators – the parts that <b>store and transform data</b>. It produces <b>status</b> signals (zero, overflow, sum ≥ limit).</p></div>' +
          '<div class="l7-box vio"><h4>Control</h4><p>Usually an FSM. It reads status signals and produces <b>control</b> signals (load, select, write enable, done) that tell the datapath what to do each cycle.</p></div></div>' +
          '<p style="margin-top:12px">Keeping them separate makes RTL easier to read, verify, reuse and synthesize.</p>'
      },
      { id: 'w-dpc', type: 'widget', title: 'RTL block diagram: datapath or control?', nav: 'Classify blocks', intro: 'Classify all eight blocks of this accumulator design.', build: dpcLab },
      { id: 'w-hw', type: 'widget', title: '"What hardware will this RTL create?"', nav: 'RTL → hardware', intro: 'Read each RTL fragment and pick the hardware it describes. Get all six right.', build: hwLab },
      {
        id: 'c-sync', type: 'concept', title: 'Synchronous RTL design principles', nav: 'Synchronous design',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Do</h4><ul><li>Update all state on one edge of one clock (per clock domain)</li><li>Put only combinational logic between registers</li><li>Reset every register that needs a known start value</li><li>Use enables, not gated clocks, to hold a register</li></ul></div>' +
          '<div class="l7-box"><h4>Avoid</h4><ul><li>Combinational feedback loops</li><li>Latches (unless designed on purpose)</li><li>Logic on clock or reset nets in RTL</li><li>Signals crossing clock domains without a synchronizer</li></ul></div></div>' +
          '<p style="margin-top:12px">These rules make the design predictable for simulation, synthesis and timing analysis.</p>'
      },
      {
        id: 'c-hier', type: 'concept', title: 'Hierarchy, modular design and reusable blocks', nav: 'Hierarchy',
        html: '<p>Large designs are built as a <b>hierarchy</b> of modules: a top module instantiates sub-modules (datapath, controller, FIFOs), which may instantiate smaller blocks.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>One job per module</h4><p>Easy to understand, test and replace.</p></div><div class="l7-box cu"><h4>Parameters</h4><p>WIDTH, DEPTH… let one block serve many designs.</p></div><div class="l7-box vio"><h4>Clean interfaces</h4><p>Registered outputs and documented handshakes make blocks reusable.</p></div></div>' +
          L.code('module top (input logic clk, rst, ...);\n  datapath   #(.WIDTH(16)) u_dp  (.clk, .rst, .load, .sel, .ge);\n  controller                u_ctl (.clk, .rst, .ge, .load, .sel, .done);\nendmodule')
      },
      {
        id: 'rv-1', type: 'reveal', title: 'Click to reveal: thinking in RTL', nav: 'Reveal',
        items: [
          { q: 'Why is RTL the main design entry level?', a: 'It fixes cycle behaviour and structure precisely, yet leaves gate choice to synthesis – a good balance of control and productivity.' },
          { q: 'Does writing lines in a different order change the hardware?', a: 'Not between separate always blocks or assign statements – they are all parallel hardware. Order matters only inside a procedural block.' },
          { q: 'What does a for-loop become in RTL?', a: 'Replicated hardware – one copy per iteration – not a loop in time.' },
          { q: 'Where do status signals go?', a: 'From the datapath to the controller, which uses them to choose the next state.' },
          { q: 'Why avoid gated clocks in RTL?', a: 'They create skew and glitches; use an enable on the register instead. Low-power clock gating is inserted by tools with special cells (Level 8).' },
          { q: 'What makes a block reusable?', a: 'Parameters, a clear interface, synchronous behaviour and documentation of its timing (e.g., one-cycle latency).' }
        ]
      },
      {
        id: 'dd-1', type: 'drag', title: 'Drag & drop: register-transfer operations', nav: 'Drag & drop',
        bins: ['Storage (register)', 'Combinational operation', 'Control decision'],
        items: [['R ← R (hold when en = 0)', 0], ['ACC ← ACC + IN', 0], ['Y = A & B', 1], ['SUM = A + B', 1], ['SEL = (state == LOAD)', 2], ['next_state = go ? RUN : IDLE', 2], ['PC ← PC + 4', 0], ['EQ = (A == B)', 1]]
      },
      {
        id: 'calc1', type: 'calc', title: 'RTL resource counting', nav: 'Calculate',
        items: [
          { q: 'A register file has 8 registers of 16 bits each. How many flip-flops does it contain?', a: 128, h: 'registers × bits.', s: '8 × 16 = <b>128</b> flip-flops.' },
          { q: 'How many bits does a counter need to count from 0 to 99?', a: 7, h: '2^n must be ≥ 100.', s: '2⁶ = 64 < 100 ≤ 128 = 2⁷ → <b>7 bits</b>.' },
          { q: 'A datapath has three 8-bit registers; its controller has 5 states, one-hot encoded. How many flip-flops in total?', a: 29, h: 'One-hot uses one flip-flop per state.', s: '3 × 8 + 5 = <b>29</b>.' },
          { q: 'RTL: if (load) R3 <= R1 + R2; with 12-bit registers. How many 1-bit full adders does a ripple implementation of the adder need?', a: 12, h: 'One per bit.', s: '<b>12</b> (synthesis may choose a faster structure).' },
          { q: 'A for-loop in RTL runs 4 times and each iteration contains one 8-bit adder. How many adders are built?', a: 4, h: 'Loops are unrolled.', s: '<b>4</b> separate adders.' }
        ]
      },
      {
        id: 'mcq1', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'In RTL, two separate always blocks…', o: ['run one after the other', 'are parallel hardware', 'run only in simulation', 'share one register'], a: 1, w: '' },
          { q: 'A status signal such as "count == 9" usually goes…', o: ['from control to datapath', 'from datapath to control', 'to the clock', 'off-chip'], a: 1, w: '' },
          { q: 'Which belongs to the controller?', o: ['ALU', 'next-state logic', 'register file', 'shifter'], a: 1, w: '' },
          { q: 'The preferred way to hold a register value is…', o: ['gate its clock', 'use an enable', 'use a latch', 'use a delay'], a: 1, w: '' }
        ]
      },
      {
        id: 'short1', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain the difference between describing hardware with an HDL and writing a software program.', k: ['parallel|concurren', 'hardware|circuit|gates', 'clock|cycle', 'loop|unroll|replicat'], m: 'Software runs statements sequentially on a processor. An HDL describes hardware structures that all exist and operate in parallel; signals are wires or registers, time is measured in clock cycles, and constructs such as loops are unrolled into replicated hardware. Every line has a cost in area, delay and power.' },
          { q: 'Describe the roles of the datapath and the controller in an RTL design.', k: ['datapath|data', 'register|adder|mux', 'control|fsm|state', 'status|signal'], m: 'The datapath stores and transforms data using registers, adders, muxes and comparators and produces status signals. The controller, usually an FSM, reads the status signals and generates control signals (load, select, enable, done) that sequence the datapath operations cycle by cycle.' }
        ]
      },
      {
        id: 'scen1', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A student writes a 1000-iteration for-loop in RTL to "process an array one element per iteration".', q: 'What is the likely result?', o: [{ t: '1000 copies of the loop hardware – enormous area; the intended one-per-cycle behaviour needs a counter and FSM', ok: true, w: 'Loops unroll in space, not time.' }, { t: 'A small circuit that takes 1000 clock cycles', ok: false, w: 'That needs explicit registers and a counter.' }, { t: 'A software routine inside the chip', ok: false, w: 'RTL has no processor.' }] },
          { s: 'Your design has one huge always block mixing data operations and state decisions.', q: 'What is the best improvement?', o: [{ t: 'Split it into a datapath module and a controller FSM with clear control/status signals', ok: true, w: 'Easier to read, verify and synthesize.' }, { t: 'Add more comments only', ok: false, w: 'Structure matters more.' }, { t: 'Convert it to a latch-based design', ok: false, w: 'That makes it worse.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'RTL stands for…', o: ['Register-Transfer Level', 'Real-Time Logic', 'Resistor-Transistor Logic', 'Routing-Timing Layer'], a: 0, w: '' },
      { d: 'Easy', q: 'At RTL, state is held in…', o: ['wires', 'registers', 'testbenches', 'comments'], a: 1, w: '' },
      { d: 'Easy', q: 'The controller of an RTL design is usually…', o: ['an adder', 'an FSM', 'a memory', 'a multiplier'], a: 1, w: '' },
      { d: 'Medium', q: 'What does <code>always_ff @(posedge clk) if (en) q &lt;= d;</code> create?', o: ['latch', 'flip-flop with enable', 'mux only', 'counter'], a: 1, w: '' },
      { d: 'Medium', q: 'A for-loop with 8 iterations each containing a comparator creates…', o: ['1 comparator used 8 times', '8 comparators', 'no hardware', 'a counter'], a: 1, w: 'Unrolled.' },
      { d: 'Medium', q: 'Which signal is a control signal?', o: ['sum', 'acc_load', 'operand_a', 'product'], a: 1, w: '' },
      { d: 'Medium', q: '6 registers × 32 bits need how many flip-flops?', o: ['38', '96', '192', '64'], a: 2, w: '6 × 32.' },
      { d: 'Hard', q: 'Why are gated clocks avoided in RTL?', o: ['they use more memory', 'they cause skew and glitches; enables are safer', 'they are not legal Verilog', 'they slow simulation only'], a: 1, w: '' },
      { d: 'Hard', q: 'R2 ← R1 + R2 executed when en = 1 describes…', o: ['an adder and register R2 with enable, feeding back', 'two registers swapping', 'a latch', 'a decoder'], a: 0, w: '' },
      { d: 'Hard', q: 'Which design practice most improves reuse?', o: ['hard-coded widths', 'parameterised modules with clear interfaces', 'one module per chip', 'mixing data and control'], a: 1, w: '' }
    ]
  });
})();
