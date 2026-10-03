/* Level 8 · Module 5 – Static Timing Analysis (STA) */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var EX = [
    {
      lvl: 'Easy', title: 'Single path, setup check', T: 600,
      nodes: [['FF1', 't_cq 80', 'ff'], ['G1', '120', 'g'], ['G2', '150', 'g'], ['G3', '100', 'g'], ['FF2', 't_su 50', 'ff']],
      txt: 'Clock period T = 600 ps, ideal clock (no skew or uncertainty).',
      at: 450, rat: 550, kind: 'setup',
      sol: 'AT = 80 + 120 + 150 + 100 = 450 ps · RAT = T − t_su = 600 − 50 = 550 ps · Slack = RAT − AT = +100 ps.'
    },
    {
      lvl: 'Medium', title: 'Two paths converge – take the latest arrival', T: 500, conv: true,
      txt: 'T = 500 ps. Path 1: FF_a (t_cq 70) → U1 (200) → U3. Path 2: FF_b (t_cq 70) → U2 (260) → U3. U3 = 180 ps, then FF_c (t_su 60).',
      at: 510, rat: 440, kind: 'setup',
      sol: 'At U3 the later input wins: max(70 + 200, 70 + 260) = 330 ps. AT at FF_c = 330 + 180 = 510 ps · RAT = 500 − 60 = 440 ps · Slack = 440 − 510 = −70 ps (violation).'
    },
    {
      lvl: 'Hard', title: 'Setup check with clock latency and uncertainty', T: 800,
      nodes: [['FF1', 't_cq 90', 'ff'], ['A', '150', 'g'], ['B', '210', 'g'], ['C', '170', 'g'], ['FF2', 't_su 50', 'ff']],
      txt: 'T = 800 ps. Launch clock latency 100 ps, capture clock latency 140 ps, clock uncertainty 30 ps.',
      at: 720, rat: 860, kind: 'setup',
      sol: 'AT = 100 (launch latency) + 90 + 150 + 210 + 170 = 720 ps · RAT = 800 + 140 (capture latency) − 50 − 30 = 860 ps · Slack = +140 ps.'
    },
    {
      lvl: 'Hard', title: 'Hold check on the shortest path', T: 800, hold: true,
      nodes: [['FF1', 't_cq 90', 'ff'], ['BUF', '40', 'g'], ['FF2', 't_h 60', 'ff']],
      txt: 'Hold check at the SAME edge. Launch latency 100 ps, capture latency 180 ps, hold uncertainty 20 ps.',
      at: 230, rat: 260, kind: 'hold',
      sol: 'Earliest AT = 100 + 90 + 40 = 230 ps · Hold required time = 180 + 60 + 20 = 260 ps · Hold slack = AT − required = 230 − 260 = −30 ps (violation – data arrives too early).'
    }
  ];

  /* ---------- Widget: progressive STA exercises ---------- */
  function staLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>STA workbench · compute arrival, required and slack</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, solved = {};
    var tabs = L.h('div', 'l7-row'); body.appendChild(tabs);
    var head = L.h('div', 'l7-readout'); body.appendChild(head);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var form = L.h('div', ''); body.appendChild(form);
    var verdict = L.h('div', ''); body.appendChild(verdict);
    function drawTabs() {
      tabs.innerHTML = '';
      EX.forEach(function (e, i) {
        var locked = i > 0 && !solved[i - 1] && !solved[i];
        var b = L.btn((solved[i] ? '✓ ' : locked ? '🔒 ' : '') + 'Example ' + (i + 1) + ' · ' + e.lvl, i === cur ? 'is-on' : '', function () { if (!locked) { cur = i; show(); } });
        if (locked) b.disabled = true; tabs.appendChild(b);
      });
    }
    function graph(e) {
      var o = '';
      if (e.conv) {
        var box = function (x, y, a, b, cls) { return R(x - 36, y - 20, 72, 40, cls, 8) + T(x, y - 2, a, 't-ink t-b t-sm') + T(x, y + 13, b, 't-cu t-sm'); };
        o += box(50, 50, 'FF_a', 't_cq 70', 'box-vio') + box(50, 150, 'FF_b', 't_cq 70', 'box-vio') + box(190, 50, 'U1', '200', 'box') + box(190, 150, 'U2', '260', 'box') + box(340, 100, 'U3', '180', 'box') + box(490, 100, 'FF_c', 't_su 60', 'box-vio');
        o += P('M86 50H154M86 150H154', 'w') + P('M226 50C270 50 270 90 304 96M226 150C270 150 270 110 304 104', 'w') + P('M376 100H454', 'w');
        return S(560, 200, o, 'Converging timing graph');
      }
      var n = e.nodes.length, dx = 520 / (n - 1);
      e.nodes.forEach(function (nd, i) {
        var x = 30 + i * dx;
        o += R(x - 34, 40, 68, 46, nd[2] === 'ff' ? 'box-vio' : 'box', 8) + T(x, 60, nd[0], 't-ink t-b t-sm') + T(x, 77, nd[1], 't-cu t-sm');
        if (i < n - 1) o += P('M' + (x + 34) + ' 63H' + (x + dx - 34), 'w');
      });
      o += T(30, 112, 'startpoint', 't-sig t-sm') + T(30 + (n - 1) * dx, 112, 'endpoint', 't-sig t-sm');
      return S(590, 124, o, 'Timing path');
    }
    function show() {
      var e = EX[cur]; drawTabs();
      head.innerHTML = '<span class="k">Example ' + (cur + 1) + ' (' + e.lvl + ')</span> <span class="v">' + e.title + '</span><br>' + e.txt;
      pic.innerHTML = graph(e);
      form.innerHTML = ''; verdict.innerHTML = '';
      var labels = e.hold ? ['Earliest arrival time AT (ps)', 'Hold required time (ps)', 'Hold slack = AT − required (ps)'] : ['Arrival time AT at the endpoint (ps)', 'Required arrival time RAT (ps)', 'Slack = RAT − AT (ps)'];
      var ins = labels.map(function (lb) {
        var row = L.h('div', 'l7-calc-row'); row.style.margin = '8px 0';
        row.appendChild(L.h('span', '', lb)); row.firstChild.style.minWidth = '260px'; row.firstChild.style.fontWeight = '600';
        var inp = document.createElement('input'); inp.className = 'l7-input'; inp.type = 'text'; inp.setAttribute('inputmode', 'decimal'); inp.setAttribute('aria-label', lb);
        row.appendChild(inp); form.appendChild(row); return inp;
      });
      var tries = 0;
      var r2 = L.h('div', 'l7-row'); form.appendChild(r2);
      r2.appendChild(L.btn('Check', 'pri', function () {
        var v = ins.map(function (x) { return parseFloat(String(x.value).replace('−', '-')); }), slack = e.hold ? e.at - e.rat : e.rat - e.at;
        var ok = [v[0] === e.at, v[1] === e.rat, v[2] === slack];
        ins.forEach(function (x, i) { x.style.borderColor = isNaN(v[i]) ? '' : ok[i] ? 'var(--l7-ok)' : 'var(--l7-bad)'; });
        if (ok[0] && ok[1] && ok[2]) {
          solved[cur] = 1; drawTabs();
          verdict.innerHTML = '<div class="l7-verdict ' + (slack >= 0 ? 'ok' : 'bad') + '">' + (slack >= 0 ? '🟢 Positive slack (' + slack + ' ps) – timing met' : '🔴 Negative slack (' + slack + ' ps) – timing violation') + '<small>' + e.sol + '</small></div>';
          if (Object.keys(solved).length === EX.length) { api.done(); verdict.innerHTML += '<div class="l7-fb ok">🎉 All four STA examples solved.</div>'; }
          else if (cur < EX.length - 1) { var nb = L.btn('Next example →', 'pri', function () { cur++; show(); }); var rr = L.h('div', 'l7-row'); rr.appendChild(nb); verdict.appendChild(rr); }
        } else {
          tries++;
          verdict.innerHTML = '<div class="l7-fb bad">✗ ' + ['AT', e.hold ? 'Required' : 'RAT', 'Slack'].filter(function (x, i) { return !ok[i]; }).join(', ') + ' not correct yet. ' +
            (e.hold ? 'Hint: hold uses the EARLIEST arrival and the SAME clock edge.' : e.conv ? 'Hint: at a converging gate, setup analysis keeps the LATEST arrival.' : 'Hint: AT adds every delay from the clock edge; RAT starts from the capture edge.') +
            (tries >= 2 ? '<br><b>Solution:</b> ' + e.sol : '') + '</div>';
        }
      }));
    }
    show();
  }

  /* ---------- Widget: reading a timing report ---------- */
  var REPORT = [
    ['Startpoint: u_ctrl/state_reg[2] (rising edge-triggered flip-flop clocked by clk)', 'The path starts at the clock pin of this flip-flop – a register-to-register path.'],
    ['Endpoint: u_alu/acc_reg[15] (rising edge-triggered flip-flop clocked by clk)', 'The path ends at the D pin of this flip-flop, where setup is checked.'],
    ['Path Type: max', '"max" means a setup check (latest arrival). A hold report says "min".'],
    ['clock clk (rise edge)            0.00     0.00', 'The launch edge at time 0.'],
    ['clock network delay (propagated) 0.21     0.21', 'Launch clock latency: 0.21 ns from the clock source to the flip-flop.'],
    ['state_reg[2]/CK->Q (DFF_X1)      0.12     0.33 r', 'Clock-to-Q delay of the launch flip-flop. "r" = rising output transition.'],
    ['U45/Y (NAND2_X1)                 0.09     0.42 f', 'Incr = this cell\'s delay (0.09 ns); Path = running total, the arrival time so far.'],
    ['U78/Y (AOI22_X1)                 0.24     0.66 r', 'The largest single cell delay on this path – a candidate for up-sizing.'],
    ['U102/Y (XOR2_X2)                 0.31     0.97 f', 'Another slow cell; net load and input slew both contribute.'],
    ['acc_reg[15]/D (DFF_X1)           0.02     0.99 f', 'Small wire delay into the D pin. Data arrival time = 0.99 ns.'],
    ['data arrival time                         0.99', 'The latest time data arrives at the endpoint.'],
    ['clock clk (rise edge)            1.00     1.00', 'The capture edge, one period (1.00 ns) later.'],
    ['clock network delay (propagated) 0.18     1.18', 'Capture clock latency 0.18 ns → skew = 0.18 − 0.21 = −0.03 ns.'],
    ['clock uncertainty               -0.05     1.13', 'Margin for jitter, subtracted from the available time.'],
    ['library setup time              -0.07     1.06', 'Setup time of the capture flip-flop.'],
    ['data required time                        1.06', 'RAT = 1.00 + 0.18 − 0.05 − 0.07 = 1.06 ns.'],
    ['slack (MET)                               0.07', 'Slack = required − arrival = 1.06 − 0.99 = +0.07 ns. Positive: timing met.']
  ];
  function reportLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Timing report reader · tap any line</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var seen = {};
    var rep = L.h('div', 'l7-readout'); rep.style.whiteSpace = 'pre'; rep.style.fontSize = '.8rem'; rep.style.lineHeight = '1.9'; body.appendChild(rep);
    var fb = L.h('div', 'l7-fb info', 'Tap a line of the report to see what it means. Explore at least eight lines, including the slack line.'); body.appendChild(fb);
    REPORT.forEach(function (ln, i) {
      var s = L.h('div', ''); s.textContent = ln[0]; s.style.cursor = 'pointer'; s.style.borderRadius = '6px'; s.style.padding = '0 6px'; s.tabIndex = 0; s.setAttribute('role', 'button');
      if (/slack/.test(ln[0])) { s.style.fontWeight = '700'; s.style.color = 'var(--l7-ok)'; }
      if (/arrival time|required time/.test(ln[0])) s.style.fontWeight = '700';
      function go() {
        L.$$('div', rep).forEach(function (x) { x.style.background = ''; }); s.style.background = 'var(--l7-sig-dim)';
        seen[i] = 1; L.fb(fb, 'info', '<b>Line ' + (i + 1) + ':</b> ' + ln[1] + ' <span style="opacity:.7">(' + Object.keys(seen).length + ' of ' + REPORT.length + ' explored)</span>');
        if (Object.keys(seen).length >= 8 && seen[REPORT.length - 1]) api.done();
      }
      s.addEventListener('click', go); s.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      rep.appendChild(s);
    });
  }

  function travFrame(k) {
    var nodes = [['IN', 40, 100, '0'], ['N1', 170, 50, '3'], ['N2', 170, 150, '5'], ['N3', 310, 100, '2'], ['OUT', 450, 100, '']];
    var AT = { IN: 0, N1: 3, N2: 5, N3: 7, OUT: 7 }, RAT = { OUT: 8, N3: 8, N1: 6, N2: 6, IN: 1 };
    var o = '';
    [['IN', 'N1'], ['IN', 'N2'], ['N1', 'N3'], ['N2', 'N3'], ['N3', 'OUT']].forEach(function (e) {
      var a = nodes.filter(function (n) { return n[0] === e[0]; })[0], b = nodes.filter(function (n) { return n[0] === e[1]; })[0];
      o += P('M' + (a[1] + 26) + ' ' + a[2] + 'L' + (b[1] - 26) + ' ' + b[2], 'w');
    });
    nodes.forEach(function (n, i) {
      o += R(n[1] - 26, n[2] - 18, 52, 36, 'box', 8) + T(n[1], n[2] + 4, n[0], 't-ink t-b t-sm');
      if (n[3]) o += T(n[1], n[2] + 32, 'd=' + n[3], 't-cu t-sm');
      if (k >= 1 && (k >= 2 || i <= 2)) o += T(n[1], n[2] - 24, 'AT ' + AT[n[0]], 't-sig t-b t-sm');
      if (k >= 3) o += T(n[1], n[2] + 46, 'RAT ' + RAT[n[0]], 't-vio t-b t-sm');
      if (k >= 4) { var sl = RAT[n[0]] - AT[n[0]]; o += T(n[1] + 34, n[2] + 4, 's=' + sl, sl > 1 ? 't-ok t-b t-sm' : 't-cu t-b t-sm', 'start'); }
    });
    o += T(250, 196, ['A timing graph: nodes are pins, edges carry delays (ns)', 'Forward pass: arrival time = latest input AT + delay', 'At N3 the later input wins: max(3, 5) + 2 = 7', 'Backward pass from the required time 8 at OUT: RAT = earliest downstream RAT − delay', 'Slack = RAT − AT. The path IN → N2 → N3 → OUT has the smallest slack (1): the critical path'][k], 't-vio t-b t-sm');
    return S(520, 206, o, 'Timing graph traversal');
  }

  L.module({
    n: 5,
    lead: 'Static timing analysis checks every path in a design without simulation vectors. Learn how STA builds a timing graph, computes arrival and required times, and reports slack – then solve STA problems and read a real-style timing report.',
    tags: ['STA', 'timing graph', 'startpoint / endpoint', 'arrival time', 'required time', 'slack', 'setup & hold analysis', 'timing reports'],
    sections: [
      {
        id: 'c-sta', type: 'concept', title: 'STA fundamentals', nav: 'Fundamentals',
        html: '<p><b>Static timing analysis</b> computes the worst-case timing of every path in a design using delay models – no input vectors are needed. Unlike timing simulation, it is exhaustive: no path can be forgotten because a test did not exercise it.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>What STA needs</h4><ul><li>The gate-level netlist</li><li>Cell delay models (timing libraries)</li><li>Interconnect parasitics (R and C)</li><li>Timing constraints (clocks, I/O delays, exceptions)</li></ul></div><div class="l7-box cu"><h4>What STA reports</h4><ul><li>Slack of every endpoint for setup and hold</li><li>The critical paths in detail</li><li>Other checks: slew, capacitance, recovery/removal</li></ul></div></div>'
      },
      {
        id: 'c-graph', type: 'concept', title: 'Timing graph, arrival, required time and slack', nav: 'AT · RAT · slack',
        html: '<p>STA turns the circuit into a <b>timing graph</b>: nodes are pins, edges are cell or net delays. Every path runs from a <b>startpoint</b> (an input port or a flip-flop clock pin) to an <b>endpoint</b> (an output port or a flip-flop data pin).</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Arrival time (AT)</h4><p>When the signal actually arrives – the sum of delays from the launch edge. At a merge, setup analysis keeps the <b>latest</b> arrival.</p></div><div class="l7-box vio"><h4>Required time (RAT)</h4><p>When the signal must arrive – from the capture edge minus setup time (and uncertainty).</p></div><div class="l7-box cu"><h4>Slack</h4><p>Setup: RAT − AT. Hold: AT − required. Positive = met, negative = violation.</p></div></div>' +
          '<div class="l7-eq">setup slack = RAT − AT      hold slack = AT_min − RAT_hold      worst negative slack (WNS), total negative slack (TNS)</div>'
      },
      {
        id: 'st-trav', type: 'steps', title: 'Animation: forward and backward passes', nav: 'Graph traversal',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['STA represents the circuit as a graph of delays.', 'A forward (topological) pass computes arrival times.', 'Where paths merge, setup analysis keeps the latest arrival.', 'A backward pass computes required times from the endpoints.', 'Slack at every node shows how much margin each part of the circuit has; the smallest slack marks the critical path.'][k], svg: travFrame(k) }; })
      },
      { id: 'w-sta', type: 'widget', title: 'STA workbench: progressively harder examples', nav: 'STA workbench', intro: 'Solve all four examples: compute AT, RAT and slack. Each example unlocks the next.', build: staLab },
      {
        id: 'c-sh', type: 'concept', title: 'Setup analysis vs hold analysis', nav: 'Setup vs hold',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th></th><th>Setup (max) analysis</th><th>Hold (min) analysis</th></tr>' +
          '<tr><td>Question</td><td>Is the data too late?</td><td>Is the data too early?</td></tr>' +
          '<tr><td>Data path delay used</td><td>largest (slow corner)</td><td>smallest (fast corner)</td></tr>' +
          '<tr><td>Capture edge</td><td>next edge (T later)</td><td>same edge</td></tr>' +
          '<tr><td>Fix</td><td>speed up path or slow the clock</td><td>add delay to the path</td></tr></table></div>' +
          '<p>Timing is checked at several <b>corners</b> (process, voltage, temperature): setup mainly at the slow corner, hold mainly at the fast corner.</p>'
      },
      { id: 'w-rep', type: 'widget', title: 'Interpreting a timing report', nav: 'Report reader', intro: 'This is a typical setup timing report. Tap lines to learn how to read it.', build: reportLab },
      {
        id: 'rv-sta', type: 'reveal', title: 'Click to reveal: STA insights', nav: 'Reveal',
        items: [
          { q: 'Why is STA preferred over timing simulation for sign-off?', a: 'It checks every path exhaustively and quickly. Simulation only checks the paths exercised by the chosen test vectors.' },
          { q: 'What are WNS and TNS?', a: 'Worst negative slack is the most negative slack in the design; total negative slack is the sum of all negative slacks – a measure of how much work remains.' },
          { q: 'Why does STA need constraints?', a: 'Without clock definitions and I/O delays it does not know when signals launch and when they must be captured, so it cannot compute required times.' },
          { q: 'What is a false path?', a: 'A path that can never be sensitised functionally; it is excluded from analysis so it does not produce false violations.' },
          { q: 'What is a multicycle path?', a: 'A path designed to take more than one clock cycle; the constraint tells STA to use a later capture edge.' },
          { q: 'Why can STA be pessimistic?', a: 'It assumes worst-case delays and transitions on every path, even combinations that cannot occur together in real operation.' }
        ]
      },
      {
        id: 'dd-sta', type: 'drag', title: 'Drag & drop: STA vocabulary', nav: 'Drag & drop',
        bins: ['Startpoint', 'Endpoint', 'Arrival time', 'Required time'],
        items: [['Clock pin of a launch flip-flop', 0], ['Input port', 0], ['D pin of a capture flip-flop', 1], ['Output port', 1], ['Launch edge + t_cq + path delays', 2], ['Latest value at a merge (setup)', 2], ['Capture edge − setup time', 3], ['Reduced by clock uncertainty', 3]]
      },
      {
        id: 'calc5', type: 'calc', title: 'STA calculations', nav: 'Calculate',
        items: [
          { q: 'T = 1.2 ns, t_su = 0.08 ns, ideal clock. What is the required time at the capture flip-flop (ns)?', a: 1.12, u: 'ns', h: 'RAT = T − t_su.', s: '1.2 − 0.08 = <b>1.12 ns</b>.' },
          { q: 'A path has t_cq = 0.1 ns and cell delays 0.25, 0.3 and 0.2 ns. What is the arrival time (ns)?', a: 0.85, u: 'ns', h: 'Add all delays.', s: '0.1 + 0.25 + 0.3 + 0.2 = <b>0.85 ns</b>.' },
          { q: 'With RAT = 1.12 ns and AT = 0.85 ns, what is the setup slack (ns)?', a: 0.27, u: 'ns', h: 'RAT − AT.', s: '<b>+0.27 ns</b> – timing met.' },
          { q: 'Two inputs reach a gate at 0.4 ns and 0.55 ns; the gate delay is 0.15 ns. What is the arrival time at its output for setup analysis (ns)?', a: 0.7, u: 'ns', h: 'Take the latest input.', s: '0.55 + 0.15 = <b>0.70 ns</b>.' },
          { q: 'Endpoint slacks are −0.05, −0.12, +0.10 and −0.03 ns. What is the TNS (ns)?', a: -0.2, u: 'ns', h: 'Sum only the negative slacks.', s: '−0.05 − 0.12 − 0.03 = <b>−0.20 ns</b> (WNS = −0.12 ns).' }
        ]
      },
      {
        id: 'mcq5', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Static timing analysis…', o: ['needs test vectors', 'checks all paths without vectors', 'only checks hold', 'measures power'], a: 1, w: 'Vector-less and exhaustive.' },
          { q: 'Setup slack is…', o: ['AT − RAT', 'RAT − AT', 'AT + RAT', 'T − AT'], a: 1, w: 'Required minus arrival.' },
          { q: 'At a gate where two paths merge, setup analysis uses…', o: ['the earliest arrival', 'the latest arrival', 'the average', 'either'], a: 1, w: 'Worst case for setup.' },
          { q: 'In a timing report, "Path Type: min" indicates…', o: ['a setup check', 'a hold check', 'a power check', 'a false path'], a: 1, w: 'Min = hold.' }
        ]
      },
      {
        id: 'short5', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Define arrival time, required time and slack, and explain how they indicate a timing violation.', k: ['arrival|actual', 'required|must', 'slack|difference', 'negative|violation'], m: 'Arrival time is when the signal actually reaches a node, computed by adding delays from the launch edge. Required time is when it must arrive to satisfy the check, computed from the capture edge minus setup time and margins. Slack is required minus arrival for setup (arrival minus required for hold); a negative slack means a violation.' },
          { q: 'Why does STA check setup at the slow corner and hold at the fast corner?', k: ['slow|largest|max', 'fast|smallest|min', 'late|setup', 'early|hold'], m: 'Setup fails when data is too late, which is worst when gates are slowest (slow process, low voltage, usually high temperature). Hold fails when data is too early, which is worst when gates are fastest. Checking each at its worst corner covers all chips.' }
        ]
      },
      {
        id: 'scen5', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'An STA report shows a single path with slack −0.5 ns between two unrelated clock domains connected through a synchronizer.', q: 'What should you do first?', o: [{ t: 'Check the constraints: asynchronous clocks should be declared as unrelated (or the path as a false path)', ok: true, w: 'The violation is not real – the synchronizer handles the crossing.' }, { t: 'Up-size every gate on the path', ok: false, w: 'Optimising a meaningless path wastes area and power.' }, { t: 'Slow down both clocks', ok: false, w: 'The relationship between unrelated clocks is undefined.' }] },
          { s: 'WNS = −20 ps but TNS = −45 ns across 3000 endpoints.', q: 'What does this tell you?', o: [{ t: 'Many paths fail by a small amount – a broad, systematic issue (e.g. a constraint or clock problem)', ok: true, w: 'Small WNS but huge TNS means widespread small violations.' }, { t: 'Only one path fails', ok: false, w: 'TNS shows thousands of failing endpoints.' }, { t: 'Timing is met', ok: false, w: 'Any negative slack is a violation.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'STA stands for…', o: ['Static Timing Analysis', 'Signal Test Automation', 'Standard Timing Algorithm', 'Synchronous Test Analysis'], a: 0, w: '' },
      { d: 'Easy', q: 'An endpoint of a timing path is typically…', o: ['a flip-flop clock pin', 'a flip-flop data pin or output port', 'a PLL', 'a power pin'], a: 1, w: 'Where the check happens.' },
      { d: 'Easy', q: 'Positive slack means…', o: ['timing met', 'timing violation', 'no clock', 'false path'], a: 0, w: '' },
      { d: 'Medium', q: 'AT = 0.92 ns, RAT = 0.88 ns. Setup slack =', o: ['+0.04 ns', '−0.04 ns', '1.80 ns', '0'], a: 1, w: 'RAT − AT = −0.04 ns.' },
      { d: 'Medium', q: 'T = 1 ns, t_su = 0.05 ns, capture latency 0.1 ns, uncertainty 0.03 ns. RAT =', o: ['1.02 ns', '0.92 ns', '1.08 ns', '0.95 ns'], a: 0, w: '1 + 0.1 − 0.05 − 0.03.' },
      { d: 'Medium', q: 'Inputs arrive at 0.3 and 0.45 ns; gate delay 0.2 ns. Output AT (setup) =', o: ['0.5 ns', '0.65 ns', '0.75 ns', '0.45 ns'], a: 1, w: 'Latest input + delay.' },
      { d: 'Medium', q: 'Hold slack is computed as…', o: ['RAT − AT', 'AT_min − required_hold', 'T − AT', 'AT + T'], a: 1, w: '' },
      { d: 'Hard', q: 'Launch latency 0.2, t_cq 0.1, path 0.05, capture latency 0.3, t_h 0.08 ns. Hold slack =', o: ['+0.03 ns', '−0.03 ns', '+0.13 ns', '−0.13 ns'], a: 1, w: '0.35 − 0.38 = −0.03 ns.' },
      { d: 'Hard', q: 'Which inputs does STA NOT need?', o: ['netlist', 'timing libraries', 'test vectors', 'constraints'], a: 2, w: 'STA is vector-less.' },
      { d: 'Hard', q: 'A report shows "clock network delay 0.21" at launch and "0.18" at capture. The skew is…', o: ['+0.03 ns', '−0.03 ns', '0.39 ns', '0'], a: 1, w: 'Capture − launch.' }
    ]
  });
})();
