/* Level 9 · Module 7 – Synthesis Constraints */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var SPEC = [
    'The block is clocked by port <b>clk</b> at <b>250 MHz</b>, with <b>0.15 ns</b> clock uncertainty.',
    'Data inputs arrive <b>1.2 ns</b> after the clock edge (logic in the upstream block).',
    'Outputs are used by a downstream block that needs <b>1.0 ns</b> before the next edge.',
    'The configuration registers <b>cfg_reg*</b> are written only while the block is idle – their paths never need to be timed.',
    'The divider (<b>div_*</b>) produces a result only every <b>2</b> clock cycles by design.',
    'Library rules for this project: max fan-out <b>16</b>, max transition <b>0.4 ns</b>.'
  ];
  var LINES = [
    { pre: 'create_clock -name clk -period', opts: ['4', '250', '0.25', '2'], a: 0, post: '[get_ports clk]', w: 'period = 1 / 250 MHz = 4 ns (SDC times are in ns).' },
    { pre: 'set_clock_uncertainty', opts: ['0.15', '1.5', '4'], a: 0, post: '[get_clocks clk]', w: 'Margin for jitter (and skew before the clock tree exists).' },
    { pre: 'set_input_delay', opts: ['1.2', '2.8', '4.0'], a: 0, post: '-clock clk [remove_from_collection [all_inputs] [get_ports clk]]', w: 'Input delay = time already used OUTSIDE the block (1.2 ns). The tool leaves 4 − 1.2 = 2.8 ns for the logic inside.' },
    { pre: 'set_output_delay', opts: ['1.0', '3.0', '0'], a: 0, post: '-clock clk [all_outputs]', w: 'Output delay = time the OUTSIDE needs (1.0 ns) – the block must deliver its outputs by 3.0 ns.' },
    { pre: '', opts: ['set_false_path', 'set_multicycle_path 2', 'set_max_delay 0'], a: 0, post: '-from [get_cells cfg_reg*]', w: 'Quasi-static configuration paths are excluded from timing: a false path.' },
    { pre: 'set_multicycle_path', opts: ['2 -setup', '1 -setup', '4 -setup'], a: 0, post: '-from [get_cells div_*]  ;# + set_multicycle_path 1 -hold', w: 'The divider has 2 cycles by design. (A matching -hold 1 keeps the hold check on the right edge.)' },
    { pre: 'set_max_fanout', opts: ['16', '1', '1000'], a: 0, post: '[current_design]', w: 'Design-rule constraint: no net may drive more than 16 inputs; the tool buffers larger nets.' },
    { pre: 'set_max_transition', opts: ['0.4', '4', '40'], a: 0, post: '[current_design]', w: 'Design-rule constraint: no signal slower than 0.4 ns – the tool sizes or buffers drivers.' }
  ];

  /* ---------- Widget: SDC builder ---------- */
  function sdcLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>SDC builder · turn the specification into constraints</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Specification</span><br>' + SPEC.map(function (s, i) { return (i + 1) + '. ' + s; }).join('<br>')));
    var pick = {}, sels = [];
    var form = L.h('div', ''); body.appendChild(form);
    LINES.forEach(function (ln, i) {
      var row = L.h('div', 'l7-row'); row.style.alignItems = 'center'; row.style.fontFamily = 'var(--l7-mono)'; row.style.fontSize = '.82rem'; row.style.margin = '6px 0'; row.style.flexWrap = 'wrap';
      if (ln.pre) row.appendChild(L.h('span', '', ln.pre));
      var s = document.createElement('select'); s.setAttribute('aria-label', 'Constraint ' + (i + 1));
      var order = ln.opts.map(function (o, k) { return k; }).sort(function () { return Math.random() - 0.5; });
      s.innerHTML = '<option value="">– choose –</option>' + order.map(function (k) { return '<option value="' + k + '">' + ln.opts[k] + '</option>'; }).join('');
      s.addEventListener('change', function () { pick[i] = s.value === '' ? null : +s.value; s.style.borderColor = ''; });
      row.appendChild(s); row.appendChild(L.h('span', '', L.esc(ln.post)));
      form.appendChild(row); sels.push(s);
    });
    var r = L.h('div', 'l7-row'); body.appendChild(r);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var out = L.h('div', ''); body.appendChild(out);
    r.appendChild(L.btn('Check constraints', 'pri', function () {
      var bad = [];
      LINES.forEach(function (ln, i) { var ok = pick[i] === ln.a; sels[i].style.borderColor = ok ? 'var(--l7-ok)' : 'var(--l7-bad)'; if (!ok) bad.push(i); });
      if (!bad.length) {
        L.fb(fb, 'ok', '🎉 All eight constraints match the specification. This is the file you would give the synthesis tool with read_sdc.');
        out.innerHTML = L.code('# block.sdc – generated from the specification\n' + LINES.map(function (ln) { return (ln.pre ? ln.pre + ' ' : '') + ln.opts[ln.a] + ' ' + ln.post; }).join('\n'));
        api.done();
      } else L.fb(fb, 'bad', bad.map(function (i) { return '✗ Line ' + (i + 1) + ': ' + LINES[i].w; }).join('<br>'));
    }));
  }

  /* ---------- Widget: constraint validation ---------- */
  function checkDrill(root, api) {
    L.drill(root, api, {
      bar: 'Constraint validation · read the check_timing message, choose the fix', label: 'Message',
      items: [
        { c: 'Warning: There are 6 input ports that are not constrained\n         for maximum delay. (TIM-210)', o: ['Add set_input_delay for those inputs', 'Add set_false_path to them', 'Increase the clock period', 'Ignore it'], a: 0, w: 'Unconstrained inputs are not timed at all – the tool may build logic that is far too slow.' },
        { c: 'Error: Cannot find port \'clock\' in design \'top\'. (UID-95)\ncreate_clock -period 4 [get_ports clock]', o: ['Fix the port name to clk – the clock was never created', 'Add set_input_delay', 'Lower the uncertainty', 'Add a multicycle path'], a: 0, w: 'With no clock, nothing is timed. Always read the constraint log for errors.' },
        { c: 'Warning: 14 endpoints are unconstrained:\n  dout[13:0] (output ports)', o: ['Add set_output_delay on the outputs', 'Add set_max_fanout', 'Add create_clock on dout', 'Use set_false_path -to dout'], a: 0, w: 'Outputs need an output delay so the tool knows how much time the outside world needs.' },
        { c: 'Warning: Net \'clk_div2\' drives sequential clock pins but\n         no clock is defined on it.', o: ['Define it with create_generated_clock (source clk, divide_by 2)', 'Delete the divider', 'Use set_false_path on all its registers', 'Set max_transition'], a: 0, w: 'Internally generated clocks must be declared so registers on them are timed correctly.' },
        { c: 'Info: set_false_path -from [all_inputs]\n      disables timing on 212 paths.', o: ['Too broad – remove it and false-path only the truly static signals', 'Correct – inputs never need timing', 'Change it to set_multicycle_path 100', 'Add more false paths'], a: 0, w: 'Over-broad exceptions hide real timing problems. Exceptions must be justified one by one.' }
      ]
    });
  }

  function budgetFrame(k) {
    var o = '', X = function (t) { return 60 + t * 120; };
    o += P('M' + X(0) + ' 40V150M' + X(4) + ' 40V150', 'wv-clk') + T(X(0), 32, 'launch edge (0 ns)', 't-vio t-sm') + T(X(4), 32, 'capture edge (4 ns)', 't-vio t-sm');
    if (k >= 1) o += '<rect x="' + X(0) + '" y="60" width="' + (X(1.2) - X(0)) + '" height="30" rx="6" fill="rgba(255,149,0,.25)"/>' + T((X(0) + X(1.2)) / 2, 80, 'input delay 1.2', 't-cu t-b t-sm');
    if (k >= 2) o += '<rect x="' + X(1.2) + '" y="60" width="' + (X(4) - X(1.2)) + '" height="30" rx="6" fill="rgba(0,113,227,.15)"/>' + T((X(1.2) + X(4)) / 2, 80, 'inside the block: 2.8 ns', 't-sig t-b t-sm');
    if (k >= 3) o += '<rect x="' + X(0) + '" y="110" width="' + (X(3) - X(0)) + '" height="30" rx="6" fill="rgba(0,113,227,.15)"/>' + T((X(0) + X(3)) / 2, 130, 'inside: 3.0 ns', 't-sig t-b t-sm') + '<rect x="' + X(3) + '" y="110" width="' + (X(4) - X(3)) + '" height="30" rx="6" fill="rgba(175,82,222,.22)"/>' + T((X(3) + X(4)) / 2, 130, 'output delay 1.0', 't-vio t-b t-sm');
    o += T(300, 172, ['The clock definition sets the whole budget: 4 ns.', 'set_input_delay tells the tool how much of it is already used outside.', 'The rest is the time synthesis may spend on input-to-register logic.', 'set_output_delay reserves time for the next block on register-to-output paths.'][k], 't-ink t-b t-sm');
    return S(600, 186, o, 'Constraint budget');
  }

  L.module({
    n: 7,
    lead: 'A synthesis tool only optimises what it is told. Learn to write the constraints (SDC) that describe clocks, the world outside the block, timing exceptions and design rules – and to check that the tool understood them.',
    tags: ['SDC', 'create_clock', 'input / output delay', 'clock uncertainty', 'false paths', 'multicycle paths', 'max fan-out / transition', 'constraint validation'],
    sections: [
      {
        id: 'c-why', type: 'concept', title: 'Why synthesis needs constraints', nav: 'Purpose',
        html: '<p>RTL says <i>what</i> the logic does; constraints say <i>how fast</i> it must be and under which rules. Without them synthesis has no timing goal and simply minimises area – or worse, leaves paths unconstrained.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Timing</h4><p>clocks, uncertainty, input and output delays</p></div><div class="l7-box cu"><h4>Exceptions</h4><p>false paths, multicycle paths</p></div><div class="l7-box vio"><h4>Design rules</h4><p>max fan-out, max transition, max capacitance</p></div></div>' +
          '<p style="margin-top:12px">They are written in <b>SDC</b> (Synopsys Design Constraints, a Tcl-based format understood by all major tools) and read with <code>read_sdc</code>. The same file later guides physical design and sign-off STA. (How timing checks are computed was covered in Level 8.)</p>'
      },
      {
        id: 'st-budget', type: 'steps', title: 'Animation: how constraints share the clock period', nav: 'Clock budget',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['create_clock fixes the period.', 'Input delay: time used before the data reaches this block.', 'Synthesis must fit the input logic into what remains.', 'Output delay: time the next block needs; synthesis must finish earlier.'][k], svg: budgetFrame(k) }; })
      },
      {
        id: 'c-clk', type: 'concept', title: 'Clock, input and output constraints', nav: 'Clocks & I/O',
        html: L.code('create_clock -name clk -period 4.0 [get_ports clk]          ;# 250 MHz\nset_clock_uncertainty 0.15 [get_clocks clk]\ncreate_generated_clock -name clk_div2 -source [get_ports clk] \\\n       -divide_by 2 [get_pins u_div/q_reg/Q]\nset_input_delay  1.2 -clock clk [remove_from_collection [all_inputs] [get_ports clk]]\nset_output_delay 1.0 -clock clk [all_outputs]\nset_driving_cell -lib_cell BUF_X2 [all_inputs]\nset_load 0.02 [all_outputs]') +
          '<p>Driving cell and load model what is outside the block, so input and output delays are calculated realistically.</p>'
      },
      { id: 'w-sdc', type: 'widget', title: 'SDC builder', nav: 'SDC builder', intro: 'Choose the correct value or command for each of the eight constraint lines, then check.', build: sdcLab },
      {
        id: 'c-exc', type: 'concept', title: 'Timing exceptions: false and multicycle paths', nav: 'Exceptions',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>set_false_path</h4><p>Paths that can never be exercised in a timed way: static configuration registers, asynchronous clock-domain crossings (through synchronisers), test-only paths.</p></div>' +
          '<div class="l7-box vio"><h4>set_multicycle_path</h4><p>Paths designed to take N cycles (data captured only every N clocks, with an enable). Usually paired with a hold multicycle of N − 1.</p></div></div>' +
          '<p style="margin-top:12px"><b>Warning:</b> an exception tells the tool to stop worrying about a path. A wrong or too broad exception hides real failures – every exception must be justified by the design.</p>'
      },
      {
        id: 'c-drc', type: 'concept', title: 'Design-rule constraints and constraint reports', nav: 'Design rules & checks',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Design-rule constraints</h4><p><code>set_max_fanout</code>, <code>set_max_transition</code>, <code>set_max_capacitance</code> – electrical limits the tool must respect by buffering and sizing. They have priority over timing optimisation.</p></div><div class="l7-box"><h4>Validating constraints</h4><p><code>check_timing</code> (unconstrained ports, missing clocks, loops), <code>report_clocks</code>, <code>report_exceptions</code>, and the constraint log: read them before trusting any timing result.</p></div></div>'
      },
      { id: 'w-check', type: 'widget', title: 'Constraint validation', nav: 'Validation drill', intro: 'Each message comes from a real kind of constraint check. Choose the right fix.', build: checkDrill },
      {
        id: 'rv-7', type: 'reveal', title: 'Click to reveal: constraint insights', nav: 'Reveal',
        items: [
          { q: 'What happens to an unconstrained path?', a: 'It is not timed – synthesis may build it as slowly as it likes, and STA reports nothing about it.' },
          { q: 'Why exclude the clock port from set_input_delay?', a: 'The clock is the reference itself; giving it an input delay is meaningless and confuses the tools.' },
          { q: 'Why model a driving cell?', a: 'A real input is driven by a gate with finite strength; the resulting slew affects the first gates inside the block.' },
          { q: 'Should resets be false paths?', a: 'Only asynchronous reset assertion; reset release must still meet recovery/removal timing.' },
          { q: 'Why are generated clocks declared separately?', a: 'So the tool knows their period and relationship to the source clock, and times their registers correctly.' },
          { q: 'Where else is the SDC used?', a: 'Physical design (Level 10) and sign-off STA use the same constraints, so mistakes propagate.' }
        ]
      },
      {
        id: 'dd-7', type: 'drag', title: 'Drag & drop: which SDC command?', nav: 'Drag & drop',
        bins: ['Clock', 'I/O', 'Exception', 'Design rule'],
        items: [['create_clock -period 5', 0], ['create_generated_clock -divide_by 2', 0], ['set_input_delay 1.5 -clock clk', 1], ['set_output_delay 0.8 -clock clk', 1], ['set_false_path -from cfg_reg*', 2], ['set_multicycle_path 3 -setup', 2], ['set_max_fanout 20', 3], ['set_max_transition 0.3', 3]]
      },
      {
        id: 'calc7', type: 'calc', title: 'Constraint calculations', nav: 'Calculate',
        items: [
          { q: 'A clock runs at 400 MHz. What value goes in create_clock -period (ns)?', a: 2.5, h: '1 / f.', s: '<b>2.5</b> ns.' },
          { q: 'Period 5 ns, input delay 1.8 ns. How much time remains for the input-to-register logic (ignoring setup/uncertainty), in ns?', a: 3.2, tol: 0.01, h: '5 − 1.8.', s: '<b>3.2</b> ns.' },
          { q: 'Period 4 ns, output delay 1.0 ns. By what time after the edge must outputs be valid (ns)?', a: 3, h: '4 − 1.', s: '<b>3.0</b> ns.' },
          { q: 'A multicycle path of 3 on a 4 ns clock allows how much time for setup (ns)?', a: 12, h: 'N × T.', s: '<b>12</b> ns.' },
          { q: 'A net drives 70 inputs and max fan-out is 16. At least how many buffered branches must the tool create?', a: 5, h: 'ceil(70 / 16).', s: '<b>5</b>.' }
        ]
      },
      {
        id: 'mcq7', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'set_input_delay describes…', o: ['delay inside the block', 'time used outside before data arrives', 'the clock period', 'the hold time'], a: 1, w: '' },
          { q: 'A static configuration register path is usually a…', o: ['multicycle path', 'false path', 'generated clock', 'design-rule violation'], a: 1, w: '' },
          { q: 'check_timing is used to…', o: ['find missing / wrong constraints', 'draw the layout', 'simulate RTL', 'count gates'], a: 0, w: '' },
          { q: 'set_max_transition is a…', o: ['clock constraint', 'design-rule constraint', 'false path', 'power report'], a: 1, w: '' }
        ]
      },
      {
        id: 'short7', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain what input and output delays represent and why synthesis needs them.', k: ['outside|external|upstream|downstream', 'input delay|arrive', 'output delay|need|required', 'remain|budget|available'], m: 'Input delay is the part of the clock period already used by logic outside the block before data reaches its inputs; output delay is the time the outside logic needs after the block\'s outputs. Together with the clock they tell synthesis how much time is available for the logic inside; without them input and output paths are unconstrained.' },
          { q: 'When is a multicycle path appropriate, and what is the risk of exceptions?', k: ['cycles|n cycles|every', 'enable|by design', 'hide|mask|wrong', 'justif|verify'], m: 'A multicycle path is appropriate when the design guarantees that data is only captured every N cycles (for example a slow divider with an enable), so it may take N periods. Exceptions remove or relax timing checks, so a wrong or over-broad exception can hide real timing failures; each must be justified by the design and reviewed.' }
        ]
      },
      {
        id: 'scen7', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Synthesis reports zero violations, but the chip fails at speed. The SDC has no set_input_delay or set_output_delay.', q: 'Likely explanation?', o: [{ t: 'I/O paths were never timed – unconstrained paths cannot violate', ok: true, w: '"No violations" is meaningless without complete constraints.' }, { t: 'The library is wrong', ok: false, w: 'Possible, but missing constraints are the obvious gap.' }, { t: 'Synthesis always misses I/O timing', ok: false, w: 'Only when they are not constrained.' }] },
          { s: 'To make timing pass quickly, someone added set_false_path -from [all_registers].', q: 'What is wrong?', o: [{ t: 'It disables timing on every register path – violations are hidden, not fixed', ok: true, w: 'Remove it; constrain properly.' }, { t: 'Nothing – false paths save runtime', ok: false, w: 'They hide failures.' }, { t: 'It should be a multicycle path of 2', ok: false, w: 'Also unjustified.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'SDC stands for…', o: ['Synopsys Design Constraints', 'Static Delay Check', 'Standard Digital Cells', 'Synthesis Data Collection'], a: 0, w: '' },
      { d: 'Easy', q: 'The command to define a clock is…', o: ['create_clock', 'set_clock', 'make_clock', 'define_clk'], a: 0, w: '' },
      { d: 'Easy', q: '500 MHz corresponds to a period of…', o: ['2 ns', '5 ns', '0.5 ns', '20 ns'], a: 0, w: '' },
      { d: 'Medium', q: 'Period 3 ns, input delay 1 ns: time left inside for input logic ≈', o: ['1 ns', '2 ns', '3 ns', '4 ns'], a: 1, w: '' },
      { d: 'Medium', q: 'Which path should normally be a false path?', o: ['ALU result to register', 'static configuration register to datapath', 'counter feedback', 'FSM next state'], a: 1, w: '' },
      { d: 'Medium', q: 'A divider designed to finish in 2 cycles needs…', o: ['set_false_path', 'set_multicycle_path 2', 'set_max_fanout 2', 'nothing'], a: 1, w: '' },
      { d: 'Medium', q: 'An internally divided clock must be declared with…', o: ['create_generated_clock', 'set_input_delay', 'set_false_path', 'set_load'], a: 0, w: '' },
      { d: 'Hard', q: 'check_timing reports 10 unconstrained outputs. The fix is…', o: ['set_output_delay', 'set_input_delay', 'set_max_transition', 'create_clock on the outputs'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is "set_false_path -from [all_inputs]" dangerous?', o: ['it slows synthesis', 'it hides real input timing failures', 'it is not valid SDC', 'it creates latches'], a: 1, w: '' },
      { d: 'Hard', q: 'A multicycle setup of 3 on a 2 ns clock gives the path…', o: ['2 ns', '4 ns', '6 ns', '3 ns'], a: 2, w: '3 × 2 ns.' }
    ]
  });
})();
