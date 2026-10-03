/* Level 8 · Module 3 – Setup, Hold & Timing Constraints */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Widget: setup/hold window explorer ---------- */
  function windowLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Setup / hold explorer · move the clock edge and the data change</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { edge: 500, data: 300, su: 80, h: 50 }, seen = {};
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'Clock edge time', 250, 750, 10, p.edge, function (v) { return v + ' ps'; }, function (v) { p.edge = v; upd(); });
    L.slider(c1, 'Data arrival (D changes at)', 100, 900, 10, p.data, function (v) { return v + ' ps'; }, function (v) { p.data = v; upd(); });
    L.slider(c2, 'Setup time t_su', 20, 200, 10, p.su, function (v) { return v + ' ps'; }, function (v) { p.su = v; upd(); });
    L.slider(c2, 'Hold time t_h', 10, 150, 10, p.h, function (v) { return v + ' ps'; }, function (v) { p.h = v; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    var X = function (t) { return 60 + t * 0.58; };
    function upd() {
      var o = '', ws = p.edge - p.su, we = p.edge + p.h, st;
      if (p.data > ws && p.data <= p.edge) st = 'setup'; else if (p.data > p.edge && p.data < we) st = 'hold'; else st = 'ok';
      seen[st] = 1; if (seen.ok && seen.setup && seen.hold) api.done();
      for (var t = 0; t <= 1000; t += 100) o += P('M' + X(t) + ' 20V230', 'grid') + T(X(t), 246, t, 't-dim t-sm');
      // window
      o += '<rect x="' + X(ws) + '" y="24" width="' + (X(p.edge) - X(ws)) + '" height="200" class="win-setup"/>';
      o += '<rect x="' + X(p.edge) + '" y="24" width="' + (X(we) - X(p.edge)) + '" height="200" class="win-hold"/>';
      o += T((X(ws) + X(p.edge)) / 2, 38, 'setup', 't-cu t-b t-sm') + T((X(p.edge) + X(we)) / 2, 38, 'hold', 't-vio t-b t-sm');
      // clock
      o += T(24, 85, 'CLK', 't-ink t-b');
      var c = 'M' + X(0) + ' 60H' + X(p.edge - 250) + 'V100H' + X(p.edge) + 'V60H' + X(Math.min(1000, p.edge + 250)) + 'V100H' + X(1000);
      o += P(c, 'wv-clk') + '<path d="M' + X(p.edge) + ' 74l-5 8h10z" fill="#5856d6"/>';
      // data
      o += T(24, 165, 'D', 't-ink t-b');
      o += '<path d="M' + X(0) + ' 145H' + (X(p.data) - 6) + 'L' + (X(p.data) + 6) + ' 185H' + X(1000) + 'M' + X(0) + ' 185H' + (X(p.data) - 6) + 'L' + (X(p.data) + 6) + ' 145H' + X(1000) + '" class="' + (st === 'ok' ? 'w-on' : 'w-bad') + '"/>';
      o += T(X(Math.max(60, p.data / 2)), 170, 'old value', 't-dim t-sm') + T(X(Math.min(940, (p.data + 1000) / 2)), 170, 'new value', 't-dim t-sm');
      o += P('M' + X(p.edge) + ' 24V226', 'w-dash');
      if (st !== 'ok') o += '<circle cx="' + X(p.data) + '" cy="165" r="16" class="w-bad pulse"/>';
      pic.innerHTML = S(660, 256, o, 'Setup and hold timing diagram');
      var dS = p.edge - p.su - p.data, dH = p.data - (p.edge + p.h);
      if (st === 'ok') {
        verdict.className = 'l7-verdict ok';
        verdict.innerHTML = '✅ Timing met<small>' + (p.data <= ws ? 'D settles ' + (ws - p.data) + ' ps before the setup window opens (setup slack +' + (ws - p.data) + ' ps). The flip-flop captures the NEW value.' : 'D changes ' + (p.data - we) + ' ps after the hold window closes (hold slack +' + (p.data - we) + ' ps). The flip-flop captures the OLD value cleanly; the new value is captured on the next edge.') + '</small>';
      } else if (st === 'setup') {
        verdict.className = 'l7-verdict bad';
        verdict.innerHTML = '❌ Setup violation<small>D changes only ' + (p.edge - p.data) + ' ps before the clock edge, but the flip-flop needs ' + p.su + ' ps (setup slack ' + dS + ' ps). The data arrives too LATE: the flip-flop may capture the wrong value or become metastable. Fix: make the data path faster or the clock period longer.</small>';
      } else {
        verdict.className = 'l7-verdict bad';
        verdict.innerHTML = '❌ Hold violation<small>D changes ' + (p.data - p.edge) + ' ps after the clock edge, but must stay stable for ' + p.h + ' ps (hold slack ' + (-(we - p.data)) + ' ps). The NEW data arrives too EARLY and corrupts the value being captured. Fix: add delay to the short data path – a slower clock does NOT help.</small>';
      }
    }
    upd();
  }

  /* ---------- Widget: register-to-register path budget ---------- */
  function budget(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Register-to-register timing · setup and hold slack</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { T: 1000, cq: 80, lmax: 900, lmin: 10, su: 60, h: 120 }, wasBad = false, n = 0;
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'Clock period T', 500, 1500, 20, p.T, function (v) { return v + ' ps (' + (1e6 / v).toFixed(0) + ' MHz)'; }, function (v) { p.T = v; upd(); });
    L.slider(c1, 'Clock-to-Q t_cq', 40, 150, 5, p.cq, function (v) { return v + ' ps'; }, function (v) { p.cq = v; upd(); });
    L.slider(c1, 'Logic delay, longest path', 100, 1300, 10, p.lmax, function (v) { return v + ' ps'; }, function (v) { p.lmax = v; upd(); });
    L.slider(c2, 'Logic delay, shortest path', 0, 300, 5, p.lmin, function (v) { return v + ' ps'; }, function (v) { p.lmin = v; upd(); });
    L.slider(c2, 'Setup time t_su', 20, 150, 5, p.su, function (v) { return v + ' ps'; }, function (v) { p.su = v; upd(); });
    L.slider(c2, 'Hold time t_h', 10, 200, 5, p.h, function (v) { return v + ' ps'; }, function (v) { p.h = v; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function upd() {
      var ss = p.T - (p.cq + p.lmax + p.su), hs = p.cq + p.lmin - p.h;
      if (ss < 0 || hs < 0) wasBad = true; else if (wasBad) api.done();
      var W = 600, sc = 520 / Math.max(p.T, p.cq + p.lmax + p.su), o = '';
      var x = 40;
      o += T(10, 24, 'Setup check: launch edge at 0, capture edge at T', 't-ink t-b t-sm', 'start');
      o += R(x, 34, p.cq * sc, 26, 'box-vio', 4) + T(x + p.cq * sc / 2, 52, 't_cq', 't-vio t-sm');
      o += R(x + p.cq * sc, 34, p.lmax * sc, 26, 'box-on', 4) + T(x + (p.cq + p.lmax / 2) * sc, 52, 'logic (max) ' + p.lmax, 't-sig t-sm');
      o += R(x + (p.cq + p.lmax) * sc, 34, p.su * sc, 26, 'box-cu', 4) + T(x + (p.cq + p.lmax + p.su / 2) * sc, 52, 't_su', 't-cu t-sm');
      o += P('M' + x + ' 30V74', 'w-dash') + P('M' + (x + p.T * sc) + ' 28V76', ss < 0 ? 'w-bad' : 'wv-clk') + T(x + p.T * sc, 90, 'capture edge T = ' + p.T, ss < 0 ? 't-bad t-b t-sm' : 't-ink t-b t-sm');
      o += T(10, 126, 'Hold check: new data must not reach D before t_h after the SAME edge', 't-ink t-b t-sm', 'start');
      o += R(x, 136, p.cq * sc, 26, 'box-vio', 4) + R(x + p.cq * sc, 136, Math.max(1, p.lmin * sc), 26, 'box-on', 4) + T(x + (p.cq + p.lmin) * sc + 6, 154, 'earliest arrival ' + (p.cq + p.lmin), 't-sig t-sm', 'start');
      o += R(x, 168, p.h * sc, 18, hs < 0 ? 'box-bad' : 'box-cu', 4) + T(x + p.h * sc + 6, 181, 'hold window ' + p.h, hs < 0 ? 't-bad t-sm' : 't-cu t-sm', 'start');
      pic.innerHTML = S(W, 196, o, 'Timing budget');
      out.innerHTML = '<span class="k">Setup slack</span> = T − (t_cq + t_logic,max + t_su) = ' + p.T + ' − (' + p.cq + ' + ' + p.lmax + ' + ' + p.su + ') = <span class="' + (ss < 0 ? 'c' : 'v') + '">' + ss + ' ps</span>' +
        '<br><span class="k">Hold slack</span> = (t_cq + t_logic,min) − t_h = (' + p.cq + ' + ' + p.lmin + ') − ' + p.h + ' = <span class="' + (hs < 0 ? 'c' : 'v') + '">' + hs + ' ps</span>' +
        '<br><span class="k">Minimum clock period</span> = t_cq + t_logic,max + t_su = ' + (p.cq + p.lmax + p.su) + ' ps → f_max = ' + (1e6 / (p.cq + p.lmax + p.su)).toFixed(0) + ' MHz';
      verdict.className = 'l7-verdict ' + (ss >= 0 && hs >= 0 ? 'ok' : 'bad');
      verdict.innerHTML = ss >= 0 && hs >= 0 ? '✅ Setup and hold both met' + (wasBad ? '<small>You fixed the violations.</small>' : '<small>Now break one on purpose, then fix it.</small>') :
        (ss < 0 ? '❌ Setup violation (' + ss + ' ps) ' : '') + (hs < 0 ? '❌ Hold violation (' + hs + ' ps)' : '') + '<small>' + (ss < 0 ? 'Setup: increase T, reduce logic max delay or t_cq. ' : '') + (hs < 0 ? 'Hold: increase the shortest path delay (add delay) – changing T has no effect on hold.' : '') + '</small>';
    }
    upd();
  }

  function pathFrame(k) {
    var o = '', items = [['Input port', 'Register', 'input-to-register'], ['Register', 'Register', 'register-to-register'], ['Register', 'Output port', 'register-to-output'], ['Input port', 'Output port', 'input-to-output (combinational)']];
    var it = items[k];
    o += T(300, 24, 'Timing path ' + (k + 1) + ' of 4: ' + it[2], 't-vio t-b');
    var box = function (x, lbl) { return lbl === 'Register' ? R(x - 40, 60, 80, 60, 'box-cu', 8) + T(x, 86, 'FF', 't-ink t-b') + '<path d="M' + (x - 40) + ' 104l10 6l-10 6" class="w"/>' + T(x, 140, 'startpoint/endpoint', 't-dim t-sm') : '<path d="M' + (x - 30) + ' 70h44l16 20l-16 20h-44z" class="box-vio"/>' + T(x - 6, 94, 'port', 't-ink t-sm'); };
    o += box(90, it[0]) + box(510, it[1]);
    o += R(220, 66, 160, 48, 'box-on', 10) + T(300, 95, 'combinational logic', 't-ink t-sm');
    o += P('M130 90H220', 'w-on flow') + P('M380 90H' + (it[1] === 'Register' ? 470 : 480), 'w-on flow');
    o += T(90, 52, 'start: ' + it[0], 't-sig t-sm') + T(510, 52, 'end: ' + it[1], 't-sig t-sm');
    return S(600, 160, o, it[2]);
  }

  L.module({
    n: 3,
    lead: 'Flip-flops need their data to be stable around the clock edge. Learn setup and hold, clock-to-Q, recovery and removal, and see exactly why a design fails when data arrives too late – or too early.',
    tags: ['clock-to-Q', 'setup time', 'hold time', 'recovery / removal', 'timing paths', 'constraints', 'margins', 'violations'],
    sections: [
      {
        id: 'c-ff', type: 'concept', title: 'Clocked timing: what a flip-flop needs', nav: 'Flip-flop timing',
        html: '<p>A flip-flop samples D at the active clock edge. To sample reliably, D must be stable in a small window around the edge – otherwise the flip-flop may capture the wrong value or go <b>metastable</b> (hover between 0 and 1 for an unpredictable time).</p>' +
          '<div class="l7-grid3"><div class="l7-box cu"><h4>Setup time t_su</h4><p>D must be stable this long <b>before</b> the edge.</p></div><div class="l7-box vio"><h4>Hold time t_h</h4><p>D must stay stable this long <b>after</b> the edge.</p></div><div class="l7-box sig"><h4>Clock-to-Q t_cq</h4><p>Delay from the clock edge until Q shows the new value.</p></div></div>' +
          '<p style="margin-top:12px">For asynchronous set/reset inputs the equivalent rules are <b>recovery time</b> (reset must be released this long before the next clock edge) and <b>removal time</b> (it must stay asserted this long after the edge).</p>'
      },
      { id: 'w-win', type: 'widget', title: 'Animated setup / hold diagram', nav: 'Setup/hold lab', intro: 'Move the clock edge and the data change, and adjust t_su and t_h. Find all three outcomes: timing met, setup violation and hold violation.', build: windowLab },
      {
        id: 'c-eq', type: 'concept', title: 'Setup and hold equations for a register-to-register path', nav: 'Equations',
        html: '<p>Data leaves the launching flip-flop at a clock edge, passes through combinational logic and must arrive at the capturing flip-flop before the <i>next</i> edge (setup), but not so quickly that it disturbs the capture at the <i>same</i> edge (hold).</p>' +
          '<div class="l7-eq">Setup:  t_cq + t_logic,max + t_su ≤ T      →   setup slack = T − (t_cq + t_logic,max + t_su)</div>' +
          '<div class="l7-eq">Hold:   t_cq + t_logic,min ≥ t_h          →   hold slack = (t_cq + t_logic,min) − t_h</div>' +
          '<div class="l7-grid2"><div class="l7-box cu"><h4>Setup depends on T</h4><p>A setup violation can always be fixed by slowing the clock – or by speeding up the longest path.</p></div><div class="l7-box vio"><h4>Hold does not depend on T</h4><p>A hold violation fails at <b>every</b> frequency; it must be fixed by adding delay to the shortest path.</p></div></div>'
      },
      { id: 'w-bud', type: 'widget', title: 'Register-to-register timing budget', nav: 'Budget lab', intro: 'This path starts with both a setup and a hold violation. Fix them so that both slacks are positive.', build: budget },
      {
        id: 'st-paths', type: 'steps', title: 'Animation: the four kinds of timing paths', nav: 'Timing paths',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['<b>Input to register</b>: data from an input port is captured by a flip-flop. Needs the external arrival time (input delay).', '<b>Register to register</b>: the most common path – launched and captured by flip-flops on the same clock.', '<b>Register to output</b>: data from a flip-flop must reach an output port in time for the next chip (output delay).', '<b>Input to output</b>: a purely combinational path through the block. Every path has a <b>startpoint</b> and an <b>endpoint</b>.'][k], svg: pathFrame(k) }; })
      },
      {
        id: 'c-con', type: 'concept', title: 'Timing constraints, margins and violations', nav: 'Constraints',
        html: '<p>Timing tools only check what they are told. <b>Timing constraints</b> describe the design\'s timing requirements, usually written in SDC (Synopsys Design Constraints) format:</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Constraint</th><th>Purpose</th><th>SDC example</th></tr>' +
          '<tr><td>Clock definition</td><td>period and waveform of each clock</td><td>create_clock -period 2 [get_ports clk]</td></tr>' +
          '<tr><td>Input delay</td><td>when inputs arrive, relative to the clock</td><td>set_input_delay 0.6 -clock clk [all_inputs]</td></tr>' +
          '<tr><td>Output delay</td><td>how early outputs are needed outside</td><td>set_output_delay 0.5 -clock clk [all_outputs]</td></tr>' +
          '<tr><td>Clock uncertainty</td><td>margin for jitter and skew</td><td>set_clock_uncertainty 0.05 [get_clocks clk]</td></tr>' +
          '<tr><td>Exceptions</td><td>false paths and multicycle paths</td><td>set_false_path / set_multicycle_path</td></tr></table></div>' +
          '<p>A <b>timing margin</b> is extra time kept in reserve for effects the model does not capture exactly (variation, noise, ageing). A <b>timing violation</b> is any check with negative slack – setup, hold, recovery or removal.</p>'
      },
      {
        id: 'rv-sh', type: 'reveal', title: 'Click to reveal: setup & hold insights', nav: 'Reveal',
        items: [
          { q: 'Why does lowering the clock frequency not fix a hold violation?', a: 'Hold compares the earliest data arrival with the same clock edge – the clock period does not appear in the hold equation.' },
          { q: 'What is metastability?', a: 'When D changes inside the setup/hold window, the flip-flop\'s internal latch can balance between 0 and 1 for an unpredictable time before resolving – possibly to the wrong value.' },
          { q: 'Can hold time be negative?', a: 'Yes. Some flip-flops have internal clock delay that makes their hold requirement negative – data may change slightly before the edge.' },
          { q: 'Why do shift registers often have hold problems?', a: 'Q of one flip-flop connects directly to D of the next with almost no logic, so the shortest path is just t_cq.' },
          { q: 'What is recovery time?', a: 'The minimum time between the release (de-assertion) of an asynchronous reset and the next active clock edge.' },
          { q: 'Why define input and output delays?', a: 'They describe the parts of a path that lie outside the block, so the tool knows how much of the clock period is left for the logic inside.' }
        ]
      },
      {
        id: 'dd-sh', type: 'drag', title: 'Drag & drop: setup or hold?', nav: 'Drag & drop',
        bins: ['Setup check', 'Hold check', 'Asynchronous (recovery / removal)'],
        items: [['Uses the longest data path', 0], ['Fixed by a slower clock', 0], ['Data arrives too late', 0], ['Uses the shortest data path', 1], ['Independent of clock period', 1], ['Fixed by adding delay buffers', 1], ['Reset released too close to a clock edge', 2], ['Reset de-asserted too soon after the edge', 2]]
      },
      {
        id: 'calc3', type: 'calc', title: 'Timing calculations', nav: 'Calculate',
        items: [
          { q: 'T = 2 ns, t_cq = 100 ps, t_logic,max = 1.6 ns, t_su = 80 ps. Setup slack (ps)?', a: 220, u: 'ps', h: 'T − (t_cq + t_logic + t_su).', s: '2000 − (100 + 1600 + 80) = <b>+220 ps</b>.' },
          { q: 'With t_cq = 100 ps, t_logic,max = 1.6 ns and t_su = 80 ps, what is the maximum clock frequency (MHz)?', a: 561.8, u: 'MHz', tol: 0.01, h: 'T_min = 1780 ps.', s: '1 / 1.78 ns = <b>561.8 MHz</b>.' },
          { q: 't_cq = 60 ps, shortest logic path = 20 ps, t_h = 110 ps. Hold slack (ps)?', a: -30, u: 'ps', h: '(t_cq + t_logic,min) − t_h.', s: '(60 + 20) − 110 = <b>−30 ps</b> → hold violation; add ≥ 30 ps of delay to the short path.' },
          { q: 'A clock edge occurs at 500 ps, t_su = 70 ps. What is the latest time (ps) D may change and still meet setup?', a: 430, u: 'ps', h: 'Edge − t_su.', s: '500 − 70 = <b>430 ps</b>.' },
          { q: 'Same edge at 500 ps, t_h = 40 ps. What is the earliest time (ps) the next D change may occur without a hold violation?', a: 540, u: 'ps', h: 'Edge + t_h.', s: '500 + 40 = <b>540 ps</b>.' }
        ]
      },
      {
        id: 'mcq3', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Setup time is the time data must be stable…', o: ['after the clock edge', 'before the clock edge', 'during the whole clock period', 'after reset'], a: 1, w: 'Before the edge.' },
          { q: 'A hold violation is caused by data that arrives…', o: ['too late', 'too early', 'with too much slew', 'at the wrong voltage'], a: 1, w: 'New data disturbs the capture.' },
          { q: 'Which change can fix a setup violation?', o: ['add delay to the short path', 'increase the clock period', 'increase hold time', 'reduce t_cq of the capture FF only'], a: 1, w: 'More time for the long path.' },
          { q: 'Recovery time applies to…', o: ['data inputs', 'asynchronous reset release', 'clock skew', 'output ports'], a: 1, w: 'Async control signals.' }
        ]
      },
      {
        id: 'short3', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Write the setup and hold conditions for a register-to-register path and explain why only one depends on the clock period.', k: ['t_cq|clock-to-q|tcq', 'max|longest', 'min|shortest', 'period|t\\b|frequency'], m: 'Setup: t_cq + t_logic,max + t_su ≤ T, because data launched at one edge must arrive before the next edge. Hold: t_cq + t_logic,min ≥ t_h, because data launched at an edge must not reach the capture flip-flop before its hold time at the same edge has passed. Only setup involves two different edges, so only setup depends on the period.' },
          { q: 'Explain what happens inside a flip-flop when its setup or hold time is violated.', k: ['metastab', 'wrong|incorrect', 'unpredictable|uncertain|random', 'window|around the edge'], m: 'If D changes within the setup/hold window around the clock edge, the internal latch may be left in an unstable intermediate state (metastability). It eventually resolves to 0 or 1, but after an unpredictable time and possibly to the wrong value, so downstream logic can see incorrect or late data.' }
        ]
      },
      {
        id: 'scen3', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your chip fails in the lab at 500 MHz but works at 400 MHz.', q: 'Which kind of violation is most likely?', o: [{ t: 'Setup violation', ok: true, w: 'Frequency-dependent failures point to setup.' }, { t: 'Hold violation', ok: false, w: 'Hold failures do not disappear at lower frequency.' }, { t: 'Recovery violation only', ok: false, w: 'Possible but setup is the classic frequency-dependent failure.' }] },
          { s: 'A chip fails at every frequency, even 1 MHz, on a path between two directly connected flip-flops.', q: 'What is the likely problem and fix?', o: [{ t: 'Hold violation – insert delay cells on the short path', ok: true, w: 'Correct – hold is independent of frequency.' }, { t: 'Setup violation – lower the frequency further', ok: false, w: 'It already fails at 1 MHz.' }, { t: 'Increase the setup time', ok: false, w: 'Setup time is a property of the flip-flop, and it is not the problem.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Clock-to-Q delay is…', o: ['the time data must be stable before the edge', 'the delay from clock edge to a valid Q', 'the clock period', 'the hold time'], a: 1, w: 'Launch delay of the flip-flop.' },
      { d: 'Easy', q: 'Hold time is the time data must remain stable…', o: ['before the edge', 'after the edge', 'between two edges', 'after reset'], a: 1, w: 'After the edge.' },
      { d: 'Easy', q: 'A timing violation means…', o: ['positive slack', 'negative slack', 'zero power', 'a short circuit'], a: 1, w: 'Negative slack.' },
      { d: 'Medium', q: 'T = 1 ns, t_cq = 50 ps, logic = 800 ps, t_su = 100 ps. Setup slack =', o: ['+50 ps', '−50 ps', '+150 ps', '0 ps'], a: 0, w: '1000 − 950 = +50 ps.' },
      { d: 'Medium', q: 't_cq = 40 ps, shortest logic = 30 ps, t_h = 50 ps. Hold slack =', o: ['+20 ps', '−20 ps', '+120 ps', '−70 ps'], a: 0, w: '70 − 50 = +20 ps.' },
      { d: 'Medium', q: 'In a timing diagram, D changes 30 ps before the edge and t_su = 60 ps. The result is…', o: ['timing met', 'setup violation', 'hold violation', 'recovery violation'], a: 1, w: 'Inside the setup window.' },
      { d: 'Medium', q: 'In a timing diagram, D changes 20 ps after the edge and t_h = 50 ps. The result is…', o: ['timing met', 'setup violation', 'hold violation', 'removal violation'], a: 2, w: 'Inside the hold window.' },
      { d: 'Hard', q: 'With t_cq = 70 ps, t_logic,max = 1.13 ns and t_su = 50 ps, f_max is…', o: ['800 MHz', '1 GHz', '667 MHz', '750 MHz'], a: 0, w: 'T_min = 1.25 ns → 800 MHz.' },
      { d: 'Hard', q: 'Which constraint tells the tool when signals arrive at the block inputs?', o: ['create_clock', 'set_input_delay', 'set_output_delay', 'set_false_path'], a: 1, w: 'Input delay relative to the clock.' },
      { d: 'Hard', q: 'Doubling the clock period changes the hold slack by…', o: ['+T', '−T', 'nothing', 'it doubles'], a: 2, w: 'T is not in the hold equation.' }
    ]
  });
})();
