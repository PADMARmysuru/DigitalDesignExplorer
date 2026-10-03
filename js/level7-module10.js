/* Level 7 · Module 10 – Digital VLSI Mini Project */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var KEY = 'dde_level7_project';
  function getP() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function setP(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }

  var PROJ = [
    { k: 'cla', n: '16-bit Carry Look-Ahead Adder', m: 2, spec: 'Inputs A[15:0], B[15:0], Cin; outputs S[15:0], Cout. Use 4-bit CLA groups with a second-level look-ahead unit.', d: ['G/P equations for bits, groups and the second level', 'Gate-level schematic of one 4-bit group and the look-ahead unit', 'Critical-path estimate in unit gate delays vs a 16-bit RCA', 'Verification with corner cases: 0+0, FFFF+1, alternating patterns, random'] },
    { k: 'wal', n: '8×8 Wallace / Dadda Tree Multiplier', m: 2, spec: 'Unsigned A[7:0] × B[7:0] → P[15:0]. AND-array partial products, Dadda (or Wallace) reduction, fast final adder.', d: ['Dot diagram of every reduction stage', 'Count of FAs and HAs (target: Dadda 35 FA + 7 HA)', 'Choice and justification of the final carry-propagate adder', 'Exhaustive or large random test against A×B'] },
    { k: 'alu', n: '8-bit ALU with Flags', m: 3, spec: 'Operations ADD, SUB, AND, OR, XOR, SLT, SHL, SHR selected by a 3-bit opcode; flags Z, N, C, V.', d: ['Block diagram: adder/subtractor, logic unit, shifter, output mux, flag logic', 'Truth/definition table for every opcode and flag', 'Overflow and carry analysis with worked examples', 'Test plan covering every opcode and flag corner case'] },
    { k: 'bsh', n: '8-bit Barrel Shifter', m: 3, spec: 'Logical left/right, arithmetic right and rotate by 0–7 positions in a single cycle.', d: ['Logarithmic 3-stage mux structure with fill logic for each mode', 'Mux count and delay vs a crossbar implementation', 'Transmission-gate or AOI mux cell choice with justification', 'Verification of all modes × all shift amounts'] },
    { k: 'sram', n: '6T SRAM Cell and 4×4 Array', m: 4, spec: 'Design a 6T cell, then a 16-bit array (4 words × 4 bits) with row decoder, precharge, sense amplifier and write drivers.', d: ['Transistor schematic with sizing ratios justified (cell ratio, pull-up ratio)', 'Read and write operation timing sequence', 'Array organisation with decoder and column circuitry', 'Simulation (SPICE or behavioural) of read 0/1 and write 0/1'] },
    { k: 'cmp', n: '8-bit Magnitude Comparator', m: 2, spec: 'Outputs A>B, A=B, A<B for unsigned 8-bit inputs, using a tree structure.', d: ['Bit-level equal/greater equations and tree combination rule', 'Comparison with subtractor-based comparison (area, delay)', 'Gate count and critical path in a tree vs a ripple chain', 'Verification including equal values and MSB-decided cases'] },
    { k: 'mux', n: 'Multiplexer-based Datapath', m: 3, spec: 'A 4-register, 8-bit datapath with operand muxes, an adder/logic unit and a shifter, controlled by a control word (like the Module 3 puzzle).', d: ['Datapath block diagram and control-word format', 'Control words for at least 6 example operations', 'Mux implementation choice (TG / AOI / tri-state) with reasons', 'Cycle-by-cycle trace of a small program, e.g. sum of four numbers'] },
    { k: 'scl', n: 'Standard-Cell Logic Block', m: 6, spec: 'Implement a function (e.g. a 4-bit majority voter or 2-bit comparator) using complex gates (AOI/OAI) and choose drive strengths.', d: ['Logic optimisation into AOI/OAI/NAND/NOR cells', 'Transistor-level schematic of at least one complex cell', 'Cell count, transistor count and drive-strength selection for given loads', 'Comparison with a NAND-only implementation'] }
  ];
  var MILE = ['Specification written: interface, width, function and targets', 'Architecture chosen – at least two alternatives compared', 'Circuit / gate-level design (or Verilog model) completed', 'Functional verification with corner-case test vectors', 'Complexity estimate: transistor/gate count and critical path', 'Report and presentation: diagrams, results, reflection'];

  /* ---------- Widget: project picker ---------- */
  function picker(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Choose your mini project</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var grid = L.h('div', 'l7-grid2'); body.appendChild(grid);
    var detail = L.h('div', 'l7-readout'); body.appendChild(detail);
    var st = getP();
    PROJ.forEach(function (p) {
      var b = L.btn('<b>' + p.n + '</b><br><span style="font-size:.85em;opacity:.8">builds on Module ' + p.m + '</span>', '', function () { st = getP(); st.proj = p.k; setP(st); paint(); api.done(); document.dispatchEvent(new CustomEvent('l7proj')); });
      b.setAttribute('data-k', p.k); b.style.textAlign = 'left'; b.style.padding = '12px 14px'; grid.appendChild(b);
    });
    function paint() {
      st = getP();
      L.$$('[data-k]', grid).forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-k') === st.proj); });
      var p = PROJ.filter(function (x) { return x.k === st.proj; })[0];
      detail.innerHTML = p ? '<span class="v">' + p.n + '</span><br><span class="k">Specification</span> ' + p.spec + '<br><span class="k">Deliverables</span><br>• ' + p.d.join('<br>• ') +
        '<br><span class="k">Revise</span> Module ' + p.m + ' (' + L.MODULES[p.m - 1].t + ')' : 'Tap a project to see its specification and deliverables.';
    }
    paint();
    if (st.proj) api.done();
  }

  /* ---------- Widget: milestone tracker ---------- */
  function tracker(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Milestone tracker · saved on this device</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var head = L.h('div', 'l7-readout'); body.appendChild(head);
    var list = L.h('div', ''); body.appendChild(list);
    var bar = L.h('div', 'l7-svgbox'); body.appendChild(bar);
    function paint() {
      var st = getP(), p = PROJ.filter(function (x) { return x.k === st.proj; })[0];
      st.ms = st.ms || {};
      head.innerHTML = p ? '<span class="k">Project</span> <span class="v">' + p.n + '</span>' : '<span class="k">No project chosen yet</span> – pick one above first.';
      list.innerHTML = '';
      MILE.forEach(function (m, i) {
        var id = 'l7ms' + i, lb = L.h('label', 'l7-row', '');
        lb.style.cursor = p ? 'pointer' : 'not-allowed';
        lb.innerHTML = '<input type="checkbox" id="' + id + '" ' + (st.ms[i] ? 'checked' : '') + (p ? '' : ' disabled') + ' style="width:20px;height:20px;accent-color:var(--l7-sig)"> <span><b>M' + (i + 1) + '</b> ' + m + '</span>';
        lb.querySelector('input').addEventListener('change', function (e) { var s = getP(); s.ms = s.ms || {}; s.ms[i] = e.target.checked ? 1 : 0; setP(s); paint(); });
        list.appendChild(lb);
      });
      var done = MILE.filter(function (m, i) { return st.ms[i]; }).length, pct = done / MILE.length;
      bar.innerHTML = S(560, 40, R(10, 10, 540, 18, 'box', 9) + '<rect x="10" y="10" width="' + (540 * pct).toFixed(1) + '" height="18" rx="9" fill="var(--l7-sig)"/>' + T(280, 24, done + ' / ' + MILE.length + ' milestones', 't-ink t-b t-sm'), 'Project progress');
      if (p && done === MILE.length) api.done();
    }
    document.addEventListener('l7proj', paint);
    paint();
  }

  /* ---------- Widget: design estimator ---------- */
  function estimator(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Design estimator · quick numbers for your report</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var kind = 'rca', N = 16, n = 0;
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    L.select(g, 'Block', [['rca', 'Ripple-carry adder'], ['cla', 'CLA adder (4-bit groups)'], ['ks', 'Kogge–Stone adder'], ['mul', 'Dadda multiplier N×N'], ['bsh', 'Log barrel shifter'], ['sram', '6T SRAM array (N words × N bits)']], kind, function (v) { kind = v; n++; upd(); });
    L.select(g, 'Width N', [['4', '4'], ['8', '8'], ['16', '16'], ['32', '32'], ['64', '64']], '16', function (v) { N = +v; n++; upd(); });
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function upd() {
      if (n >= 2) api.done();
      var lg = Math.log2(N), r;
      // Mirror-adder FA ≈ 28 T; 2:1 TG mux ≈ 6 T incl. inverter share; AND2 = 6 T
      if (kind === 'rca') r = ['Full adders', N, 'Transistors (28T mirror FA)', 28 * N, 'Critical path', '≈ ' + 2 * N + ' τ (carry through ' + N + ' bits)'];
      else if (kind === 'cla') r = ['G/P + sum cells', N, 'Look-ahead levels', Math.ceil(Math.log(N) / Math.log(4)), 'Critical path', '≈ ' + (2 + 4 * Math.ceil(Math.log(N) / Math.log(4))) + ' τ'];
      else if (kind === 'ks') r = ['Prefix stages', lg, 'Black cells', N * lg - N + 1, 'Critical path', '≈ ' + (2 * lg + 2) + ' τ'];
      else if (kind === 'mul') {
        var h = [], c; for (c = 0; c < 2 * N - 1; c++) h.push(Math.min(c + 1, 2 * N - 1 - c));
        var seq = [2]; while (true) { var nx = Math.floor(seq[seq.length - 1] * 1.5); if (nx >= N) break; seq.push(nx); } seq.reverse();
        var FA = 0, HA = 0; seq.forEach(function (d) { var nh = [], cin = 0; for (c = 0; c < h.length || cin; c++) { var x = (h[c] || 0) + cin, fa = 0, ha = 0; while (x > d) { if (x - d >= 2) { fa++; x -= 2; } else { ha++; x -= 1; } } nh[c] = x; cin = fa + ha; FA += fa; HA += ha; } h = nh; });
        r = ['Partial-product ANDs', N * N, 'Dadda stages / FA / HA', seq.length + ' / ' + FA + ' / ' + HA, 'Final adder width', (2 * N - 2) + ' bits'];
      }
      else if (kind === 'bsh') r = ['Stages', lg, '2:1 muxes', N * lg, 'Critical path', lg + ' mux delays'];
      else r = ['Rows × columns', N + ' × ' + N, 'Cell transistors', 6 * N * N, 'Row address bits', lg];
      out.innerHTML = '<span class="k">' + r[0] + '</span> <span class="v">' + r[1] + '</span><br><span class="k">' + r[2] + '</span> <span class="v">' + r[3] + '</span><br><span class="k">' + r[4] + '</span> <span class="c">' + r[5] + '</span><br><span style="opacity:.7">τ = one unit gate delay (simplified model). Use these as first estimates and justify them in your report.</span>';
    }
    upd();
  }

  function claFrame(k) {
    var o = '', act = function (i) { return i <= k; };
    o += T(300, 22, ['Specify', 'Bit-level G and P', '4-bit group look-ahead', 'Second-level look-ahead', 'Sum and verification'][k], 't-vio t-b t-lg');
    for (var g = 0; g < 4; g++) {
      var x = 470 - g * 140;
      o += R(x - 55, 50, 110, 40, act(1) ? 'box-on' : 'box', 6) + T(x, 75, 'g,p bits ' + (4 * g) + '–' + (4 * g + 3), 't-ink t-sm');
      o += R(x - 55, 110, 110, 40, act(2) ? 'box-cu' : 'box', 6) + T(x, 135, 'CLA group ' + g, 't-ink t-sm');
      o += P('M' + x + ' 90V110', act(2) ? 'w-on' : 'w');
      o += P('M' + x + ' 150V180', act(3) ? 'w-on' : 'w') + T(x + 20, 170, 'G' + g + ',P' + g, 't-dim t-sm', 'start');
    }
    o += R(50, 180, 500, 36, act(3) ? 'box-vio' : 'box', 6) + T(300, 203, 'Second-level look-ahead: c4, c8, c12, c16', act(3) ? 't-vio t-b' : 't-dim');
    if (k >= 4) o += T(300, 242, 's_i = p_i ⊕ c_i  ·  test: 0+0, FFFF+1, 5555+AAAA, random', 't-sig t-sm');
    return S(600, 252, o, '16-bit CLA design step ' + k);
  }

  L.module({
    n: 10,
    lead: 'Bring Level 7 together. Choose one digital VLSI block, specify it, compare architectures, design and verify it, estimate its cost and present your results – the way a real circuit-design project runs.',
    tags: ['project selection', 'specification', 'architecture trade-offs', 'circuit design', 'verification', 'estimation', 'report'],
    sections: [
      { part: 'Plan' },
      {
        id: 'c-proj', type: 'concept', title: 'How this mini project works', nav: 'Overview',
        html: '<p>You will complete one project individually or in a team of two. The focus is <b>circuit and architecture design</b>: choosing a structure, reasoning about transistor/gate count and delay, and proving it works. Physical layout and timing sign-off belong to later levels and are not required.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>1 · Choose</h4><p>Pick one of eight projects below. Each lists its specification and deliverables.</p></div><div class="l7-box cu"><h4>2 · Build</h4><p>Work through the six milestones and tick them off in the tracker.</p></div><div class="l7-box vio"><h4>3 · Present</h4><p>Submit a short report and demonstrate your design to your teacher.</p></div></div>' +
          '<p style="margin-top:12px">Tools are your choice: paper schematics, a logic simulator, Verilog (Level 5) or a SPICE simulator for the SRAM project.</p>'
      },
      { id: 'w-pick', type: 'widget', title: 'Project selection', nav: 'Choose project', intro: 'Choose one project. You can change your choice later.', build: picker },
      {
        id: 'c-rubric', type: 'concept', title: 'Evaluation rubric', nav: 'Rubric',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Criterion</th><th>What is assessed</th><th>Marks</th></tr>' +
          '<tr><td>Specification</td><td>clear interface, function and targets</td><td>10</td></tr>' +
          '<tr><td>Architecture</td><td>at least two alternatives compared with justified choice</td><td>20</td></tr>' +
          '<tr><td>Circuit design</td><td>correct, complete schematic / gate-level / Verilog design</td><td>25</td></tr>' +
          '<tr><td>Verification</td><td>test plan, corner cases, results</td><td>20</td></tr>' +
          '<tr><td>Analysis</td><td>transistor/gate count and critical path, compared with alternatives</td><td>15</td></tr>' +
          '<tr><td>Report &amp; presentation</td><td>clarity, diagrams, reflection on what you would improve</td><td>10</td></tr></table></div>'
      },
      { part: 'Build' },
      { id: 'w-track', type: 'widget', title: 'Milestone tracker', nav: 'Milestones', intro: 'Tick each milestone when you have finished it. Your progress is saved in this browser.', build: tracker },
      {
        id: 'st-cla', type: 'steps', title: 'Worked example: designing a 16-bit CLA', nav: 'Worked example',
        frames: [
          { t: '<b>Specify</b>: 16-bit A, B, Cin → S, Cout. Target: much faster than a 16-bit RCA (≈ 32 τ).', svg: claFrame(0) },
          { t: '<b>Bit level</b>: compute g<sub>i</sub> = a<sub>i</sub>b<sub>i</sub> and p<sub>i</sub> = a<sub>i</sub> ⊕ b<sub>i</sub> for all 16 bits in parallel (1–2 τ).', svg: claFrame(1) },
          { t: '<b>Group level</b>: each 4-bit CLA computes its internal carries and a group G = g3 + p3g2 + p3p2g1 + p3p2p1g0 and P = p3p2p1p0.', svg: claFrame(2) },
          { t: '<b>Second level</b>: the same look-ahead logic applied to (G, P) of the four groups yields c4, c8, c12 and c16 without rippling.', svg: claFrame(3) },
          { t: '<b>Finish</b>: groups compute their internal carries from their c<sub>in</sub>; sums s<sub>i</sub> = p<sub>i</sub> ⊕ c<sub>i</sub>. Estimate ≈ 10 τ, verify with corner cases, and compare with RCA and Kogge–Stone in the report.', svg: claFrame(4) }
        ]
      },
      { id: 'w-est', type: 'widget', title: 'Design estimator', nav: 'Estimator', intro: 'Get first-order numbers for your block. Try at least two settings.', build: estimator },
      {
        id: 'rv-tips', type: 'reveal', title: 'Click to reveal: common project mistakes', nav: 'Common mistakes',
        items: [
          { q: 'Testing only “typical” inputs', a: 'Bugs hide in corners: all zeros, all ones, maximum carry chains, sign changes, equal operands. List corner cases in your test plan before writing tests.' },
          { q: 'Choosing an architecture without comparing alternatives', a: 'Always compare at least two options with numbers – e.g. RCA vs CLA delay and transistor count – and explain why your choice fits your targets.' },
          { q: 'Ignoring fan-out and stack height', a: 'A 6-input NAND or a signal driving 16 gates is slow. Break tall stacks into trees and buffer high fan-out nets.' },
          { q: 'SRAM sizing by guesswork', a: 'State your cell ratio and pull-up ratio and show (by simulation or reasoning) that reads do not flip the cell and writes succeed.' },
          { q: 'A report that only shows the final design', a: 'Show your reasoning: specification, alternatives, calculations, verification results and what you would improve.' },
          { q: 'Mixing up signed and unsigned behaviour', a: 'Overflow (V) and carry (C) mean different things. State which interpretation your design uses and test both where relevant.' }
        ]
      },
      {
        id: 'dd-flow', type: 'drag', title: 'Drag & drop: place each task in the right project phase', nav: 'Project phases',
        bins: ['Specify', 'Architect', 'Design', 'Verify', 'Document'],
        items: [['Define input and output widths', 0], ['Set a delay target', 0], ['Compare RCA, CLA and prefix options', 1], ['Choose Dadda over array multiplication', 1], ['Draw the transistor schematic', 2], ['Write G/P equations', 2], ['Run corner-case test vectors', 3], ['Compare outputs with a reference model', 3], ['Write the reflection on improvements', 4], ['Prepare block diagrams for the report', 4]]
      },
      { part: 'Practice' },
      {
        id: 'calc10', type: 'calc', title: 'Project calculations', nav: 'Calculate',
        items: [
          { q: 'Estimate the transistor count of a 16-bit ripple-carry adder built from 28-transistor mirror full adders.', a: 448, tol: 0, abs: 0.5, h: '16 × 28.', s: '<b>448</b> transistors.' },
          { q: 'Using the unit-delay model, how many times faster is a 16-bit CLA (≈ 10 τ) than a 16-bit RCA (≈ 32 τ)?', a: 3.2, u: '×', h: '32 / 10.', s: '<b>3.2×</b> faster.' },
          { q: 'How many cell transistors are in a 4 × 4 6T SRAM array?', a: 96, tol: 0, abs: 0.5, h: '16 bits × 6.', s: '<b>96</b>.' },
          { q: 'How many 2:1 muxes does an 8-bit logarithmic barrel shifter need?', a: 24, tol: 0, abs: 0.5, h: 'N·log₂N.', s: '8 × 3 = <b>24</b>.' },
          { q: 'An exhaustive test of an 8-bit ALU with 8 opcodes covers every A, B and opcode. How many test vectors is that?', a: 524288, tol: 0, abs: 0.5, h: '2⁸ × 2⁸ × 8.', s: '65 536 × 8 = <b>524 288</b> – easy for a simulator, which is why exhaustive testing is practical for small blocks.' }
        ]
      },
      {
        id: 'mcq10', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The first deliverable of any design project should be…', o: ['the layout', 'a clear specification', 'the report', 'the test results'], a: 1, w: 'Everything else is judged against the specification.' },
          { q: 'Which test vector best exercises an adder\'s longest carry chain?', o: ['0000 + 0000', 'FFFF + 0001', '1234 + 4321', '8000 + 0000'], a: 1, w: 'A carry propagates through every bit.' },
          { q: 'For a fast 8×8 multiplier, the best choice is…', o: ['a single array of ripple adders', 'a Dadda tree with a fast final adder', 'repeated addition over 8 cycles', 'a barrel shifter'], a: 1, w: 'Tree reduction plus fast CPA.' },
          { q: 'A good architecture section in your report…', o: ['shows only the final design', 'compares alternatives with numbers and justifies the choice', 'lists tool names', 'repeats the specification'], a: 1, w: 'Trade-offs with evidence.' }
        ]
      },
      {
        id: 'short10', type: 'short', title: 'Short-answer: your design rationale', nav: 'Rationale',
        items: [
          { q: 'In 4–6 sentences, justify the architecture you chose for your project against one alternative.', k: ['delay|speed|fast', 'area|transistor|count', 'power|energy', 'because|therefore|so'], m: 'A strong answer names the chosen architecture and one alternative, gives numbers for both (e.g. critical path in τ and transistor or cell count), relates them to the specification targets, mentions any power or complexity trade-off, and concludes why the chosen design is the better fit.' },
          { q: 'Describe your verification plan, including at least three corner cases.', k: ['corner|edge', 'random', 'reference|expected|model', 'all|exhaustive|coverage'], m: 'A strong plan lists directed corner cases (e.g. all zeros, all ones, maximum carry chain, sign boundary, equal operands), adds random vectors, compares every output with a reference model (e.g. the built-in + or ×), and states when testing is complete (e.g. exhaustive for small blocks, or a coverage goal).' }
        ]
      },
      {
        id: 'scen10', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your 8-bit ALU passes all your tests, but your teacher\'s test finds that SLT gives the wrong answer for A = −128, B = 1.', q: 'What went wrong in your process?', o: [{ t: 'The test plan missed signed-overflow corner cases; SLT must use N ⊕ V, not just N', ok: true, w: 'A − B overflowed, flipping the sign bit. Corner cases at the signed range limits catch this.' }, { t: 'The adder architecture was too slow', ok: false, w: 'This is a functional error, not timing.' }, { t: 'The shifter mode was wrong', ok: false, w: 'SLT does not use the shifter.' }] },
          { s: 'Your SRAM array simulation shows that reading a cell storing 0 sometimes flips it to 1.', q: 'What is the first design change to try?', o: [{ t: 'Increase the cell ratio – widen the pull-down nMOS relative to the access transistor', ok: true, w: 'This improves read stability (Module 4).' }, { t: 'Widen the access transistors', ok: false, w: 'That makes read disturbance worse.' }, { t: 'Remove the precharge', ok: false, w: 'Reads need precharged bitlines.' }] }
        ]
      }
    ],
    quiz: [
      { q: '(Module 1) The PUN of a static CMOS gate is…', o: ['identical to the PDN', 'the dual of the PDN', 'a single resistor', 'not needed'], a: 1, w: 'Series ↔ parallel.' },
      { q: '(Module 2) Which adder has O(log N) delay?', o: ['ripple carry', 'carry skip', 'Kogge–Stone', 'serial adder'], a: 2, w: 'Prefix adders are logarithmic.' },
      { q: '(Module 2) An 8×8 Dadda tree uses…', o: ['35 FA and 7 HA', '64 FA', '8 FA and 8 HA', 'no adders'], a: 0, w: 'Classic Dadda count.' },
      { q: '(Module 3) A 16-bit logarithmic barrel shifter has…', o: ['16 stages', '4 stages of 16 muxes', '256 switches', '1 stage'], a: 1, w: 'log₂16 = 4 stages.' },
      { q: '(Module 4) SRAM read stability depends mainly on…', o: ['pull-down vs access strength', 'bitline length only', 'refresh rate', 'decoder style'], a: 0, w: 'Cell ratio.' },
      { q: '(Module 5) Doubling a wire\'s length multiplies its RC delay by…', o: ['2', '4', '√2', '1'], a: 1, w: 'Delay ∝ L².' },
      { q: '(Module 6) Standard cells in a library share the same…', o: ['width', 'height and rail positions', 'transistor count', 'drive strength'], a: 1, w: 'Fixed height, shared rails.' },
      { q: '(Module 7) A PLL is normally delivered as…', o: ['soft IP', 'hard IP', 'firm IP', 'software'], a: 1, w: 'Analog → hard IP.' },
      { q: '(Module 8) Q<sub>crit</sub> of a storage node is approximately…', o: ['C·VDD', 'R·C', 'I·t²', 'VDD/C'], a: 0, w: 'Charge needed to flip the node.' },
      { q: '(Module 9) Chiplets improve yield because…', o: ['they are faster', 'small dies are less likely to contain defects', 'they need no testing', 'they avoid packaging'], a: 1, w: 'Y = e<sup>−D·A</sup>.' }
    ]
  });
})();
