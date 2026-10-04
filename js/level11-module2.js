/* Level 11 · Module 2 – SystemVerilog for Verification */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var SLOTS = [
    { id: 'gen', x: 20, y: 30, n: 'Generator', why: 'creates randomised transaction objects (class with rand fields)' },
    { id: 'mbx', x: 160, y: 30, n: 'Mailbox', why: 'passes transactions from generator to driver (thread-safe FIFO)' },
    { id: 'drv', x: 300, y: 30, n: 'Driver', why: 'converts each transaction into pin wiggles through the interface' },
    { id: 'if', x: 440, y: 30, n: 'Interface + clocking block', why: 'bundles the DUT signals and gives race-free sampling/driving' },
    { id: 'dut', x: 440, y: 130, n: 'DUT', why: 'the design under test' },
    { id: 'mon', x: 300, y: 130, n: 'Monitor', why: 'watches the pins and rebuilds transactions (never drives)' },
    { id: 'ref', x: 20, y: 230, n: 'Reference model', why: 'computes the expected result for each input transaction' },
    { id: 'sb', x: 160, y: 130, n: 'Scoreboard', why: 'compares actual results from the monitor with expected ones' }
  ];

  /* ---------- Widget: build a simple verification environment ---------- */
  function envLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Build a simple verification environment · tap a component, then its box</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var placed = {}, sel = null, done = false, order = SLOTS.map(function (s) { return s.id; }).sort(function () { return Math.random() - 0.5; });
    var tray = L.h('div', 'l7-row'); body.appendChild(tray);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var code = L.h('div', ''); body.appendChild(code);
    function draw() {
      tray.innerHTML = '';
      order.forEach(function (id) { if (placed[id]) return; var s = SLOTS.filter(function (q) { return q.id === id; })[0]; tray.appendChild(L.btn(s.n, sel === id ? 'is-on' : 'pri', function () { sel = id; draw(); })); });
      var o = '';
      o += P('M140 55H160M280 55H300M420 55H440M500 80V130M440 155H420M300 155H280M80 230V185H160', 'w-on');
      SLOTS.forEach(function (s) {
        var f = placed[s.id];
        o += '<g class="click" data-id="' + s.id + '" role="button" tabindex="0">' + R(s.x, s.y, 120, 50, f ? 'box-ok' : 'box', 10) + T(s.x + 60, s.y + (f ? 22 : 30), f ? s.n : '?', f ? 't-ink t-b t-sm' : 't-dim t-b') + (f && s.n.length > 14 ? '' : '') + '</g>';
      });
      o += T(220, 300, 'stimulus → driver → DUT → monitor → scoreboard ← reference model', 't-dim t-sm');
      pic.innerHTML = S(580, 312, o, 'Verification environment');
      L.$$('g.click', pic).forEach(function (g) {
        g.addEventListener('click', function () {
          var id = g.getAttribute('data-id');
          if (placed[id]) return;
          if (!sel) { L.fb(fb, 'info', 'First tap a component above.'); return; }
          var s = SLOTS.filter(function (q) { return q.id === id; })[0];
          if (sel === id) { placed[id] = 1; L.fb(fb, 'ok', '✓ ' + s.n + ' – ' + s.why + '.'); sel = null; draw(); }
          else { var w = SLOTS.filter(function (q) { return q.id === sel; })[0]; L.fb(fb, 'bad', '✗ The ' + w.n + ' ' + w.why + ' – it belongs somewhere else.'); }
        });
      });
      if (Object.keys(placed).length === SLOTS.length && !done) {
        done = true; api.done();
        L.fb(fb, 'ok', '🎉 Environment complete. Every arrow is a SystemVerilog construct: classes for transactions, a mailbox between threads, a virtual interface for the pins.');
        code.innerHTML = L.code('class txn; rand bit [7:0] a, b; rand op_t op; endclass\n\nclass driver;\n  virtual alu_if.drv vif;           // pins through a clocking block\n  mailbox #(txn) gen2drv;\n  task run(); txn t;\n    forever begin gen2drv.get(t); @(vif.cb); vif.cb.a <= t.a; vif.cb.b <= t.b; vif.cb.op <= t.op; end\n  endtask\nendclass\n\nclass scoreboard;\n  mailbox #(txn) mon2sb;  ref_model rm;\n  task run(); txn t; forever begin mon2sb.get(t); if (t.y !== rm.predict(t)) $error("mismatch"); end endtask\nendclass');
      }
    }
    draw();
  }

  /* ---------- Widget: which construct? ---------- */
  function constructDrill(root, api) {
    L.drill(root, api, {
      bar: 'Which SystemVerilog feature solves this verification need?', label: 'Need',
      items: [
        { q: 'Generator and driver run as separate threads and must pass transactions safely.', o: ['mailbox', 'parameter', 'generate loop', 'always_ff'], a: 0, w: 'A mailbox is a thread-safe FIFO between processes.' },
        { q: 'Avoid races between testbench driving and DUT sampling at the clock edge.', o: ['clocking block', 'initial block', 'function', '#0 delays'], a: 0, w: 'Clocking blocks define when signals are sampled and driven relative to the clock.' },
        { q: 'One base transaction, plus a variant that adds an error field, used by the same driver.', o: ['inheritance + polymorphism (virtual methods)', 'a second interface', 'a covergroup', 'a macro'], a: 0, w: 'Derived classes extend the base; the driver calls virtual methods without knowing the exact type.' },
        { q: 'A class component needs to reach the DUT pins.', o: ['virtual interface', 'a global wire', 'a hierarchical path in every class', 'a mailbox'], a: 0, w: 'Classes cannot hold static interfaces; a virtual interface handle points to the real one.' },
        { q: 'Each transaction must have legal but random field values.', o: ['rand variables + constraints, randomize()', '$random in the driver', 'a lookup table', 'force/release'], a: 0, w: 'The constraint solver produces legal random objects (Module 3).' }
      ]
    });
  }

  function layerFrame(k) {
    var lay = [['Test', 'chooses scenario, configuration, seeds'], ['Scenario / generator', 'creates transactions (objects)'], ['Functional: driver, monitor, scoreboard', 'transaction-level work'], ['Command: interface + clocking block', 'pin-level timing'], ['DUT', 'RTL under test']], o = '';
    lay.forEach(function (l, i) { var y = 12 + i * 36; o += R(60 + i * 12, y, 440 - i * 24, 30, i === k ? 'box-on' : 'box', 8) + T(280, y + 20, l[0] + ' – ' + l[1], i === k ? 't-ink t-b t-sm' : 't-dim t-sm'); });
    return S(600, 196, o, 'Layered testbench');
  }

  L.module({
    n: 2,
    lead: 'Level 6 taught the SystemVerilog language features. Here they become engineering tools: transactions as objects, components as classes, mailboxes between threads and interfaces with clocking blocks at the DUT boundary – assembled into a reusable environment.',
    tags: ['classes & objects', 'encapsulation', 'inheritance', 'polymorphism', 'randomisation', 'mailboxes', 'interfaces', 'clocking blocks', 'components'],
    sections: [
      {
        id: 'c-why', type: 'concept', title: 'Why verification uses object-oriented code', nav: 'Why OOP?',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Transactions</h4><p>A class bundles one operation (fields + methods): easy to randomise, copy, print, compare.</p></div><div class="l7-box cu"><h4>Components</h4><p>Driver, monitor, scoreboard are classes with clear jobs (encapsulation), reused across tests.</p></div><div class="l7-box vio"><h4>Extension</h4><p>Inheritance and virtual methods let a new test change behaviour without editing the environment.</p></div></div>' +
          '<p style="margin-top:12px">(Syntax of classes, interfaces and randomisation: Level 6 Modules 5, 6 and 8.)</p>'
      },
      {
        id: 'st-layer', type: 'steps', title: 'Animation: a layered testbench', nav: 'Layers',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['The <b>test</b> layer picks the scenario.', 'Generators create <b>transaction objects</b>.', 'Driver, monitor and scoreboard work with whole transactions.', 'Only the interface/clocking-block layer knows about pins and timing.', 'The DUT sees only signals – it does not know a testbench exists.'][k], svg: layerFrame(k) }; })
      },
      { id: 'w-env', type: 'widget', title: 'Build a simple verification environment', nav: 'Environment builder', intro: 'Place all eight components in the right boxes.', build: envLab },
      {
        id: 'c-comm', type: 'concept', title: 'Mailboxes, interfaces and clocking blocks', nav: 'Communication',
        html: L.code('interface alu_if (input logic clk);\n  logic [7:0] a, b, y;  op_t op;\n  clocking cb @(posedge clk);          // testbench timing view\n    default input #1step output #2;    // sample just before, drive just after\n    output a, b, op;  input y;\n  endclocking\n  modport drv (clocking cb);\nendinterface') +
          '<p>Mailboxes connect class-based components running in parallel threads; the clocking block removes races at the DUT boundary.</p>'
      },
      { id: 'w-con', type: 'widget', title: 'Which construct?', nav: 'Construct drill', intro: 'Match each verification need with the SystemVerilog feature that solves it.', build: constructDrill },
      {
        id: 'rv-2', type: 'reveal', title: 'Click to reveal: environment insights', nav: 'Reveal',
        items: [
          { q: 'Why separate driver and monitor?', a: 'The monitor checks what really happened on the pins, independently of what the driver intended – catching interface bugs.' },
          { q: 'Why is the reference model separate from the scoreboard?', a: 'The model can be swapped (C model, simple SV model) while the comparison logic stays the same.' },
          { q: 'What does polymorphism give a testbench?', a: 'New transaction types or behaviours plug in through virtual methods without changing existing components.' },
          { q: 'Is any of this synthesizable?', a: 'No – it is pure verification code running only in simulation.' }
        ]
      },
      {
        id: 'dd-2', type: 'drag', title: 'Drag & drop: who does what?', nav: 'Drag & drop',
        bins: ['Driver', 'Monitor', 'Scoreboard'],
        items: [['Drives DUT inputs through the clocking block', 0], ['Gets transactions from a mailbox', 0], ['Samples DUT pins and rebuilds transactions', 1], ['Never drives any signal', 1], ['Compares actual vs expected results', 2], ['Reports mismatches', 2]]
      },
      {
        id: 'mcq2', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A virtual interface lets a class…', o: ['access the DUT signals', 'synthesise logic', 'generate clocks in hardware', 'replace the DUT'], a: 0, w: '' },
          { q: 'Mailboxes are used to…', o: ['pass objects safely between threads', 'store RTL', 'measure coverage', 'define clocks'], a: 0, w: '' },
          { q: 'Encapsulation means…', o: ['a class hides its internal data behind methods', 'all variables are global', 'no classes are used', 'only interfaces exist'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen2', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Tests pass, but the monitor gets its data directly from the driver\'s variables instead of the pins.', q: 'What is the risk?', o: [{ t: 'Bugs between driver and DUT pins (wrong timing, wiring) are never seen', ok: true, w: 'Monitors must observe the real pins.' }, { t: 'None – it is faster', ok: false, w: 'Speed is not the goal.' }, { t: 'The DUT will not compile', ok: false, w: 'It compiles; the check is just blind.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Transactions are usually modelled as…', o: ['classes', 'modules', 'always blocks', 'parameters'], a: 0, w: '' },
      { d: 'Easy', q: 'The scoreboard…', o: ['compares actual and expected results', 'drives inputs', 'generates clocks', 'is synthesised'], a: 0, w: '' },
      { d: 'Easy', q: 'A clocking block mainly prevents…', o: ['races at the DUT boundary', 'latches', 'X propagation', 'DRC errors'], a: 0, w: '' },
      { d: 'Medium', q: 'Inheritance lets an error transaction…', o: ['extend a base transaction', 'replace the DUT', 'remove randomisation', 'skip the driver'], a: 0, w: '' },
      { d: 'Medium', q: 'A monitor should…', o: ['observe pins and never drive', 'drive inputs', 'compute expected values', 'stop the simulation'], a: 0, w: '' },
      { d: 'Medium', q: 'Which connects generator and driver threads?', o: ['mailbox', 'wire', 'covergroup', 'assert'], a: 0, w: '' },
      { d: 'Medium', q: 'Polymorphism relies on…', o: ['virtual methods', 'parameters', 'generate', 'always_comb'], a: 0, w: '' },
      { d: 'Hard', q: 'Why use a virtual interface in a driver class?', o: ['classes cannot contain static interfaces; they hold a handle', 'it is faster RTL', 'it creates clocks', 'it removes the DUT'], a: 0, w: '' },
      { d: 'Hard', q: 'In a layered testbench, pin timing is known only by…', o: ['the interface / clocking-block layer', 'the test', 'the scoreboard', 'the reference model'], a: 0, w: '' },
      { d: 'Hard', q: 'The reference model is kept separate so that…', o: ['it can be replaced without changing the comparison', 'it runs faster in silicon', 'it removes the monitor', 'coverage increases'], a: 0, w: '' }
    ]
  });
})();
