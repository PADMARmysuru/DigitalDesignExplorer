/* Level 11 · Module 7 – UVM Fundamentals */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var SLOTS = [
    { id: 'test', x: 10, y: 10, w: 580, h: 300, n: 'uvm_test', why: 'top of the testbench: builds the environment, picks the sequence and configuration' },
    { id: 'env', x: 30, y: 50, w: 540, h: 200, n: 'uvm_env', why: 'container for agents, scoreboard and coverage – reused by every test' },
    { id: 'agent', x: 50, y: 90, w: 300, h: 145, n: 'uvm_agent', why: 'bundles sequencer, driver and monitor for one interface' },
    { id: 'seqr', x: 65, y: 125, w: 120, h: 40, n: 'uvm_sequencer', why: 'arbitrates and hands sequence items to the driver' },
    { id: 'drv', x: 210, y: 125, w: 120, h: 40, n: 'uvm_driver', why: 'turns sequence items into pin activity on the virtual interface' },
    { id: 'mon', x: 140, y: 182, w: 120, h: 40, n: 'uvm_monitor', why: 'samples the pins and broadcasts observed transactions (analysis port)' },
    { id: 'sb', x: 380, y: 110, w: 170, h: 50, n: 'uvm_scoreboard', why: 'receives monitored transactions and compares them with the reference model' },
    { id: 'seq', x: 400, y: 262, w: 170, h: 36, n: 'uvm_sequence', why: 'generates a stream of sequence items (the stimulus scenario) and runs on the sequencer' }
  ];

  /* ---------- Widget: arrange the UVM testbench ---------- */
  function uvmLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Arrange the UVM testbench · tap a component, then its place</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var placed = {}, sel = null, done = false, order = SLOTS.map(function (s) { return s.id; }).sort(function () { return Math.random() - 0.5; });
    var tray = L.h('div', 'l7-row'); body.appendChild(tray);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function draw() {
      tray.innerHTML = '';
      order.forEach(function (id) { if (placed[id]) return; var s = SLOTS.filter(function (q) { return q.id === id; })[0]; tray.appendChild(L.btn(s.n, sel === id ? 'is-on' : 'pri', function () { sel = id; draw(); })); });
      var o = '';
      SLOTS.forEach(function (s) {
        var f = placed[s.id], big = s.w > 250;
        o += '<g class="click" data-id="' + s.id + '" role="button" tabindex="0"><rect x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="10" fill="' + (f ? (big ? 'rgba(52,199,89,.06)' : 'rgba(52,199,89,.2)') : (big ? 'rgba(0,0,0,.02)' : '#fff')) + '" stroke="' + (f ? '#34c759' : '#c7c7cc') + '" stroke-width="1.5" stroke-dasharray="' + (f ? '' : '5 4') + '"/>' +
          T(s.x + (big ? 12 : s.w / 2), s.y + (big ? 20 : s.h / 2 + 5), f ? s.n : '?', (f ? 't-ink t-b' : 't-dim t-b') + ' t-sm', big ? 'start' : 'middle') + '</g>';
      });
      o += R(400, 182, 150, 40, 'box-cu', 8) + T(475, 207, 'DUT (via interface)', 't-ink t-b t-sm');
      o += P('M185 145H210M330 145H360V202H400M260 202H330M200 202V222', 'w-on') + P('M485 262V250H125V165', 'w-thin');
      pic.innerHTML = S(600, 320, o, 'UVM testbench');
      L.$$('g.click', pic).forEach(function (g) {
        g.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = g.getAttribute('data-id');
          if (placed[id] || !sel) { if (!sel) L.fb(fb, 'info', 'First tap a component above.'); return; }
          var s = SLOTS.filter(function (q) { return q.id === id; })[0], w = SLOTS.filter(function (q) { return q.id === sel; })[0];
          if (sel === id) { placed[id] = 1; sel = null; L.fb(fb, 'ok', '✓ ' + s.n + ' – ' + s.why + '.'); draw(); }
          else L.fb(fb, 'bad', '✗ ' + w.n + ' ' + w.why + ' – try another place.');
        });
      });
      if (Object.keys(placed).length === SLOTS.length && !done) { done = true; api.done(); L.fb(fb, 'ok', '🎉 Complete UVM testbench: test → env → agent (sequencer, driver, monitor) + scoreboard, with a sequence running on the sequencer.'); }
    }
    draw();
  }

  /* ---------- Widget: which UVM component? ---------- */
  function uvmDrill(root, api) {
    L.drill(root, api, {
      bar: 'Which UVM piece is responsible?', label: 'Situation',
      items: [
        { q: 'A new test needs back-to-back writes followed by a read.', o: ['write a new uvm_sequence', 'edit the driver', 'edit the DUT', 'add a monitor'], a: 0, w: 'Stimulus scenarios live in sequences; components stay unchanged.' },
        { q: 'The pins must be wiggled with the correct protocol timing.', o: ['uvm_driver', 'uvm_scoreboard', 'uvm_sequence', 'uvm_test'], a: 0, w: 'Only the driver touches DUT inputs.' },
        { q: 'Observed transactions must reach the scoreboard and the coverage collector.', o: ['monitor analysis port (broadcast)', 'a mailbox from driver', 'a global variable', 'the sequencer'], a: 0, w: 'Analysis ports broadcast to any number of subscribers.' },
        { q: 'Two interfaces (AXI and UART) must both be driven.', o: ['two agents inside the env', 'two DUTs', 'one driver for both', 'two tests'], a: 0, w: 'One agent per interface.' },
        { q: 'An agent should only observe (no driving) in a system-level testbench.', o: ['configure it as passive', 'delete the agent', 'remove the monitor', 'run no sequence in the test'], a: 0, w: 'Passive agents contain only a monitor.' }
      ]
    });
  }

  function flowFrame(k) {
    var o = '', boxes = [['sequence', 30], ['sequencer', 150], ['driver', 270], ['DUT', 390], ['monitor', 270], ['scoreboard', 150]];
    for (var i = 0; i < 4; i++) o += R(boxes[i][1], 30, 100, 40, i === k ? 'box-on' : 'box', 8) + T(boxes[i][1] + 50, 55, boxes[i][0], 't-ink t-b t-sm');
    o += R(270, 110, 100, 40, k === 4 ? 'box-on' : 'box', 8) + T(320, 135, 'monitor', 't-ink t-b t-sm') + R(150, 110, 100, 40, k === 5 ? 'box-on' : 'box', 8) + T(200, 135, 'scoreboard', 't-ink t-b t-sm');
    o += P('M130 50H150M250 50H270M370 50H390M440 70V130H370M270 130H250', 'w-on');
    o += T(300, 180, ['A sequence creates sequence items (transactions)', 'The sequencer passes items to the driver on request', 'The driver converts items to pin activity', 'The DUT responds', 'The monitor rebuilds transactions from the pins', 'The scoreboard checks them against the reference model'][k], 't-vio t-b t-sm');
    return S(600, 190, o, 'UVM data flow');
  }

  L.module({
    n: 7,
    lead: 'The Universal Verification Methodology is the industry\'s standard way to build reusable SystemVerilog testbenches. You already built the same ideas by hand in Module 2 – UVM gives them standard names, base classes and connections. Learn the architecture, not the whole library.',
    tags: ['UVM concept', 'components', 'transactions', 'sequence items', 'sequences', 'sequencers', 'drivers', 'monitors', 'agents', 'environment', 'scoreboards'],
    sections: [
      {
        id: 'c-what', type: 'concept', title: 'What UVM is', nav: 'UVM concept',
        html: '<p><b>UVM</b> is an open-source SystemVerilog class library (IEEE 1800.2) plus a methodology. Every company uses the same structure, so verification IP and engineers move between projects easily.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Components</h4><p>long-lived objects forming the testbench structure (driver, monitor, agent, env, test)</p></div><div class="l7-box cu"><h4>Transactions</h4><p>short-lived data objects (sequence items) flowing between components</p></div><div class="l7-box vio"><h4>Sequences</h4><p>stimulus scenarios, separate from the structure so tests can change stimulus without touching components</p></div></div>'
      },
      {
        id: 'st-flow', type: 'steps', title: 'Animation: a transaction\'s journey', nav: 'Data flow',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['The <b>sequence</b> creates and randomises a sequence item.', 'The <b>sequencer</b> arbitrates and hands it to the driver.', 'The <b>driver</b> drives the pins through the virtual interface.', 'The <b>DUT</b> processes it.', 'The <b>monitor</b> watches the pins and publishes what really happened.', 'The <b>scoreboard</b> compares it with the reference model\'s prediction.'][k], svg: flowFrame(k) }; })
      },
      { id: 'w-uvm', type: 'widget', title: 'Arrange the UVM testbench', nav: 'Arrange UVM', intro: 'Put all eight UVM components in their places in the hierarchy.', build: uvmLab },
      {
        id: 'c-code', type: 'concept', title: 'What UVM code looks like (just a taste)', nav: 'A taste of code',
        html: L.code('class alu_item extends uvm_sequence_item;\n  rand bit [7:0] a, b;  rand op_t op;  bit [8:0] y;\n  `uvm_object_utils(alu_item)\nendclass\n\nclass alu_driver extends uvm_driver #(alu_item);\n  `uvm_component_utils(alu_driver)\n  virtual alu_if vif;\n  task run_phase(uvm_phase phase);\n    forever begin\n      seq_item_port.get_next_item(req);   // ask the sequencer\n      drive(req);                         // pin activity\n      seq_item_port.item_done();\n    end\n  endtask\nendclass') +
          '<p>Phases (build, connect, run, report) give every component the same life cycle; the factory lets a test replace a component or item type without editing the environment.</p>'
      },
      { id: 'w-drill', type: 'widget', title: 'Which UVM component?', nav: 'UVM drill', intro: 'Decide which UVM piece handles each situation.', build: uvmDrill },
      {
        id: 'rv-7', type: 'reveal', title: 'Click to reveal: UVM insights', nav: 'Reveal',
        items: [
          { q: 'Why separate sequences from the driver?', a: 'The driver knows HOW to drive the protocol; sequences decide WHAT to send. New tests only need new sequences.' },
          { q: 'What is an active vs passive agent?', a: 'Active agents drive stimulus (sequencer + driver + monitor); passive agents only monitor.' },
          { q: 'Why is UVM reusable across projects?', a: 'An agent for a standard interface (e.g. AXI) can be dropped into any environment that has that interface.' },
          { q: 'Do undergraduates need all of UVM?', a: 'No – understanding the architecture is the key. Factory overrides, configuration database and register models come with practice.' }
        ]
      },
      {
        id: 'dd-7', type: 'drag', title: 'Drag & drop: component or object?', nav: 'Drag & drop',
        bins: ['uvm_component (structure)', 'uvm_object (data)'],
        items: [['uvm_driver', 0], ['uvm_monitor', 0], ['uvm_env', 0], ['uvm_sequence_item', 1], ['uvm_sequence', 1], ['configuration object', 1]]
      },
      {
        id: 'mcq7', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The sequencer…', o: ['passes sequence items to the driver', 'samples DUT outputs', 'compares results', 'is the DUT'], a: 0, w: '' },
          { q: 'An agent typically contains…', o: ['sequencer, driver and monitor', 'only the scoreboard', 'the DUT', 'the test'], a: 0, w: '' },
          { q: 'Stimulus scenarios are written as…', o: ['sequences', 'drivers', 'monitors', 'environments'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen7', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A team copies its whole environment for every new test and edits the driver each time.', q: 'What does UVM recommend?', o: [{ t: 'Keep one environment; write new sequences (and use factory overrides) per test', ok: true, w: 'Reuse structure, vary stimulus.' }, { t: 'Keep copying', ok: false, w: 'Hard to maintain.' }, { t: 'Move checks into the driver', ok: false, w: 'Mixes responsibilities.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'UVM stands for…', o: ['Universal Verification Methodology', 'Unified Validation Model', 'Universal Value Monitor', 'User Verification Macro'], a: 0, w: '' },
      { d: 'Easy', q: 'The driver…', o: ['drives DUT pins from sequence items', 'compares results', 'creates sequences', 'is passive'], a: 0, w: '' },
      { d: 'Easy', q: 'The monitor…', o: ['observes pins and reports transactions', 'drives pins', 'generates clocks', 'writes RTL'], a: 0, w: '' },
      { d: 'Medium', q: 'The top-level UVM class that builds the env is…', o: ['uvm_test', 'uvm_driver', 'uvm_sequence_item', 'uvm_monitor'], a: 0, w: '' },
      { d: 'Medium', q: 'A passive agent contains…', o: ['only a monitor', 'only a driver', 'a sequencer only', 'the DUT'], a: 0, w: '' },
      { d: 'Medium', q: 'Analysis ports are used to…', o: ['broadcast monitored transactions to subscribers', 'drive pins', 'store RTL', 'reset the DUT'], a: 0, w: '' },
      { d: 'Medium', q: 'A sequence item is a…', o: ['transaction (data object)', 'component', 'interface', 'module'], a: 0, w: '' },
      { d: 'Hard', q: 'Why are sequences kept separate from drivers?', o: ['stimulus can change without editing components', 'drivers cannot randomise', 'it is faster', 'sequences are synthesizable'], a: 0, w: '' },
      { d: 'Hard', q: 'With two DUT interfaces, the env usually has…', o: ['two agents', 'two tests', 'two DUTs', 'no agents'], a: 0, w: '' },
      { d: 'Hard', q: 'The scoreboard compares monitored transactions with…', o: ['the reference model\'s expected results', 'the sequence', 'the driver\'s variables', 'the waveform file'], a: 0, w: '' }
    ]
  });
})();
