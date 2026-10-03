/* Level 10 · Module 9 – Physical Design Optimization */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var BASE = { ovf: 6.5, wns: -120, util: 82, pwr: 100 };
  var OPTS = [
    { k: 'spread', n: 'Spread cells (local density limit)', ovf: -4.0, wns: -15, util: 0, pwr: 1, why: 'Hot spots are thinned out, so routing demand drops sharply – but some wires get a little longer.' },
    { k: 'buf', n: 'Insert buffers on long nets', ovf: 0.5, wns: 90, util: 1.5, pwr: 4, why: 'Long wires are split into shorter, faster segments. Costs a few cells, a little power and some routing.' },
    { k: 'size', n: 'Resize (up-size) critical cells', ovf: 0.3, wns: 45, util: 1, pwr: 3, why: 'Stronger drivers on the worst paths. Bigger cells need more area and pin access.' },
    { k: 'layer', n: 'Promote critical nets to upper metal', ovf: -1.0, wns: 40, util: 0, pwr: 0, why: 'Thick upper layers have lower resistance, and moving those nets frees lower-layer tracks.' },
    { k: 'macro', n: 'Add macro halos / shift a macro', ovf: -1.5, wns: 10, util: 0, pwr: 0, why: 'Fixes the congested macro channel at its source and gives pins room.' },
    { k: 'down', n: 'Down-size non-critical cells (power-aware)', ovf: -0.5, wns: -10, util: -3, pwr: -8, why: 'Cells with plenty of slack are made smaller: less area and power, slightly slower paths.' }
  ];
  function evalOpt(on) {
    var r = { ovf: BASE.ovf, wns: BASE.wns, util: BASE.util, pwr: BASE.pwr };
    OPTS.forEach(function (o) { if (on[o.k]) { r.ovf += o.ovf; r.wns += o.wns; r.util += o.util; r.pwr += o.pwr; } });
    r.ovf = Math.max(0, r.ovf); r.drc = Math.round(Math.max(0, r.ovf - 1) * 62);
    return r;
  }

  /* ---------- Widget: physical optimisation lab ---------- */
  function optLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Physical optimisation lab · a routed block that fails sign-off</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var on = {}, tried = {}, btn = {}, done = false;
    body.appendChild(L.h('p', 'l7-hint', 'Goals: routing overflow ≤ 1 %, no DRC violations, worst slack ≥ 0 ps, power ≤ 105 % – using physical changes only.'));
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    OPTS.forEach(function (o) {
      var b = L.btn(o.n, '', function () { on[o.k] = !on[o.k]; tried[o.k] = 1; draw(o); });
      b.style.textAlign = 'left'; b.style.justifyContent = 'flex-start'; btn[o.k] = b; g.appendChild(b);
    });
    var tbl = L.h('div', 'l7-table-wrap'); body.appendChild(tbl);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    var why = L.h('div', 'l7-fb'); body.appendChild(why);
    function draw(last) {
      OPTS.forEach(function (o) { btn[o.k].classList.toggle('is-on', !!on[o.k]); });
      var a = evalOpt(on), b0 = evalOpt({});
      var c = function (v, b, lower, f) { return '<td class="' + (Math.abs(v - b) < 1e-9 ? '' : (lower ? v < b : v > b) ? 'better' : 'worse') + '">' + f(v) + '</td>'; };
      tbl.innerHTML = '<table class="l7-cmp"><tr><th>Metric</th><th>Before</th><th>After</th><th>Goal</th></tr>' +
        '<tr><td>Routing overflow</td><td>' + b0.ovf.toFixed(1) + ' %</td>' + c(a.ovf, b0.ovf, true, function (v) { return v.toFixed(1) + ' %'; }) + '<td>≤ 1 %</td></tr>' +
        '<tr><td>DRC violations</td><td>' + b0.drc + '</td>' + c(a.drc, b0.drc, true, String) + '<td>0</td></tr>' +
        '<tr><td>Worst slack</td><td>' + b0.wns + ' ps</td>' + c(a.wns, b0.wns, false, function (v) { return (v > 0 ? '+' : '') + v + ' ps'; }) + '<td>≥ 0</td></tr>' +
        '<tr><td>Utilisation</td><td>' + b0.util + ' %</td>' + c(a.util, b0.util, true, function (v) { return v.toFixed(1) + ' %'; }) + '<td>–</td></tr>' +
        '<tr><td>Power</td><td>100 %</td>' + c(a.pwr, 100, true, function (v) { return v + ' %'; }) + '<td>≤ 105 %</td></tr></table>';
      var ok = a.ovf <= 1 && a.drc === 0 && a.wns >= 0 && a.pwr <= 105, n = Object.keys(tried).length;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'bad');
      verdict.innerHTML = ok ? '✅ Sign-off ready<small>Routable, DRC clean, timing met and power within budget. Notice that every physical fix helped one metric and cost another.</small>' :
        '❌ Not ready yet<small>' + [a.ovf > 1 ? 'congestion remains' : '', a.drc ? a.drc + ' DRC violations' : '', a.wns < 0 ? 'negative slack' : '', a.pwr > 105 ? 'power over budget' : ''].filter(Boolean).join(' · ') + '</small>';
      if (ok && n >= 3 && !done) { done = true; api.done(); }
      if (last) L.fb(why, 'info', '<b>' + last.n + (on[last.k] ? ' applied' : ' removed') + ':</b> ' + last.why + (ok && n < 3 ? ' (Try at least three options to complete the lab.)' : ''));
    }
    draw();
  }

  /* ---------- Widget: repeater insertion on a long wire ---------- */
  function repLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Buffer (repeater) insertion on a 6 mm wire</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var n = 0, done = false, Lmm = 6, K = 20, TB = 35;
    function delay(k) { return (k + 1) * K * Math.pow(Lmm / (k + 1), 2) + k * TB; }
    var best = Math.min.apply(null, [0, 1, 2, 3, 4, 5, 6, 7, 8].map(delay));
    L.slider(body, 'Number of repeaters', 0, 8, 1, n, null, function (v) { n = v; draw(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var o = R(20, 40, 50, 40, 'box-cu', 6) + T(45, 65, 'drv', 't-ink t-b t-sm') + R(530, 40, 50, 40, 'box-cu', 6) + T(555, 65, 'rcv', 't-ink t-b t-sm');
      o += P('M70 60H530', 'w');
      for (var i = 1; i <= n; i++) { var x = 70 + i * 460 / (n + 1); o += '<path d="M' + (x - 11) + ' 49l22 11l-22 11z" fill="#5856d6"/>'; }
      var bx = 20, bw = 560, mx = delay(0);
      [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(function (k) { var h = 70 * delay(k) / mx; o += '<rect x="' + (bx + k * 62) + '" y="' + (196 - h) + '" width="44" height="' + h + '" rx="4" fill="' + (k === n ? '#0071e3' : '#d2d2d7') + '"/>' + T(bx + k * 62 + 22, 210, k, 't-dim t-sm'); });
      o += T(300, 222, 'delay vs number of repeaters', 't-dim t-sm');
      pic.innerHTML = S(600, 228, o, 'Repeater insertion');
      var d = delay(n), within = d <= best * 1.05;
      out.innerHTML = '<span class="k">Wire delay</span> ∝ length² (distributed RC) · <span class="k">each repeater</span> +' + TB + ' ps<br><span class="k">Delay with ' + n + ' repeater' + (n === 1 ? '' : 's') + '</span> <span class="' + (within ? 'v' : 'c') + '">' + Math.round(d) + ' ps</span> (best possible ' + Math.round(best) + ' ps) · <span class="k">extra cells / power</span> ' + n;
      verdict.className = 'l7-verdict ' + (within ? 'ok' : 'warn');
      verdict.innerHTML = within ? '✅ Near-optimal repeater count<small>Splitting the wire turns one quadratic delay into several small ones; beyond the optimum, the buffers\' own delay dominates. Physical optimisation tools do exactly this on long nets.</small>' : (n === 0 ? '⚠️ Unbuffered: ' + Math.round(d) + ' ps<small>The delay of a long RC wire grows with the square of its length.</small>' : '⚠️ ' + Math.round(d) + ' ps – not optimal yet<small>' + (delay(n + 1) < d ? 'More repeaters would still help.' : 'Too many: the repeaters\' own delay now costs more than they save.') + '</small>');
      if (within && !done) { done = true; api.done(); }
    }
    draw();
  }

  function trFrame(k) {
    var o = '', axes = ['Timing', 'Congestion', 'Power', 'Area'];
    var vals = [[0.3, 0.8, 0.5, 0.5], [0.8, 0.85, 0.65, 0.6], [0.85, 0.45, 0.66, 0.6], [0.8, 0.4, 0.5, 0.45]][k];
    axes.forEach(function (a, i) { var y = 30 + i * 36; o += T(110, y + 16, a, 't-ink t-b t-sm', 'end') + R(120, y, 300, 22, 'box', 5) + '<rect x="120" y="' + y + '" width="' + (300 * vals[i]) + '" height="22" rx="5" fill="' + (i === 0 ? '#0071e3' : i === 1 ? '#ff9500' : i === 2 ? '#e5332a' : '#34c759') + '" opacity=".7"/>'; });
    o += T(440, 70, ['Start: timing poor, congestion high', 'Buffering + sizing: timing ✓, power/area ↑', 'Spreading + halos: congestion ✓', 'Down-size spare-slack cells: power/area ↓'][k], 't-vio t-b t-sm', 'start');
    o += T(440, 94, ['(longer bar = better for timing,', 'every move helps one metric', 'and usually costs another', 'balance them to reach sign-off'][k], 't-dim t-sm', 'start');
    return S(640, 180, o, 'Trade-offs');
  }

  L.module({
    n: 9,
    lead: 'Placement, CTS and routing rarely produce a sign-off-ready layout on the first try. Physical optimisation repairs congestion, timing and power using the layout itself: moving and resizing cells, inserting buffers, changing layers and adjusting macros.',
    tags: ['placement optimisation', 'congestion reduction', 'buffer insertion', 'cell resizing', 'routing optimisation', 'area', 'timing-aware', 'power-aware', 'trade-offs'],
    sections: [
      {
        id: 'c-loop', type: 'concept', title: 'Optimisation throughout the flow', nav: 'Where it happens',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Step</th><th>Typical physical optimisations</th></tr>' +
          '<tr><td>Pre-CTS (after placement)</td><td>buffering, resizing, spreading, pin swapping – with estimated wires</td></tr>' +
          '<tr><td>Post-CTS</td><td>repair hold and setup with real clock latencies; resize clock-adjacent logic</td></tr>' +
          '<tr><td>Post-route</td><td>fix remaining violations with real parasitics: layer promotion, via doubling, local re-routing, minimal resizing</td></tr>' +
          '<tr><td>ECO (late fixes)</td><td>small, targeted changes using spare cells – without redoing the flow</td></tr></table></div>' +
          '<p>Detailed timing and power analysis belong to Level 8; here the focus is the <b>physical moves</b> used to fix the results.</p>'
      },
      { id: 'w-opt', type: 'widget', title: 'Physical optimisation lab', nav: 'Optimisation lab', intro: 'Combine at least three optimisations until the block is routable, DRC clean, meets timing and stays within the power budget.', build: optLab },
      {
        id: 'st-tr', type: 'steps', title: 'Animation: physical design trade-offs', nav: 'Trade-offs',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['A typical first-pass layout: timing fails, congestion is high.', 'Buffering and up-sizing fix timing but add cells, power and routing demand.', 'Spreading and macro halos clear congestion at a small timing cost.', 'Down-sizing cells with spare slack recovers power and area.'][k], svg: trFrame(k) }; })
      },
      { id: 'w-rep', type: 'widget', title: 'Repeater insertion', nav: 'Repeater lab', intro: 'Find the number of repeaters that gives (nearly) the minimum delay on a long wire.', build: repLab },
      {
        id: 'c-moves', type: 'concept', title: 'The physical optimisation toolbox', nav: 'Toolbox',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Timing-aware</h4><ul><li>buffer / repeater insertion on long nets</li><li>cell up-sizing on critical paths</li><li>moving critical cells closer together</li><li>layer promotion of critical nets</li></ul></div><div class="l7-box cu"><h4>Congestion-aware</h4><ul><li>cell spreading, density limits, padding</li><li>macro halos and channel blockages</li><li>pin swapping (equivalent pins)</li><li>re-routing with detours</li></ul></div><div class="l7-box vio"><h4>Power-aware</h4><ul><li>down-sizing cells with spare slack</li><li>shorter wires on high-activity nets</li><li>removing unnecessary buffers</li></ul></div><div class="l7-box"><h4>Area</h4><ul><li>removing redundant buffers</li><li>down-sizing</li><li>higher utilisation where routing allows</li></ul></div></div>'
      },
      {
        id: 'rv-9', type: 'reveal', title: 'Click to reveal: optimisation insights', nav: 'Reveal',
        items: [
          { q: 'Why not fix everything with bigger cells?', a: 'Bigger cells add area, power and input load on the previous stage, and need more routing access.' },
          { q: 'Why do repeaters help long wires?', a: 'Distributed RC delay grows with length squared; splitting the wire into shorter segments makes it roughly linear in length.' },
          { q: 'What is an ECO?', a: 'Engineering Change Order: a small late change to the layout (often using pre-placed spare cells) without rerunning the full flow.' },
          { q: 'Why can fixing congestion hurt timing?', a: 'Spreading cells lengthens some wires; detours lengthen routes.' },
          { q: 'What is pin swapping?', a: 'Exchanging logically equivalent input pins of a cell (e.g. NAND inputs) to shorten wires or fix timing.' },
          { q: 'Why optimise again after routing?', a: 'Only after routing are the real wire parasitics known; small remaining violations are fixed with minimal changes.' }
        ]
      },
      {
        id: 'dd-9', type: 'drag', title: 'Drag & drop: what does each move mainly improve?', nav: 'Drag & drop',
        bins: ['Timing', 'Congestion', 'Power / area'],
        items: [['Repeater on a long net', 0], ['Up-size a critical driver', 0], ['Promote a net to upper metal', 0], ['Spread a dense cluster', 1], ['Add a halo around a macro', 1], ['Down-size cells with large slack', 2], ['Remove an unnecessary buffer chain', 2]]
      },
      {
        id: 'calc9', type: 'calc', title: 'Optimisation calculations', nav: 'Calculate',
        items: [
          { q: 'An unbuffered wire has 720 ps delay ∝ L². What is its delay if it were half as long (ps)?', a: 180, h: '720 × (1/2)².', s: '<b>180 ps</b>.' },
          { q: 'With 3 repeaters on the 6 mm wire: 720/4 + 3 × 35 = ? ps', a: 285, h: '180 + 105.', s: '<b>285 ps</b>.' },
          { q: 'Overflow 6.5 %. Spreading removes 4.0 % and macro halos 1.5 %. Remaining overflow (%)?', a: 1, h: '6.5 − 5.5.', s: '<b>1.0 %</b>.' },
          { q: 'Slack −120 ps. Buffering +90, layer promotion +40, spreading −15. New slack (ps)?', a: -5, abs: 0.1, h: 'Add them.', s: '<b>−5 ps</b> – still slightly failing.' },
          { q: 'Power 100 %; buffering +4 %, sizing +3 %, down-sizing −8 %. New power (%)?', a: 99, h: '100 + 4 + 3 − 8.', s: '<b>99 %</b>.' }
        ]
      },
      {
        id: 'mcq9', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Repeaters on long wires mainly reduce…', o: ['wire delay', 'pin count', 'DRC rules', 'IR drop'], a: 0, w: '' },
          { q: 'Cell spreading mainly reduces…', o: ['congestion', 'clock frequency', 'pin count', 'antenna ratio'], a: 0, w: '' },
          { q: 'Down-sizing cells with spare slack saves…', o: ['power and area', 'timing', 'routing layers', 'nothing'], a: 0, w: '' },
          { q: 'An ECO is…', o: ['a small late layout change', 'a new floorplan', 'a synthesis report', 'a mask'], a: 0, w: '' }
        ]
      },
      {
        id: 'short9', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Give three physical optimisation techniques and the trade-off of each.', k: ['buffer|repeater', 'size|resiz', 'spread|density', 'layer|promot', 'power|area|timing|congest'], m: 'Buffer insertion speeds up long nets but adds cells, power and routing; up-sizing critical cells improves timing at the cost of area, power and input load; spreading cells reduces congestion but lengthens some wires; layer promotion speeds critical nets and frees lower tracks but uses scarce upper-layer resources; down-sizing saves power/area but slows paths.' },
          { q: 'Why is an optimal number of repeaters on a long wire?', k: ['quadratic|square|length²', 'segment|split', 'buffer delay|own delay', 'optimum|minimum'], m: 'Unbuffered wire delay grows with the square of length. Each repeater splits the wire into shorter segments, reducing the quadratic term, but adds its own fixed delay. At first the saving dominates; past the optimum the repeaters\' own delay dominates, so the total delay has a minimum.' }
        ]
      },
      {
        id: 'scen9', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Post-route: 3 failing paths by −20 ps; routing is complete and DRC clean.', q: 'Best approach?', o: [{ t: 'Minimal local fixes: resize a few cells or promote a net, then re-route locally', ok: true, w: 'Small, targeted changes keep the routed design stable.' }, { t: 'Redo the floorplan', ok: false, w: 'Far too disruptive.' }, { t: 'Increase utilisation', ok: false, w: 'Unrelated.' }] },
          { s: 'Buffer insertion fixed timing but power is now 12 % over budget.', q: 'What helps?', o: [{ t: 'Down-size non-critical cells and remove redundant buffers where slack allows', ok: true, w: 'Recover power without breaking timing.' }, { t: 'Add more buffers', ok: false, w: 'More power.' }, { t: 'Remove the clock tree', ok: false, w: 'Not possible.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Inserting buffers on a long net mainly improves…', o: ['timing', 'DRC', 'pin count', 'utilisation'], a: 0, w: '' },
      { d: 'Easy', q: 'Spreading cells mainly reduces…', o: ['congestion', 'clock skew', 'antenna ratio', 'pad count'], a: 0, w: '' },
      { d: 'Easy', q: 'Layer promotion moves a net to…', o: ['a thicker upper metal', 'polysilicon', 'the package', 'metal 1'], a: 0, w: '' },
      { d: 'Medium', q: 'Unbuffered delay 400 ps ∝ L². With one repeater (2 halves) the wire part becomes…', o: ['200 ps', '100 ps', '400 ps', '800 ps'], a: 0, w: '2 × 400/4.' },
      { d: 'Medium', q: 'Up-sizing a cell costs…', o: ['area, power and input load', 'nothing', 'clock skew only', 'a via'], a: 0, w: '' },
      { d: 'Medium', q: 'Pin swapping exchanges…', o: ['logically equivalent pins of a cell', 'cells between rows', 'power and ground', 'masks'], a: 0, w: '' },
      { d: 'Medium', q: 'Post-route fixes should be…', o: ['minimal and local', 'full re-runs of the flow', 'done in RTL', 'avoided completely'], a: 0, w: '' },
      { d: 'Hard', q: 'Why can too many repeaters increase delay?', o: ['each adds its own delay', 'wires get longer', 'vias disappear', 'they reduce VDD'], a: 0, w: '' },
      { d: 'Hard', q: 'Fixing congestion by spreading usually makes timing…', o: ['slightly worse on some paths', 'always better', 'unchanged', 'impossible'], a: 0, w: '' },
      { d: 'Hard', q: 'Spare cells are placed to enable…', o: ['late ECO fixes without re-placement', 'clock gating', 'DRC waivers', 'mask generation'], a: 0, w: '' }
    ]
  });
})();
