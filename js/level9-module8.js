/* Level 9 · Module 8 – Synthesis Reports & Analysis */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var REPORTS = [
    { lvl: 'Easy', name: 'uart_tx', text:
'****************************************\nReport : area\nDesign : uart_tx\nLibrary: gsc45_typ\n****************************************\nNumber of ports:                  14\nNumber of nets:                   96\nNumber of cells:                  71\nNumber of combinational cells:    52\nNumber of sequential cells:       19\nCombinational area:            142.60\nNoncombinational area:          85.50\nTotal cell area:               228.10\n\n****************************************\nReport : timing  -path full -delay max\n****************************************\nStartpoint: bit_cnt_reg[0] (rising edge-triggered flip-flop clocked by clk)\nEndpoint:   shift_reg[7]   (rising edge-triggered flip-flop clocked by clk)\nPath Group: clk      Path Type: max\n  clock clk (rise edge)                0.00     0.00\n  bit_cnt_reg[0]/CK->Q (DFF_X1)        0.21     0.21 r\n  U14/ZN (NOR3_X1)                     0.48     0.69 f\n  ...                                  2.73     3.42 r\n  data arrival time                             3.42\n  clock clk (rise edge)                5.00     5.00\n  library setup time                  -0.29     4.71\n  data required time                            4.71\n  slack (MET)                                   1.29',
      qs: [
        { q: 'Total cell area', t: 'num', a: 228.1, tol: 0.001, u: 'units' },
        { q: 'Number of cells', t: 'num', a: 71 },
        { q: 'Number of sequential cells (flip-flops)', t: 'num', a: 19 },
        { q: 'Worst slack', t: 'num', a: 1.29, tol: 0.001, u: 'ns' },
        { q: 'Did the design meet timing?', t: 'ch', o: ['Yes – slack is positive', 'No – slack is negative'], a: 0 }
      ] },
    { lvl: 'Medium', name: 'fir4', text:
'Report : area      Design : fir4\nNumber of cells:                 612\nNumber of sequential cells:      124\nCombinational area:           1340.20\nNoncombinational area:         533.20\nTotal cell area:              1873.40\n\nReport : timing (max)   clock clk, period 4.00\nStartpoint: tap_reg[2][5]  (rising edge-triggered flip-flop clocked by clk)\nEndpoint:   acc_reg[19]    (rising edge-triggered flip-flop clocked by clk)\n  data arrival time                    4.03\n  data required time                   3.85\n  slack (VIOLATED)                    -0.18\n\nReport : check_design\nWarning: In design \'fir4\', latch \'coef_sel_reg\' inferred.             (ELAB-974)\nWarning: In design \'fir4\', port \'test_mode\' is not connected to any nets. (LINT-28)\nWarning: Net \'acc_nxt[20]\' has no loads.                            (LINT-2)\nWarning: Constant propagation: output \'status[3]\' tied to logic 0.     (LINT-52)',
      qs: [
        { q: 'Total cell area', t: 'num', a: 1873.4, tol: 0.001, u: 'units' },
        { q: 'Worst slack', t: 'num', a: -0.18, tol: 0.001, abs: 0.001, u: 'ns' },
        { q: 'Critical path endpoint', t: 'ch', o: ['tap_reg[2][5]', 'acc_reg[19]', 'coef_sel_reg', 'status[3]'], a: 1 },
        { q: 'How many latches were inferred?', t: 'num', a: 1 },
        { q: 'How many warnings does check_design report?', t: 'num', a: 4 }
      ] },
    { lvl: 'Hard', name: 'dma_ctrl', text:
'Report : area      Design : dma_ctrl\nNumber of cells:                 1958\nNumber of combinational cells:   1544\nNumber of sequential cells:       414\nCombinational area:            3021.70\nNoncombinational area:         1863.00\nTotal cell area:               4884.70\n\nReport : timing (max)   clock clk, period 2.50\n  Path 1: rd_ptr_reg[4] -> fifo_mem_reg[11][31]   slack -0.42 (VIOLATED)\n  Path 2: rd_ptr_reg[4] -> fifo_mem_reg[3][31]    slack -0.39 (VIOLATED)\n  Path 3: req_reg[0]    -> grant_reg[2]           slack  0.07 (MET)\n\nReport : check_design / optimisation log\nWarning: Design \'dma_ctrl\' has 2 unconnected ports: irq_mask[3], irq_mask[2]. (LINT-28)\nWarning: latch \'burst_len_q_reg[3:0]\' inferred in process at dma_ctrl.sv:212.   (ELAB-974)\nWarning: latch \'ch_sel_reg\' inferred in process at dma_ctrl.sv:240.            (ELAB-974)\nInformation: 37 cells removed: unloaded (no fan-out).                           (OPT-1206)\nInformation: 12 registers removed: constant value 0.                            (OPT-1215)\nWarning: Clock gating check: none.                                              ',
      qs: [
        { q: 'Number of cells', t: 'num', a: 1958 },
        { q: 'Worst slack', t: 'num', a: -0.42, tol: 0.001, abs: 0.001, u: 'ns' },
        { q: 'What do the two worst paths have in common?', t: 'ch', o: ['Both start at rd_ptr_reg[4] (the FIFO read pointer)', 'Both end at grant_reg[2]', 'Both meet timing', 'Both are latches'], a: 0 },
        { q: 'How many latch instances (signals) are reported?', t: 'num', a: 2 },
        { q: 'How many unused (unloaded) cells were removed?', t: 'num', a: 37 },
        { q: 'What percentage of the total area is sequential (one decimal)?', t: 'num', a: 38.1, tol: 0.005, u: '%' }
      ] }
  ];

  /* ---------- Widget: progressive synthesis reports ---------- */
  function reportLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Simulated synthesis reports · three designs, increasing difficulty</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, solved = {};
    var tabs = L.h('div', 'l7-row'); body.appendChild(tabs);
    var view = L.h('div', ''); body.appendChild(view);
    function drawTabs() {
      tabs.innerHTML = '';
      REPORTS.forEach(function (r, i) {
        var locked = i > 0 && !solved[i - 1] && !solved[i];
        var b = L.btn((solved[i] ? '✓ ' : locked ? '🔒 ' : '') + 'Report ' + (i + 1) + ' · ' + r.lvl, i === cur ? 'is-on' : '', function () { if (!locked) { cur = i; show(); } });
        if (locked) b.disabled = true; tabs.appendChild(b);
      });
    }
    function show() {
      var r = REPORTS[cur]; drawTabs(); view.innerHTML = '';
      view.appendChild(L.h('div', '', L.code(r.text, 'sm')));
      var inputs = [];
      r.qs.forEach(function (q, i) {
        var row = L.h('div', 'l7-calc-row'); row.style.margin = '8px 0'; row.style.flexWrap = 'wrap';
        var lb = L.h('span', '', (i + 1) + '. ' + q.q); lb.style.minWidth = '260px'; lb.style.fontWeight = '600'; row.appendChild(lb);
        var el;
        if (q.t === 'num') { el = document.createElement('input'); el.className = 'l7-input'; el.setAttribute('inputmode', 'decimal'); }
        else { el = document.createElement('select'); el.innerHTML = '<option value="">– choose –</option>' + q.o.map(function (o, k) { return '<option value="' + k + '">' + L.esc(o) + '</option>'; }).join(''); }
        el.setAttribute('aria-label', q.q);
        row.appendChild(el); if (q.u) row.appendChild(L.h('span', 'l7-unit', q.u));
        view.appendChild(row); inputs.push(el);
      });
      var rr = L.h('div', 'l7-row'); view.appendChild(rr);
      var fb = L.h('div', 'l7-fb'); view.appendChild(fb);
      rr.appendChild(L.btn('Check answers', 'pri', function () {
        var wrong = [];
        r.qs.forEach(function (q, i) {
          var el = inputs[i], ok;
          if (q.t === 'num') { var x = parseFloat(String(el.value).replace('−', '-')); ok = !isNaN(x) && Math.abs(x - q.a) <= Math.max(Math.abs(q.a) * (q.tol || 0), q.abs || 0.0001); }
          else ok = el.value !== '' && +el.value === q.a;
          el.style.borderColor = ok ? 'var(--l7-ok)' : 'var(--l7-bad)';
          if (!ok) wrong.push(i + 1);
        });
        if (!wrong.length) {
          solved[cur] = 1; drawTabs();
          L.fb(fb, 'ok', '✓ Report ' + (cur + 1) + ' analysed correctly.' + (cur === 2 ? ' Next steps for this design: fix the two latches in the RTL, look at the read-pointer fan-out into the FIFO memory (or use a RAM), and check whether irq_mask[3:2] should really be unused.' : ''));
          if (Object.keys(solved).length === REPORTS.length) { api.done(); fb.innerHTML += '<br>🎉 All three reports done.'; }
          else if (cur < REPORTS.length - 1) { var nr = L.h('div', 'l7-row'); nr.appendChild(L.btn('Next report →', 'pri', function () { cur++; show(); })); fb.appendChild(nr); }
        } else L.fb(fb, 'bad', '✗ Check question' + (wrong.length > 1 ? 's ' : ' ') + wrong.join(', ') + '. Tip: area figures are in the area report; slack is the last line of a timing path; warnings are listed one per line.');
      }));
    }
    show();
  }

  /* ---------- Widget: warning triage ---------- */
  var SEV = ['🔴 Must fix', '🟠 Review – may be intended', '🟢 Usually harmless'];
  function triageDrill(root, api) {
    L.drill(root, api, {
      bar: 'Warning triage · how serious is each message?', label: 'Message', fixed: true,
      items: [
        { c: "Warning: latch 'state_nxt_reg' inferred in always_comb at fsm.sv:58. (ELAB-974)", o: SEV, a: 0, w: 'An unintended latch in next-state logic – fix the RTL (defaults first).' },
        { c: "Warning: Net 'data_o[7]' has multiple drivers. (LINT-4)", o: SEV, a: 0, w: 'Two blocks drive one net – a real design error.' },
        { c: "Warning: port 'spare_in[1:0]' is not connected to any nets. (LINT-28)", o: SEV, a: 1, w: 'Fine if the spares are intentional; a bug if a feature was accidentally left unconnected.' },
        { c: "Information: 24 cells removed: unloaded. (OPT-1206)", o: SEV, a: 1, w: 'Removing dead logic is normal – but check that the removed logic was not supposed to be used.' },
        { c: "Warning: output 'status[3]' is tied to constant 0. (LINT-52)", o: SEV, a: 1, w: 'Could be a reserved bit (intended) or a bug that disconnected its logic.' },
        { c: "Warning: 18 timing paths have negative slack. WNS = -0.31 ns", o: SEV, a: 0, w: 'Timing violation – fix the RTL/architecture or constraints before moving on.' },
        { c: "Information: Building model 'DW01_add_width16' from library. (HDL-193)", o: SEV, a: 2, w: 'Just the tool building an adder component – nothing to do.' }
      ]
    });
  }

  function anatFrame(k) {
    var names = ['Area', 'Cell usage', 'Timing', 'Constraints', 'check_design / lint', 'QoR summary'], o = '';
    names.forEach(function (n, i) { var x = 14 + (i % 3) * 196, y = 30 + Math.floor(i / 3) * 70; o += R(x, y, 180, 56, i === k ? 'box-on' : 'box', 10) + T(x + 90, y + 33, n, i === k ? 't-ink t-b' : 't-dim t-b'); });
    o += T(300, 186, ['report_area: combinational, sequential and total area, cell count.', 'report_reference / cell usage: which library cells and how many of each.', 'report_timing: worst paths, arrival, required time, slack.', 'report_constraint / check_timing: violations of timing and design rules, unconstrained paths.', 'check_design: latches, unconnected ports, multiple drivers, constants.', 'report_qor: one-page summary – WNS, TNS, area, cell count, run time.'][k], 't-vio t-b t-sm');
    return S(600, 200, o, 'Synthesis reports');
  }

  L.module({
    n: 8,
    lead: 'Synthesis always produces a netlist – the reports tell you whether it is any good. Learn to read area, cell usage, timing and lint reports, and to separate real problems from harmless messages.',
    tags: ['area reports', 'cell utilisation', 'timing reports', 'critical path', 'worst slack', 'inferred latches', 'unconnected / unused logic', 'warnings'],
    sections: [
      {
        id: 'st-anat', type: 'steps', title: 'Animation: the standard set of synthesis reports', nav: 'Report set',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['<b>Area</b>: how big is the design?', '<b>Cell usage</b>: which cells were used – watch for unexpected latches or huge muxes.', '<b>Timing</b>: does it meet the clock? Worst paths with slack.', '<b>Constraints</b>: anything unconstrained or violating design rules?', '<b>check_design</b>: structural problems in the RTL.', '<b>QoR</b>: the summary you check first after every run.'][k], svg: anatFrame(k) }; })
      },
      {
        id: 'c-area', type: 'concept', title: 'Area and cell utilisation reports', nav: 'Area reports',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>report_area</h4><p>Number of cells, combinational vs non-combinational (sequential) area, total cell area – in library units (often µm²). Compare against your area budget and earlier runs.</p></div><div class="l7-box cu"><h4>Cell usage</h4><p>Counts per cell type: e.g. 124 DFF_X1, 3 LATCH_X1 (!), 412 NAND2_X1. Unexpected cell types point to RTL problems; a very large mux count can mean a memory was built from flip-flops.</p></div></div>'
      },
      {
        id: 'c-time', type: 'concept', title: 'Timing reports and critical paths', nav: 'Timing reports',
        html: '<p>After synthesis the timing report lists the worst paths with their <b>startpoint</b>, <b>endpoint</b>, arrival and required time and <b>slack</b> (Level 8 explains how these are computed). For RTL designers the useful questions are:</p>' +
          '<div class="l7-grid3"><div class="l7-box"><h4>Which RTL block?</h4><p>Map the start/end registers back to RTL signals.</p></div><div class="l7-box"><h4>How bad?</h4><p>WNS (worst slack) and TNS (sum of negative slack).</p></div><div class="l7-box"><h4>Pattern?</h4><p>Many failing paths from one register often mean high fan-out or a missing pipeline stage.</p></div></div>'
      },
      { id: 'w-rep', type: 'widget', title: 'Analyse simulated synthesis reports', nav: 'Report lab', intro: 'Answer the questions for each report. Each one unlocks the next, harder report.', build: reportLab },
      {
        id: 'c-warn', type: 'concept', title: 'Warnings: latches, unconnected and unused logic', nav: 'Warnings',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Message</th><th>Meaning</th><th>Typical action</th></tr>' +
          '<tr><td>Latch inferred</td><td>incomplete assignment in combinational code</td><td>fix the RTL</td></tr>' +
          '<tr><td>Multiple drivers</td><td>a signal assigned in two places</td><td>fix the RTL</td></tr>' +
          '<tr><td>Unconnected port / net</td><td>an input or output not used</td><td>confirm intended or connect it</td></tr>' +
          '<tr><td>Cells / registers removed (unloaded, constant)</td><td>logic that drives nothing or never changes</td><td>confirm intended – a missing connection deletes whole blocks</td></tr>' +
          '<tr><td>Design-rule violation</td><td>fan-out / transition / capacitance limit exceeded</td><td>check constraints, buffering</td></tr></table></div>' +
          '<p><b>Rule:</b> a clean run has zero unexplained warnings. Waive only what you understand and document.</p>'
      },
      { id: 'w-tri', type: 'widget', title: 'Warning triage', nav: 'Triage drill', intro: 'Decide how serious each message is.', build: triageDrill },
      {
        id: 'rv-8', type: 'reveal', title: 'Click to reveal: reading reports', nav: 'Reveal',
        items: [
          { q: 'Why can removed logic be a serious problem?', a: 'If an output is accidentally unconnected, the tool removes the whole cone of logic driving it – the area looks great and the function is gone.' },
          { q: 'What is QoR?', a: 'Quality of Results: the summary of timing (WNS/TNS), area, cell count and design-rule violations.' },
          { q: 'Why compare reports between runs?', a: 'Sudden jumps in area or in failing paths point directly to the RTL or constraint change that caused them.' },
          { q: 'Is positive slack after synthesis the final answer?', a: 'No – wires are only estimated; physical design (Level 10) and sign-off STA confirm timing.' },
          { q: 'Why is a latch count in the cell usage alarming?', a: 'In a flip-flop design, latches almost always come from incomplete RTL assignments.' },
          { q: 'How do you find which RTL line caused a warning?', a: 'Most messages give the file and line (e.g. dma_ctrl.sv:212) and the inferred register name.' }
        ]
      },
      {
        id: 'dd-8', type: 'drag', title: 'Drag & drop: which report shows it?', nav: 'Drag & drop',
        bins: ['report_area', 'report_timing', 'check_design / lint'],
        items: [['Total cell area', 0], ['Sequential vs combinational area', 0], ['Worst slack', 1], ['Critical path start and end', 1], ['Latch inferred', 2], ['Unconnected port', 2], ['Multiple drivers', 2]]
      },
      {
        id: 'calc8', type: 'calc', title: 'Report calculations', nav: 'Calculate',
        items: [
          { q: 'A design has 1340.2 combinational and 533.2 sequential area. What fraction of the area is sequential (percent, one decimal)?', a: 28.5, tol: 0.005, h: '533.2 / 1873.4.', s: '<b>28.5 %</b>.' },
          { q: 'Slack values of failing endpoints: −0.18, −0.05, −0.02 ns. What is the TNS (ns)?', a: -0.25, tol: 0.001, abs: 0.001, h: 'Sum.', s: '<b>−0.25 ns</b> (WNS −0.18).' },
          { q: 'Arrival time 4.03 ns, required time 3.85 ns. Slack (ns)?', a: -0.18, tol: 0.001, abs: 0.001, h: 'required − arrival.', s: '<b>−0.18 ns</b>.' },
          { q: 'An area report shows 612 cells, of which 124 are sequential. How many combinational cells?', a: 488, h: 'Subtract.', s: '<b>488</b>.' },
          { q: 'A target area is 2000 units; the report shows 1873.4. How much margin is left (units, one decimal)?', a: 126.6, tol: 0.001, h: '2000 − 1873.4.', s: '<b>126.6</b>.' }
        ]
      },
      {
        id: 'mcq8', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: '"slack (VIOLATED) −0.18" means…', o: ['timing met with 0.18 ns to spare', 'the path is 0.18 ns too slow', 'area is too large', 'a latch exists'], a: 1, w: '' },
          { q: 'An inferred latch is reported by…', o: ['report_area', 'check_design / elaboration warnings', 'report_power', 'the testbench'], a: 1, w: '' },
          { q: '"37 cells removed: unloaded" means…', o: ['37 cells had no fan-out and were deleted', 'timing failed', 'the library lacks 37 cells', '37 latches'], a: 0, w: '' },
          { q: 'Which warning must always be fixed?', o: ['building DesignWare model', 'multiple drivers', 'spare port unconnected (intended)', 'constant reserved bit'], a: 1, w: '' }
        ]
      },
      {
        id: 'short8', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Which numbers would you check first in the synthesis reports of a new block, and why?', k: ['area', 'slack|wns|timing', 'latch', 'warning|unconnected|removed'], m: 'Total area and cell count (against the budget), worst negative slack and total negative slack (does it meet the clock?), any inferred latches or multiple drivers, and warnings about unconnected ports or removed logic – these reveal RTL bugs that silently delete or change functionality.' },
          { q: 'Explain why "logic removed: unloaded" can hide a functional bug.', k: ['output|connect', 'remov|delet', 'cone|logic driving', 'smaller|area|function'], m: 'Synthesis removes logic whose outputs are not used. If an output port or internal signal was accidentally left unconnected, the whole cone of logic driving it is deleted. The design looks smaller and timing looks better, but the function is missing – so removal messages must be reviewed.' }
        ]
      },
      {
        id: 'scen8', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'After a small RTL change, total area drops by 40 % and timing improves dramatically.', q: 'What should you suspect first?', o: [{ t: 'A broken connection caused large logic cones to be removed – check removed-logic messages', ok: true, w: 'Too good to be true usually is.' }, { t: 'A great optimisation – tape out', ok: false, w: 'Verify first.' }, { t: 'The library changed', ok: false, w: 'Possible, but the RTL change is the obvious cause.' }] },
          { s: 'The 20 worst paths all start at the same register rd_ptr and end in a large register array.', q: 'What does this suggest?', o: [{ t: 'High fan-out from rd_ptr into a flip-flop-based memory – consider a RAM, register duplication or a pipelined read', ok: true, w: 'One source, many endpoints = fan-out/structure problem.' }, { t: '20 unrelated problems', ok: false, w: 'The common start says otherwise.' }, { t: 'A library bug', ok: false, w: 'Unlikely.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Total cell area is found in…', o: ['report_area', 'report_timing', 'the RTL', 'the testbench'], a: 0, w: '' },
      { d: 'Easy', q: 'Negative slack means…', o: ['timing met', 'timing violated', 'no clock', 'no latches'], a: 1, w: '' },
      { d: 'Easy', q: 'A latch warning usually points to…', o: ['incomplete RTL assignments', 'a slow library', 'too many flip-flops', 'a fast clock'], a: 0, w: '' },
      { d: 'Medium', q: 'Combinational 300, sequential 100 area. Sequential share =', o: ['25 %', '33 %', '75 %', '100 %'], a: 0, w: '' },
      { d: 'Medium', q: 'Arrival 2.9 ns, required 3.1 ns. Slack =', o: ['+0.2 ns', '−0.2 ns', '6.0 ns', '0'], a: 0, w: '' },
      { d: 'Medium', q: '"Port test_mode not connected to any nets" is…', o: ['always a bug', 'to be reviewed – may be intended', 'a timing violation', 'an area report'], a: 1, w: '' },
      { d: 'Medium', q: 'Many failing paths sharing one startpoint suggest…', o: ['a high fan-out or structural issue at that register', 'random noise', 'missing area constraints', 'a latch'], a: 0, w: '' },
      { d: 'Hard', q: 'Failing slacks −0.3, −0.1, −0.1 ns give WNS / TNS of…', o: ['−0.3 / −0.5', '−0.1 / −0.5', '−0.5 / −0.3', '−0.3 / −0.3'], a: 0, w: '' },
      { d: 'Hard', q: 'Area suddenly falls 40 % after a minor edit. First check…', o: ['removed-logic messages and unconnected outputs', 'the clock period', 'the library version', 'nothing'], a: 0, w: '' },
      { d: 'Hard', q: 'QoR summaries typically include…', o: ['WNS, TNS, area, cell count', 'only power', 'testbench coverage', 'routing congestion'], a: 0, w: '' }
    ]
  });
})();
