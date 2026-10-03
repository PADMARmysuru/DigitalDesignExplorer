/* Level 8 · Module 6 – Timing Optimization */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var BASE = { stages: [['FF1 t_cq', 80], ['INV', 40], ['NAND2 (fan-out 8)', 200], ['AOI21', 150], ['NOR3', 140], ['XOR2', 120], ['FF2 t_su', 60]], T: 700, area: 100, power: 100 };
  var OPTS = [
    { k: 'size', n: 'Increase gate size', d: 'Up-size the NAND2 driving the fan-out-8 net from X1 to X4.', dt: function (on) { return on.buf ? -30 : -60; }, da: 4, dp: 5, why: 'Lower drive resistance charges the heavy net faster. But the X4 cell is bigger, leaks more and its larger input loads the INV before it.' },
    { k: 'buf', n: 'Add buffer', d: 'Split the 8 loads: keep 2 critical loads on the NAND2 and drive the other 6 through a buffer.', dt: function (on) { return on.size ? -20 : on.load ? -15 : -40; }, da: 3, dp: 3, why: 'The critical path now sees a small load. The buffer adds area and switching power, and its own delay on the non-critical branch.' },
    { k: 'load', n: 'Reduce load', d: 'Re-connect 4 non-critical loads to a copy of the signal elsewhere (fewer receivers on the critical net).', dt: function (on) { return on.buf ? -15 : -35; }, da: 0, dp: -2, why: 'Less capacitance on the critical net reduces delay and even saves a little switching power – often the cheapest fix if the logic allows it.' },
    { k: 'restr', n: 'Restructure logic', d: 'The late-arriving signal currently passes AOI21 and NOR3; re-arrange the logic so it enters the last gate instead.', dt: function () { return -70; }, da: 1, dp: 0, why: 'The late signal now passes fewer gates. Same function, different structure – usually the most powerful fix, but it needs logic insight (normally done by synthesis).' }
  ];

  /* ---------- Widget: fix the violation ---------- */
  function fixer(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Timing fix lab · choose optimisations for the failing path</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var on = {};
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var grid = L.h('div', 'l7-grid2'); body.appendChild(grid);
    var btns = {};
    OPTS.forEach(function (o) {
      var b = L.btn('<span style="font-weight:700">' + o.n + '</span><span style="font-weight:500;font-size:.85em">' + o.d + '</span>', '', function () { on[o.k] = !on[o.k]; upd(o); });
      b.style.textAlign = 'left'; b.style.borderRadius = '16px'; b.style.padding = '12px 16px'; b.style.justifyContent = 'flex-start'; b.style.flexDirection = 'column'; b.style.alignItems = 'flex-start'; b.style.gap = '2px';
      btns[o.k] = b; grid.appendChild(b);
    });
    var tbl = L.h('div', 'l7-table-wrap'); body.appendChild(tbl);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    var why = L.h('div', 'l7-fb'); body.appendChild(why);
    function totals() {
      var d = BASE.stages.reduce(function (a, s) { return a + s[1]; }, 0), a = BASE.area, pw = BASE.power;
      OPTS.forEach(function (o) { if (on[o.k]) { d += o.dt(on); a += o.da; pw += o.dp; } });
      return { d: d, s: BASE.T - d, a: a, p: pw };
    }
    function upd(last) {
      OPTS.forEach(function (o) { btns[o.k].classList.toggle('is-on', !!on[o.k]); });
      var b0 = BASE.stages.reduce(function (a, s) { return a + s[1]; }, 0), t = totals(), o = '', x = 10, sc = 560 / 860;
      BASE.stages.forEach(function (s, i) {
        var d = s[1];
        if (i === 2) { if (on.size) d -= on.buf ? 30 : 60; if (on.buf) d -= on.size ? 20 : on.load ? 15 : 40; if (on.load) d -= on.buf ? 15 : 35; }
        if ((i === 3 || i === 4) && on.restr) d -= 35;
        var w = d * sc;
        o += R(x, 30, w - 2, 34, i === 0 || i === 6 ? 'box-vio' : (i === 2 && (on.size || on.buf || on.load)) || ((i === 3 || i === 4) && on.restr) ? 'box-ok' : 'box', 6);
        if (w > 44) o += T(x + w / 2, 52, d, 't-ink t-b t-sm');
        o += T(x + w / 2, 82, s[0].split(' ')[0], 't-dim t-sm');
        x += w;
      });
      o += P('M' + (10 + BASE.T * sc) + ' 20V96', t.s < 0 ? 'w-bad' : 'wv-clk') + T(10 + BASE.T * sc, 112, 'T = 700 ps', t.s < 0 ? 't-bad t-b t-sm' : 't-ok t-b t-sm');
      pic.innerHTML = S(600, 120, o, 'Path delay breakdown');
      var cell = function (v, b, lowerBetter) { return '<td class="' + (v === b ? '' : (lowerBetter ? v < b : v > b) ? 'better' : 'worse') + '">' + v + '</td>'; };
      tbl.innerHTML = '<table class="l7-cmp"><tr><th>Parameter</th><th>Before</th><th>After</th></tr>' +
        '<tr><td>Path delay (ps)</td><td>' + b0 + '</td>' + cell(t.d, b0, true) + '</tr>' +
        '<tr><td>Setup slack (ps)</td><td>' + (BASE.T - b0) + '</td>' + cell(t.s, BASE.T - b0, false) + '</tr>' +
        '<tr><td>Area (%)</td><td>100</td>' + cell(t.a, 100, true) + '</tr>' +
        '<tr><td>Power (%)</td><td>100</td>' + cell(t.p, 100, true) + '</tr></table>';
      if (t.s >= 0) {
        verdict.className = 'l7-verdict ok';
        verdict.innerHTML = '✅ Timing met (slack +' + t.s + ' ps)<small>' + (t.a <= 101 ? 'Excellent – you fixed it with almost no area cost.' : 'Can you reach positive slack with less area and power? The cheapest fixes come first.') + '</small>';
        api.done();
      } else { verdict.className = 'l7-verdict bad'; verdict.innerHTML = '❌ Setup violation (slack ' + t.s + ' ps)<small>Select one or more optimisations. Notice that fixes on the same net give diminishing returns.</small>'; }
      if (last) L.fb(why, 'info', '<b>' + last.n + (on[last.k] ? ' applied' : ' removed') + ':</b> ' + last.why);
    }
    upd();
  }

  /* ---------- Widget: hold fixing ---------- */
  function holdFix(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Hold fix lab · insert delay cells on a short path</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var n = 0, cell = 25, minD = 30, maxD = 420, hreq = 90, TP = 700, setupOverhead = 140;
    body.appendChild(L.h('p', 'l7-hint', 'This path\'s shortest route is only 30 ps (hold needs ≥ 90 ps incl. t_cq), but its longest route shares the same endpoint and must still meet setup. Each delay cell adds 25 ps to BOTH routes into the endpoint.'));
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('− Remove delay cell', 'ghost', function () { n = Math.max(0, n - 1); upd(); }));
    row.appendChild(L.btn('+ Add delay cell', 'pri', function () { n = Math.min(8, n + 1); upd(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function upd() {
      var hs = minD + n * cell - hreq, ss = TP - (maxD + n * cell + setupOverhead), o = '';
      o += R(10, 50, 60, 40, 'box-vio', 8) + T(40, 75, 'FF1', 't-ink t-b');
      o += P('M70 70H120', 'w') + R(120, 50, 60, 40, 'box', 8) + T(150, 75, 'logic', 't-dim t-sm');
      var x = 180;
      for (var i = 0; i < n; i++) { o += P('M' + x + ' 70H' + (x + 10), 'w') + '<path d="M' + (x + 10) + ' 58l26 12l-26 12z" class="box-cu"/>'; x += 40; }
      o += P('M' + x + ' 70H' + (x + 30), 'w') + R(x + 30, 50, 60, 40, 'box-vio', 8) + T(x + 60, 75, 'FF2', 't-ink t-b');
      if (n) o += T((180 + x) / 2, 44, n + ' delay cell' + (n > 1 ? 's' : ''), 't-cu t-sm');
      pic.innerHTML = S(Math.max(420, x + 110), 110, o, 'Short path with delay cells');
      out.innerHTML = '<span class="k">Hold slack</span> = ' + minD + ' + ' + n + '×' + cell + ' − ' + hreq + ' = <span class="' + (hs < 0 ? 'c' : 'v') + '">' + hs + ' ps</span><br><span class="k">Setup slack</span> = ' + T + ' − (' + maxD + ' + ' + n * cell + ' + ' + setupOverhead + ') = <span class="' + (ss < 0 ? 'c' : 'v') + '">' + ss + ' ps</span>';
      var ok = hs >= 0 && ss >= 0;
      if (ok) api.done();
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'bad');
      verdict.innerHTML = ok ? '✅ Hold and setup both met<small>Just enough delay: the short path is slow enough for hold, and the long path still meets setup.</small>' : hs < 0 ? '❌ Hold violation<small>Data still arrives too early – add delay.</small>' : '❌ Setup violation<small>Too much delay: the extra cells now break setup on the long path. Hold fixing must not create new setup problems.</small>';
    }
    upd();
  }

  function restrFrame(k) {
    var o = '';
    var before = k < 2;
    o += T(300, 22, before ? 'Before: the late signal E passes through every gate' : 'After: E enters the last gate', 't-vio t-b');
    var ins = before ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D', 'E'];
    var at = { A: 0, B: 0, C: 0, D: 0, E: 300 };
    if (before) {
      // chain ((((A·B)·C)·D)·E)... with E entering first gate
      var g = [['E', 'A'], ['B'], ['C'], ['D']], t = 300, x = 80;
      o += T(30, 66, 'E (arrives 300)', 't-cu t-b t-sm', 'start') + T(30, 96, 'A', 't-ink t-sm', 'start');
      for (var i = 0; i < 4; i++) {
        t += 50; o += R(x + i * 120, 60, 70, 40, i <= k * 3 ? 'box-on' : 'box', 8) + T(x + 35 + i * 120, 85, 'AND 50', 't-ink t-sm');
        if (i) o += T(x + 35 + i * 120, 124, (['', 'B', 'C', 'D'][i]) + ' (0)', 't-dim t-sm');
        o += P('M' + (x + 70 + i * 120) + ' 80H' + (x + 120 + i * 120), 'w');
        if (k >= 1) o += T(x + 95 + i * 120, 74, t, 't-sig t-b t-sm');
      }
      if (k >= 1) o += T(300, 160, 'Y arrives at 300 + 4 × 50 = 500 ps', 't-bad t-b');
    } else {
      o += R(80, 40, 70, 40, 'box-on', 8) + T(115, 65, 'AND', 't-ink t-sm') + R(80, 100, 70, 40, 'box-on', 8) + T(115, 125, 'AND', 't-ink t-sm');
      o += T(40, 55, 'A,B', 't-dim t-sm') + T(40, 115, 'C,D', 't-dim t-sm');
      o += R(220, 70, 70, 40, 'box-on', 8) + T(255, 95, 'AND', 't-ink t-sm') + P('M150 60L220 85M150 120L220 95', 'w');
      o += R(370, 70, 70, 40, 'box-ok', 8) + T(405, 95, 'AND', 't-ink t-b t-sm') + P('M290 90H370', 'w') + P('M330 150L370 100', 'w-cu') + T(320, 166, 'E (300)', 't-cu t-b t-sm');
      o += P('M440 90H500', 'w-on') + T(510, 95, 'Y', 't-ink t-b', 'start');
      if (k >= 3) o += T(300, 190, 'A–D are ready at 100 ps. Y arrives at 300 + 50 = 350 ps – 150 ps faster, same function.', 't-ok t-b t-sm');
    }
    return S(600, 200, o, 'Logic restructuring');
  }

  L.module({
    n: 6,
    lead: 'A timing report full of negative slack is a to-do list. Learn the standard optimisations – sizing, buffering, load reduction and restructuring – for setup, the special treatment hold violations need, and the delay/area/power trade-offs behind every fix.',
    tags: ['gate sizing', 'buffer insertion', 'fan-out optimisation', 'logic restructuring', 'setup fixes', 'hold fixes', 'trade-offs'],
    sections: [
      {
        id: 'c-flow', type: 'concept', title: 'The optimisation mindset', nav: 'Mindset',
        html: '<p>Timing optimisation repeatedly takes the worst path, applies the cheapest change that improves it, and re-analyses – because fixing one path can make another critical or create new problems elsewhere.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Target the critical path</h4><p>Only paths with negative (or small) slack need work. Non-critical paths can be made smaller and lower power.</p></div><div class="l7-box cu"><h4>Cheapest fix first</h4><p>Reduce load or restructure before adding area-hungry cells.</p></div><div class="l7-box vio"><h4>Re-check everything</h4><p>A setup fix can create a hold problem, and vice versa.</p></div></div>'
      },
      {
        id: 'c-tech', type: 'concept', title: 'Techniques for setup violations', nav: 'Setup fixes',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Technique</th><th>How it helps</th><th>Cost</th></tr>' +
          '<tr><td>Gate sizing</td><td>a stronger cell drives its load faster</td><td>area, leakage, more input load on the previous stage</td></tr>' +
          '<tr><td>Buffer insertion</td><td>isolates a large or distant load from the critical path; splits fan-out</td><td>buffer delay and area, extra power</td></tr>' +
          '<tr><td>Fan-out / load reduction</td><td>fewer receivers on the critical net (e.g. duplicate the driver)</td><td>possible duplicated logic</td></tr>' +
          '<tr><td>Logic restructuring</td><td>late-arriving signals pass through fewer gates</td><td>design effort; usually automated by synthesis</td></tr>' +
          '<tr><td>Faster cells (low-Vt)</td><td>lower threshold → more current</td><td>much higher leakage (Module 8)</td></tr></table></div>'
      },
      { id: 'w-fix', type: 'widget', title: 'Timing fix lab: repair the violation', nav: 'Fix lab', intro: 'The path misses its 700 ps target by 90 ps. Try the options alone and in combination. Aim for positive slack with the smallest area and power increase.', build: fixer },
      {
        id: 'st-restr', type: 'steps', title: 'Animation: restructuring for a late-arriving signal', nav: 'Restructuring',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Five signals are ANDed. A–D are ready at 0 ps, but E arrives late, at 300 ps.', 'In this structure E enters the first gate and must ripple through all four: Y at 500 ps.', 'Re-arrange: AND the early signals in a tree first…', '…and feed the late signal into the final gate. Y at 350 ps with the same number of gates.'][k], svg: restrFrame(k) }; })
      },
      {
        id: 'c-hold', type: 'concept', title: 'Fixing hold violations', nav: 'Hold fixes',
        html: '<p>A hold violation means data arrives too early. The fix is the opposite of setup fixing: <b>add delay to the short path</b> – delay cells or buffers inserted near the capture flip-flop, or downsizing cells on that path.</p>' +
          '<div class="l7-grid2"><div class="l7-box vio"><h4>Rules of thumb</h4><ul><li>Fix hold after setup is under control</li><li>Insert delay only on paths that need it</li><li>Check that the added delay does not break setup on paths sharing the same cells</li></ul></div><div class="l7-box cu"><h4>Why it matters</h4><ul><li>Hold failures cannot be fixed by lowering frequency</li><li>A single hold violation makes the chip fail at every speed</li></ul></div></div>'
      },
      { id: 'w-hold', type: 'widget', title: 'Hold fix lab', nav: 'Hold lab', intro: 'Add just enough delay cells to fix hold without breaking setup.', build: holdFix },
      {
        id: 'c-trade', type: 'concept', title: 'Timing / area / power trade-offs', nav: 'Trade-offs',
        html: '<p>Almost every timing improvement costs something. Designers aim for <b>just enough</b> speed:</p>' +
          '<div class="l7-grid3"><div class="l7-box"><h4>Over-optimising</h4><p>Large slack on many paths means oversized cells – wasted area and leakage. Tools recover area by downsizing non-critical cells.</p></div><div class="l7-box"><h4>Critical-path focus</h4><p>Spend area and power only where slack is negative or near zero.</p></div><div class="l7-box"><h4>Architecture level</h4><p>If no circuit fix is enough, change the architecture (e.g. a faster adder) – a Level 7/9 decision.</p></div></div>'
      },
      {
        id: 'rv-opt', type: 'reveal', title: 'Click to reveal: optimisation insights', nav: 'Reveal',
        items: [
          { q: 'Why can up-sizing a gate slow down the path?', a: 'Its larger input capacitance loads the previous gate. If that gate is weak, the delay simply moves upstream.' },
          { q: 'Why insert a buffer instead of up-sizing?', a: 'A buffer can isolate non-critical loads so the critical gate drives only a small load, and it does not increase the input load on the previous stage.' },
          { q: 'Why fix setup before hold?', a: 'Setup fixes change many delays; fixing hold first could be undone, and delay cells added early might hurt setup.' },
          { q: 'What is driver duplication?', a: 'Copying a gate so that each copy drives half of the original fan-out, reducing the load on the critical copy.' },
          { q: 'What is area recovery?', a: 'After timing is met, downsizing cells on paths with plenty of slack to save area and power without creating violations.' },
          { q: 'When is restructuring better than sizing?', a: 'When the problem is a late-arriving input passing through many logic levels; sizing only shaves a little delay from each level.' }
        ]
      },
      {
        id: 'dd-opt', type: 'drag', title: 'Drag & drop: which fix for which problem?', nav: 'Drag & drop',
        bins: ['Setup fix', 'Hold fix', 'Area/power recovery'],
        items: [['Up-size a weak driver on the critical path', 0], ['Buffer a high-fan-out net', 0], ['Move a late signal closer to the output', 0], ['Insert delay cells on a short path', 1], ['Down-size cells on the short path', 1], ['Down-size cells with large positive slack', 2], ['Swap low-Vt cells to high-Vt where slack allows', 2]]
      },
      {
        id: 'calc6', type: 'calc', title: 'Optimisation calculations', nav: 'Calculate',
        items: [
          { q: 'A path has slack −90 ps. Restructuring saves 70 ps and load reduction saves 35 ps. What is the new slack (ps)?', a: 15, u: 'ps', h: '−90 + 70 + 35.', s: '<b>+15 ps</b> – timing met at almost no area cost.' },
          { q: 'A hold check has slack −40 ps. How many 15 ps delay cells are needed at minimum?', a: 3, tol: 0, abs: 0.01, h: 'Round up 40 / 15.', s: '40 / 15 = 2.67 → <b>3 cells</b> (+5 ps hold slack).' },
          { q: 'A driver with R = 6 kΩ drives 30 fF (delay ≈ 0.69RC). If it is up-sized 3× (R/3) and its own extra load adds 6 fF, what is the new delay (ps)?', a: 49.68, u: 'ps', h: 'R = 2 kΩ, C = 36 fF.', s: '0.69 × 2 kΩ × 36 fF = <b>49.7 ps</b> (was 124 ps).' },
          { q: 'Up-sizing adds 4 % area and buffering 3 %. If both are applied to a 2 mm² block, how much area is added (mm²)?', a: 0.14, u: 'mm²', h: '7 % of 2 mm².', s: '0.07 × 2 = <b>0.14 mm²</b>.' },
          { q: 'A path\'s slack is +250 ps and its cells could be down-sized, adding 180 ps. What would the slack become (ps)?', a: 70, u: 'ps', h: '250 − 180.', s: '<b>+70 ps</b> – still met, with less area and power.' }
        ]
      },
      {
        id: 'mcq6', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The correct way to fix a hold violation is to…', o: ['speed up the path', 'add delay to the short path', 'raise the clock frequency', 'remove buffers from the path'], a: 1, w: 'Data must arrive later.' },
          { q: 'Buffer insertion helps a high-fan-out net mainly by…', o: ['reducing VDD', 'isolating non-critical loads from the critical driver', 'removing logic', 'adding skew'], a: 1, w: 'Smaller critical load.' },
          { q: 'Logic restructuring is most useful when…', o: ['a late input passes through many gates', 'hold fails', 'power is too low', 'the clock is slow'], a: 0, w: 'Move the late signal closer to the output.' },
          { q: 'Down-sizing cells on non-critical paths…', o: ['always breaks timing', 'recovers area and power while slack allows', 'fixes setup', 'increases fan-out'], a: 1, w: 'Area recovery.' }
        ]
      },
      {
        id: 'short6', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Compare gate sizing and buffer insertion as setup fixes, including their costs.', k: ['resistance|stronger|drive', 'input capacitance|previous stage|upstream', 'isolat|split|fan-out', 'area|power'], m: 'Gate sizing makes the driver stronger (lower resistance) so it charges its load faster, but it increases area, leakage and the input capacitance seen by the previous stage. Buffer insertion isolates or splits large loads so the critical driver sees less capacitance, at the cost of buffer area, power and the buffer\'s own delay on the buffered branch.' },
          { q: 'Why must hold fixing be checked against setup?', k: ['delay|cells', 'setup', 'shared|same|long path', 'violation|break'], m: 'Hold is fixed by adding delay. If the added cells lie on cells shared with longer paths, or too much delay is added, the longest path into that endpoint may now violate setup, so both checks must be re-run.' }
        ]
      },
      {
        id: 'scen6', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'After optimisation, setup slack is +5 ps everywhere but the block\'s area grew 25 % and leakage 40 %.', q: 'What is the best next step?', o: [{ t: 'Run area/leakage recovery on paths with spare slack, and review whether the architecture is right', ok: true, w: 'Over-optimisation is costly; recover where slack allows.' }, { t: 'Up-size more cells for extra margin', ok: false, w: 'That increases the cost further.' }, { t: 'Ignore area', ok: false, w: 'Area and leakage are design targets too.' }] },
          { s: 'A critical net drives 20 gates, 2 of which are on critical paths.', q: 'Which fix is most targeted?', o: [{ t: 'Drive the 18 non-critical loads through a buffer (or a duplicate driver)', ok: true, w: 'The critical driver then sees only 2 loads.' }, { t: 'Up-size all 20 receivers', ok: false, w: 'Bigger receivers mean even more load.' }, { t: 'Add delay cells', ok: false, w: 'That fixes hold, not setup.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Gate sizing means…', o: ['changing the logic function', 'choosing a stronger or weaker version of a cell', 'adding flip-flops', 'changing VDD'], a: 1, w: '' },
      { d: 'Easy', q: 'Setup violations are fixed by making the path…', o: ['slower', 'faster', 'longer', 'unclocked'], a: 1, w: '' },
      { d: 'Easy', q: 'Hold violations are fixed by…', o: ['adding delay to the short path', 'up-sizing gates', 'raising frequency', 'removing the clock'], a: 0, w: '' },
      { d: 'Medium', q: 'Splitting a high-fan-out net with buffers mainly reduces…', o: ['the critical driver\'s load', 'VDD', 'skew', 'hold time'], a: 0, w: '' },
      { d: 'Medium', q: 'Slack −60 ps; fixes save 25 ps and 45 ps. New slack =', o: ['+10 ps', '−10 ps', '+70 ps', '−130 ps'], a: 0, w: '−60 + 70.' },
      { d: 'Medium', q: 'Hold slack −35 ps, delay cells of 20 ps each. Minimum cells needed:', o: ['1', '2', '3', '4'], a: 1, w: '2 × 20 = 40 ≥ 35.' },
      { d: 'Medium', q: 'Up-sizing a gate can hurt the previous stage because…', o: ['its input capacitance increases', 'its resistance increases', 'it changes the clock', 'it lowers VDD'], a: 0, w: '' },
      { d: 'Hard', q: 'A late-arriving signal passes through 4 gates of 50 ps. Moving it to the last gate saves…', o: ['50 ps', '100 ps', '150 ps', '200 ps'], a: 2, w: 'It now passes 1 gate instead of 4.' },
      { d: 'Hard', q: 'Two fixes on the same net give less than the sum of their savings because…', o: ['they compete for the same delay component', 'they cancel the clock', 'leakage increases', 'they create hold violations'], a: 0, w: 'Diminishing returns.' },
      { d: 'Hard', q: 'Which change improves timing AND reduces power?', o: ['up-sizing', 'adding buffers', 'reducing load on the critical net', 'low-Vt swap'], a: 2, w: 'Less capacitance: faster and less switching power.' }
    ]
  });
})();
