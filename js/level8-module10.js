/* Level 8 · Module 10 – Timing & Power Case Study */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* Design model: 32-bit multiply-accumulate (MAC) unit at 1 GHz */
  var TCQ = 70, MULT = 620, ADD = 310, SU = 50, UNC = 30;
  var TFIX = [
    { k: 'size', n: 'Up-size critical cells', d: 'Stronger cells on the multiplier\'s critical path.', dd: -60, area: 6, dyn: 8, why: 'Faster, but bigger cells: more area and switching/internal power.' },
    { k: 'restr', n: 'Restructure late logic', d: 'Feed the late multiplier bits into the final adder stages.', dd: -90, area: 2, dyn: 1, why: 'Late-arriving bits pass fewer gates. Very effective for little cost.' },
    { k: 'lvt', n: 'Low-Vt cells on the critical path', d: 'Swap critical cells to low-threshold versions.', dd: -100, area: 0, dyn: 0, leak: 1.5, why: 'Big speed-up, but leakage of the block rises about 50 %.' },
    { k: 'freq', n: 'Relax the clock to 909 MHz', d: 'Period 1000 → 1100 ps.', dd: 0, area: 0, dyn: 0, T: 1100, why: 'Always fixes setup – but the MAC now does 9 % fewer operations per second.' }
  ];
  var PFIX = [
    { k: 'cg', n: 'Clock gating', d: 'Gate the clock of the MAC registers when no new data is valid (≈ 50 % of cycles).', why: 'Clock and register power roughly halve. Enable timing at the gating cell is easy to meet.' },
    { k: 'oi', n: 'Operand isolation', d: 'Hold the multiplier inputs constant when its result is not used.', dd: 10, why: 'The multiplier stops switching when idle (−35 %), but the isolation gate adds ≈ 10 ps to the critical path.' },
    { k: 'hvt', n: 'High-Vt on non-critical paths', d: 'Swap cells with plenty of slack to high-Vt.', why: 'Leakage falls ≈ 45 % with no effect on the critical path.' },
    { k: 'vs', n: 'Voltage scaling 1.0 → 0.9 V', d: 'Lower the supply of the whole MAC.', mul: 1.1, why: 'Dynamic power × 0.81 and leakage down, but all logic ≈ 10 % slower – check the slack!' }
  ];
  function model(tf, pf) {
    var logic = MULT + ADD, area = 100, dynMul = 1, leakMul = 1, T = 1000;
    TFIX.forEach(function (f) { if (tf[f.k]) { logic += f.dd; area += f.area; dynMul *= 1 + f.dyn / 100; if (f.leak) leakMul *= f.leak; if (f.T) T = f.T; } });
    if (pf.oi) logic += 10;
    if (pf.vs) logic *= 1.1;
    var delay = Math.round(TCQ + logic), slack = T - SU - UNC - delay;
    var clk = 22, mult = 38, add = 12, regs = 10, ctrl = 6, leak = 18 * leakMul;
    if (pf.cg) { clk *= 0.5; regs *= 0.6; area += 1; }
    if (pf.oi) { mult *= 0.65; area += 1; }
    if (pf.hvt) leak *= 0.55;
    var dyn = (clk + mult + add + regs + ctrl) * dynMul * (1000 / T);
    if (pf.vs) { dyn *= 0.81; leak *= 0.85; }
    return { delay: delay, slack: slack, T: T, f: Math.round(1e6 / T), dyn: dyn, leak: leak, p: dyn + leak, area: area, parts: { clock: clk * dynMul * (1000 / T), multiplier: mult * dynMul * (1000 / T), adder: add * dynMul * (1000 / T), registers: regs * dynMul * (1000 / T), control: ctrl * dynMul * (1000 / T), leakage: leak } };
  }

  /* ---------- Widget: the case-study stepper ---------- */
  function caseStudy(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Case study · 32-bit MAC unit · target 1 GHz</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var STEPS = ['Circuit', 'Timing analysis', 'Critical path', 'Violation', 'Optimization', 'Power analysis', 'Power optimization', 'Final comparison'];
    var st = { step: 0, max: 0, sta: false, crit: null, tf: {}, pwr: null, pf: {} };
    var bar = L.h('div', 'l7-row'); body.appendChild(bar);
    var view = L.h('div', ''); body.appendChild(view);
    var nav = L.h('div', 'l7-row'); body.appendChild(nav);
    var BEFORE = model({}, {});
    function canNext() {
      var s = st.step;
      if (s === 1) return st.sta;
      if (s === 2) return st.crit === 0;
      if (s === 4) return model(st.tf, {}).slack >= 0;
      if (s === 5) return st.pwr === 1;
      if (s === 6) return model(st.tf, st.pf).slack >= 0;
      return s < 7;
    }
    function go(n) { st.step = n; st.max = Math.max(st.max, n); draw(); body.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    function toggles(list, store, after) {
      var g = L.h('div', 'l7-grid2');
      list.forEach(function (f) {
        var b = L.btn('<span style="font-weight:700">' + f.n + '</span><span style="font-weight:500;font-size:.85em">' + f.d + '</span>', store[f.k] ? 'is-on' : '', function () { store[f.k] = !store[f.k]; after(f); });
        b.style.textAlign = 'left'; b.style.borderRadius = '16px'; b.style.padding = '12px 16px'; b.style.justifyContent = 'flex-start'; b.style.flexDirection = 'column'; b.style.alignItems = 'flex-start'; b.style.gap = '2px'; g.appendChild(b);
      });
      return g;
    }
    function circuitSvg(hl) {
      var o = '';
      o += R(10, 30, 70, 44, 'box-vio', 8) + T(45, 57, 'Reg A', 't-ink t-b t-sm') + R(10, 110, 70, 44, 'box-vio', 8) + T(45, 137, 'Reg B', 't-ink t-b t-sm');
      o += P('M80 52H140V80M80 132H140V104', hl ? 'w-on' : 'w') + R(140, 62, 130, 60, hl ? 'box-on' : 'box', 10) + T(205, 88, 'Multiplier', 't-ink t-b t-sm') + T(205, 106, MULT + ' ps', 't-cu t-sm');
      o += P('M270 92H320', hl ? 'w-on' : 'w') + R(320, 62, 110, 60, hl ? 'box-on' : 'box', 10) + T(375, 88, 'Adder', 't-ink t-b t-sm') + T(375, 106, ADD + ' ps', 't-cu t-sm');
      o += P('M430 92H470', hl ? 'w-on' : 'w') + R(470, 62, 80, 60, 'box-vio', 8) + T(510, 90, 'ACC', 't-ink t-b t-sm') + T(510, 106, 'register', 't-dim t-sm');
      o += P('M510 122V170H375V122', hl === 2 ? 'w-on' : 'w-thin') + T(440, 186, 'feedback: ACC → adder → ACC', 't-dim t-sm');
      o += R(140, 170, 100, 30, 'box', 6) + T(190, 190, 'control (190)', 't-dim t-sm') + P('M240 185H300V140H470', 'w-thin');
      return S(570, 210, o, 'MAC datapath');
    }
    function cmpTable(a, b, cols) {
      var c = function (v, w, lower, fmt) { return '<td class="' + (Math.abs(v - w) < 0.05 ? '' : (lower ? v < w : v > w) ? 'better' : 'worse') + '">' + fmt(v) + '</td>'; };
      var ps = function (v) { return v + ' ps'; }, mw = function (v) { return v.toFixed(1) + ' mW'; }, pc = function (v) { return v + ' %'; }, mhz = function (v) { return v + ' MHz'; };
      return '<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Parameter</th><th>' + cols[0] + '</th><th>' + cols[1] + '</th></tr>' +
        '<tr><td>Delay (critical path)</td><td>' + ps(a.delay) + '</td>' + c(b.delay, a.delay, true, ps) + '</tr>' +
        '<tr><td>Slack</td><td>' + ps(a.slack) + '</td>' + c(b.slack, a.slack, false, ps) + '</tr>' +
        '<tr><td>Power</td><td>' + mw(a.p) + '</td>' + c(b.p, a.p, true, mw) + '</tr>' +
        '<tr><td>Area</td><td>' + pc(a.area) + '</td>' + c(b.area, a.area, true, pc) + '</tr>' +
        '<tr><td>Clock frequency</td><td>' + mhz(a.f) + '</td>' + c(b.f, a.f, false, mhz) + '</tr></table></div>';
    }
    function draw() {
      bar.innerHTML = '';
      STEPS.forEach(function (s, i) {
        var b = L.btn((i < st.max || (i === st.max && i === 7 && canNext()) ? '✓ ' : '') + (i + 1) + '. ' + s, i === st.step ? 'is-on' : '', function () { if (i <= st.max) go(i); });
        b.style.fontSize = '.8rem'; if (i > st.max) b.disabled = true; bar.appendChild(b);
      });
      view.innerHTML = '';
      var s = st.step, h = function (x, c) { var e = L.h('div', c || '', x); view.appendChild(e); return e; };
      if (s === 0) {
        h('<h3 style="margin:8px 0">Step 1 · The circuit</h3><p>A 32-bit <b>multiply-accumulate (MAC)</b> unit for a DSP block: two operand registers feed a multiplier, its product is added to the accumulator, and the result is stored back in ACC every clock cycle. Target clock: <b>1 GHz (T = 1000 ps)</b>.</p>');
        view.appendChild(L.h('div', 'l7-svgbox', circuitSvg(0)));
        h('<span class="k">Library data</span> t_cq = ' + TCQ + ' ps · t_su = ' + SU + ' ps · clock uncertainty = ' + UNC + ' ps · ideal (zero-skew) clock', 'l7-readout');
      }
      if (s === 1) {
        h('<h3 style="margin:8px 0">Step 2 · Timing analysis</h3><p>Analyse the path Reg A → multiplier → adder → ACC for setup at 1 GHz.</p>');
        var labels = ['Arrival time AT (ps)', 'Required time RAT (ps)', 'Slack (ps)'], right = [TCQ + MULT + ADD, 1000 - SU - UNC, 1000 - SU - UNC - (TCQ + MULT + ADD)];
        var ins = labels.map(function (lb) { var r = L.h('div', 'l7-calc-row'); r.style.margin = '8px 0'; var sp = L.h('span', '', lb); sp.style.minWidth = '200px'; sp.style.fontWeight = '600'; r.appendChild(sp); var i = document.createElement('input'); i.className = 'l7-input'; i.setAttribute('inputmode', 'decimal'); i.setAttribute('aria-label', lb); r.appendChild(i); view.appendChild(r); return i; });
        var fb = L.h('div', ''); var r2 = L.h('div', 'l7-row');
        r2.appendChild(L.btn('Check', 'pri', function () {
          var v = ins.map(function (x) { return parseFloat(String(x.value).replace('−', '-')); }), ok = v.map(function (x, i) { return x === right[i]; });
          ins.forEach(function (x, i) { x.style.borderColor = ok[i] ? 'var(--l7-ok)' : 'var(--l7-bad)'; });
          if (ok[0] && ok[1] && ok[2]) { st.sta = true; fb.innerHTML = '<div class="l7-verdict bad">🔴 Slack −80 ps – setup violation<small>AT = 70 + 620 + 310 = 1000 ps · RAT = 1000 − 50 − 30 = 920 ps · slack = 920 − 1000 = −80 ps.</small></div>'; draw(); }
          else fb.innerHTML = '<div class="l7-fb bad">Not yet. AT adds t_cq and both logic delays; RAT subtracts setup time and uncertainty from the period.</div>';
        }));
        view.appendChild(r2); view.appendChild(fb);
        if (st.sta) fb.innerHTML = '<div class="l7-verdict bad">🔴 Slack −80 ps – setup violation<small>AT = 1000 ps, RAT = 920 ps.</small></div>', ins.forEach(function (x, i) { x.value = right[i]; });
      }
      if (s === 2) {
        h('<h3 style="margin:8px 0">Step 3 · Find the critical path</h3><p>Which path limits the clock frequency?</p>');
        var paths = ['Reg A/B → multiplier → adder → ACC (70 + 620 + 310 = 1000 ps)', 'ACC → adder → ACC (70 + 310 = 380 ps)', 'Control → ACC enable (70 + 190 = 260 ps)'];
        var box = L.h('div', 'l7-opts'); view.appendChild(box);
        paths.forEach(function (p, i) { var b = L.h('button', 'l7-opt' + (st.crit === i ? (i === 0 ? ' is-right' : ' is-wrong') : ''), p); b.type = 'button'; b.addEventListener('click', function () { st.crit = i; draw(); }); box.appendChild(b); });
        view.appendChild(L.h('div', 'l7-svgbox', circuitSvg(st.crit === 0 ? 1 : st.crit === 1 ? 2 : 0)));
        if (st.crit !== null) h(st.crit === 0 ? '✓ The multiplier-adder path is critical: 1000 ps against 920 ps required. The feedback path has 540 ps of slack.' : 'That path has plenty of slack. Look for the largest total delay.', 'l7-fb ' + (st.crit === 0 ? 'ok' : 'bad'));
      }
      if (s === 3) {
        h('<h3 style="margin:8px 0">Step 4 · The timing violation</h3>');
        h('<div class="l7-verdict bad">❌ Setup violation: −80 ps on Reg → multiplier → adder → ACC<small>Data arrives at ACC 80 ps after it is required. At 1 GHz the accumulator could capture a wrong sum.</small></div>');
        h('<div class="l7-grid2" style="margin-top:12px"><div class="l7-box cu"><h4>Hold check</h4><p>Shortest path: control → ACC, 70 + 190 = 260 ps ≫ hold requirement. ✓ No hold problem.</p></div><div class="l7-box sig"><h4>Your options</h4><p>Speed up the critical path (sizing, restructuring, low-Vt) or give it more time (lower frequency). Each has a cost – decide in the next step.</p></div></div>');
      }
      if (s === 4) {
        h('<h3 style="margin:8px 0">Step 5 · Optimise timing</h3><p>Choose one or more fixes until slack ≥ 0. Try to keep area, power and throughput costs low.</p>');
        var res = L.h('div', ''), why = L.h('div', 'l7-fb');
        var upd4 = function (f) { var m = model(st.tf, {}); res.innerHTML = cmpTable(BEFORE, m, ['Before', 'After fixes']) + '<div class="l7-verdict ' + (m.slack >= 0 ? 'ok' : 'bad') + '">' + (m.slack >= 0 ? '✅ Slack +' + m.slack + ' ps – timing met' : '❌ Slack ' + m.slack + ' ps – still failing') + '</div>'; if (f) L.fb(why, 'info', '<b>' + f.n + (st.tf[f.k] ? ' applied' : ' removed') + ':</b> ' + f.why); draw2(); };
        view.appendChild(toggles(TFIX, st.tf, function (f) { upd4(f); L.$$('.l7-grid2 .l7-btn', view).forEach(function (b, i) { b.classList.toggle('is-on', !!st.tf[TFIX[i].k]); }); }));
        view.appendChild(res); view.appendChild(why); upd4();
      }
      if (s === 5) {
        var m5 = model(st.tf, {});
        h('<h3 style="margin:8px 0">Step 6 · Power analysis</h3><p>Power report of your timing-fixed MAC (vector-based, typical workload):</p>');
        var rows = Object.keys(m5.parts).map(function (k) { return [k, m5.parts[k]]; });
        h('<div class="l7-table-wrap"><table class="l7-table"><tr><th>Component</th><th>Power (mW)</th><th>%</th></tr>' + rows.map(function (r) { return '<tr><td>' + r[0] + (r[0] === 'leakage' ? ' (static)' : ' (dynamic)') + '</td><td>' + r[1].toFixed(1) + '</td><td>' + Math.round(100 * r[1] / m5.p) + ' %</td></tr>'; }).join('') + '<tr><td><b>Total</b></td><td><b>' + m5.p.toFixed(1) + '</b></td><td>100 %</td></tr></table></div>');
        var q = ['Leakage', 'The multiplier\'s switching power', 'The control logic', 'The adder'];
        h('<p class="l7-q-t" style="margin-top:12px">Which single component should power optimisation attack first?</p>');
        var box5 = L.h('div', 'l7-opts'); view.appendChild(box5);
        q.forEach(function (t, i) { var b = L.h('button', 'l7-opt' + (st.pwr === i ? (i === 1 ? ' is-right' : ' is-wrong') : ''), t); b.type = 'button'; b.addEventListener('click', function () { st.pwr = i; draw(); }); box5.appendChild(b); });
        if (st.pwr !== null) h(st.pwr === 1 ? '✓ The multiplier is the largest consumer. The clock network and registers come next – also worth attacking.' : 'Compare the numbers – which row is the largest?', 'l7-fb ' + (st.pwr === 1 ? 'ok' : 'bad'));
      }
      if (s === 6) {
        h('<h3 style="margin:8px 0">Step 7 · Optimise power</h3><p>Apply power techniques. Keep slack ≥ 0 – some techniques slow the critical path.</p>');
        var res6 = L.h('div', ''), why6 = L.h('div', 'l7-fb'), base6 = model(st.tf, {});
        var upd6 = function (f) { var m = model(st.tf, st.pf); res6.innerHTML = cmpTable(base6, m, ['After timing fixes', 'After power optimisation']) + '<div class="l7-verdict ' + (m.slack >= 0 ? 'ok' : 'bad') + '">' + (m.slack >= 0 ? '✅ Timing still met (slack +' + m.slack + ' ps) · power −' + Math.round(100 * (1 - m.p / base6.p)) + ' %' : '❌ Timing broken (slack ' + m.slack + ' ps) – undo a slowing technique or add a timing fix (go back to step 5)') + '</div>'; if (f) L.fb(why6, 'info', '<b>' + f.n + (st.pf[f.k] ? ' applied' : ' removed') + ':</b> ' + f.why); draw2(); };
        view.appendChild(toggles(PFIX, st.pf, function (f) { upd6(f); L.$$('.l7-grid2 .l7-btn', view).forEach(function (b, i) { b.classList.toggle('is-on', !!st.pf[PFIX[i].k]); }); }));
        view.appendChild(res6); view.appendChild(why6); upd6();
      }
      if (s === 7) {
        var fin = model(st.tf, st.pf), ok = fin.slack >= 0, red = Math.round(100 * (1 - fin.p / BEFORE.p));
        h('<h3 style="margin:8px 0">Step 8 · Final comparison</h3><p>Your design decisions and their consequences:</p>');
        h(cmpTable(BEFORE, fin, ['Before', 'After']));
        var chosen = TFIX.filter(function (f) { return st.tf[f.k]; }).map(function (f) { return f.n; }).concat(PFIX.filter(function (f) { return st.pf[f.k]; }).map(function (f) { return f.n; }));
        h('<span class="k">Decisions</span> ' + (chosen.length ? chosen.join(' · ') : 'none') + '<br><span class="k">Power change</span> ' + (red >= 0 ? '−' + red : '+' + (-red)) + ' % · <span class="k">area change</span> +' + (fin.area - 100) + ' %', 'l7-readout');
        var msg = !ok ? '❌ Timing is not met – go back and fix it.' : red >= 20 ? '🏆 Excellent: timing met with a ' + red + ' % power reduction.' : '✅ Timing met. Can you find a combination that also saves at least 20 % power?';
        h('<div class="l7-verdict ' + (ok ? 'ok' : 'bad') + '">' + msg + '<small>' + (st.tf.freq ? 'You relaxed the clock: simple and safe, but every operation now takes longer – check whether the DSP still meets its throughput target. ' : '') + (st.tf.lvt && !st.pf.hvt ? 'Low-Vt cells raised leakage; high-Vt cells on non-critical paths would win some of it back. ' : '') + 'Real projects iterate exactly like this: analyse, fix, re-analyse.</small></div>');
        if (ok) api.done();
      }
      draw2();
    }
    function draw2() {
      nav.innerHTML = '';
      if (st.step > 0) nav.appendChild(L.btn('← Back', 'ghost', function () { go(st.step - 1); }));
      if (st.step < 7) { var nb = L.btn('Next: ' + STEPS[st.step + 1] + ' →', 'pri', function () { go(st.step + 1); }); nb.disabled = !canNext(); nav.appendChild(nb); }
    }
    draw();
  }

  L.module({
    n: 10,
    lead: 'Put everything together. Analyse a real-style datapath, find its critical path and violation, decide how to fix it, analyse and optimise its power – and compare the design before and after your decisions.',
    tags: ['case study', 'design decisions', 'timing analysis', 'optimisation', 'power analysis', 'trade-offs', 'final comparison'],
    sections: [
      {
        id: 'c-flow', type: 'concept', title: 'The timing and power closure loop', nav: 'Closure loop',
        html: '<p>In industry, timing and power are closed together, in a loop: every change to fix one can disturb the other.</p>' +
          '<div class="l7-steps-flow"><span>Circuit</span><b>→</b><span>Timing analysis</span><b>→</b><span>Critical path</span><b>→</b><span>Violation</span><b>→</b><span>Optimisation</span><b>→</b><span>Power analysis</span><b>→</b><span>Power optimisation</span><b>→</b><span>Final comparison</span></div>' +
          '<div class="l7-grid3" style="margin-top:12px"><div class="l7-box sig"><h4>Timing first</h4><p>A chip that misses timing does not work. Fix violations before optimising power.</p></div><div class="l7-box cu"><h4>Power next</h4><p>Use remaining slack to save power – carefully.</p></div><div class="l7-box vio"><h4>Always re-check</h4><p>After every power change, re-run timing; after every timing change, re-check power.</p></div></div>'
      },
      { id: 'w-case', type: 'widget', title: 'Interactive case study: 32-bit MAC unit', nav: 'Case study', intro: 'Work through all eight steps. Your decisions are carried forward to the final comparison table. The case study is complete when the final design meets timing.', build: caseStudy },
      {
        id: 'rv-cs', type: 'reveal', title: 'Click to reveal: lessons from the case study', nav: 'Lessons',
        items: [
          { q: 'Why fix timing before power?', a: 'Power techniques often slow logic. Starting from a timing-clean design shows how much slack you can spend on power savings.' },
          { q: 'Why is relaxing the clock not always acceptable?', a: 'The system may need a certain throughput (operations per second); a slower clock may break that requirement even though timing is met.' },
          { q: 'Why did operand isolation affect timing?', a: 'The isolation gate sits in the data path of the multiplier, adding a small delay to the critical path.' },
          { q: 'Why combine low-Vt and high-Vt cells?', a: 'Low-Vt on the few critical cells gives speed; high-Vt on the many non-critical cells recovers leakage.' },
          { q: 'Why is the clock network always a target?', a: 'It switches every cycle with large capacitance; clock gating removes much of that power cheaply.' },
          { q: 'What would a further step be?', a: 'Checking other corners (slow/fast, hot/cold), peak power and IR drop – the same analyses at more operating conditions.' }
        ]
      },
      {
        id: 'dd-cs', type: 'drag', title: 'Drag & drop: put the closure flow in order', nav: 'Flow order',
        bins: ['1–2: understand', '3–5: fix timing', '6–8: power & sign-off'],
        items: [['Describe the circuit and constraints', 0], ['Run timing analysis', 0], ['Identify the critical path', 1], ['Read the violation', 1], ['Apply timing optimisations', 1], ['Run power analysis', 2], ['Apply power optimisations', 2], ['Compare before and after', 2]]
      },
      {
        id: 'calc10', type: 'calc', title: 'Integrated calculations', nav: 'Calculate',
        items: [
          { q: 't_cq = 80 ps, logic = 860 ps, t_su = 40 ps, uncertainty 20 ps, T = 1000 ps. Setup slack (ps)?', a: 0, abs: 0.5, u: 'ps', h: 'T − t_su − unc − (t_cq + logic).', s: '1000 − 40 − 20 − 940 = <b>0 ps</b> – exactly met, no margin.' },
          { q: 'A design has 120 mW dynamic and 30 mW leakage. Voltage scaling multiplies dynamic power by 0.81 and leakage by 0.85. New total (mW)?', a: 122.7, u: 'mW', h: '120·0.81 + 30·0.85.', s: '97.2 + 25.5 = <b>122.7 mW</b>.' },
          { q: 'The critical path is 1000 ps and voltage scaling makes logic 10 % slower. If t_cq (70 ps) is unaffected, what is the new path delay (ps)? Logic = 930 ps.', a: 1093, u: 'ps', h: '70 + 930 × 1.1.', s: '70 + 1023 = <b>1093 ps</b>.' },
          { q: 'Relaxing the clock from 1000 ps to 1100 ps reduces frequency to what (MHz)? (one decimal)', a: 909.1, u: 'MHz', tol: 0.005, h: '1 / 1.1 ns.', s: '<b>909.1 MHz</b> – 9 % fewer operations per second.' },
          { q: 'Total power falls from 106 mW to 79.5 mW. What is the percentage reduction?', a: 25, u: '%', tol: 0.02, h: '(106 − 79.5) / 106.', s: '<b>25 %</b>.' }
        ]
      },
      {
        id: 'mcq10', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'In timing–power closure, timing is usually fixed first because…', o: ['power never matters', 'a design that misses timing does not work, and power changes need slack', 'it is easier', 'tools require it'], a: 1, w: '' },
          { q: 'Which fix guarantees setup closure but reduces throughput?', o: ['restructuring', 'lowering the clock frequency', 'up-sizing', 'clock gating'], a: 1, w: '' },
          { q: 'Which power technique can break timing?', o: ['clock gating of idle registers', 'high-Vt on non-critical paths', 'voltage scaling', 'reading the report'], a: 2, w: 'Lower V slows all logic.' },
          { q: 'A final comparison table should include…', o: ['only power', 'delay, slack, power and area', 'only area', 'only frequency'], a: 1, w: '' }
        ]
      },
      {
        id: 'short10', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Describe the steps you would follow to close timing and power on a block that misses its frequency target and exceeds its power budget.', k: ['analy|sta|report', 'critical', 'optimi|fix|size|restructur', 'power|gating|vt', 're-|again|iterat|re-check'], m: 'Run timing analysis and identify the critical paths and violations; apply timing fixes (restructuring, sizing, buffering, low-Vt where needed) until slack is positive; run power analysis with realistic activity to find the largest consumers; apply power techniques such as clock gating, operand isolation, high-Vt on non-critical paths or voltage scaling; then re-run timing and power and iterate until both targets are met, comparing delay, slack, power and area before and after.' },
          { q: 'Explain one trade-off you observed in the case study.', k: ['power|leakage', 'timing|slack|delay', 'area', 'throughput|frequency'], m: 'For example, low-Vt cells fixed the setup violation without adding area but increased leakage power by about 50 %; or voltage scaling saved about 20 % dynamic power but slowed the critical path by 10 %, which broke timing unless enough slack was available.' }
        ]
      },
      {
        id: 'scen10', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your MAC meets timing with +12 ps slack after restructuring. You want to apply voltage scaling, which slows the logic by 10 % (≈ 90 ps).', q: 'What happens and what can you do?', o: [{ t: 'Timing breaks; combine with more timing fixes, scale only non-critical logic (multi-VDD), or accept a lower frequency', ok: true, w: 'The slack is far too small for a 90 ps slowdown.' }, { t: 'Timing is still met because 12 > 10', ok: false, w: '10 % of the logic delay is about 90 ps, not 10 ps.' }, { t: 'Voltage scaling speeds up the circuit', ok: false, w: 'Lower voltage slows gates.' }] },
          { s: 'Management asks for 30 % less power with no loss of performance.', q: 'Which combination is most promising?', o: [{ t: 'Clock gating + operand isolation + high-Vt on non-critical paths, keeping the frequency', ok: true, w: 'These reduce power without slowing the critical path (isolation adds only a little delay).' }, { t: 'Halve the clock frequency', ok: false, w: 'That loses performance.' }, { t: 'Swap everything to low-Vt', ok: false, w: 'Leakage would rise sharply.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Negative slack after timing analysis means…', o: ['timing met', 'a timing violation', 'low power', 'a hold fix'], a: 1, w: '' },
      { d: 'Easy', q: 'The critical path of the MAC was…', o: ['the control path', 'register → multiplier → adder → ACC', 'the feedback path', 'the clock network'], a: 1, w: '' },
      { d: 'Easy', q: 'Clock gating reduces…', o: ['dynamic power', 'area', 'setup time', 'leakage only'], a: 0, w: '' },
      { d: 'Medium', q: 'AT = 1000 ps, RAT = 920 ps. Slack =', o: ['+80 ps', '−80 ps', '0', '1920 ps'], a: 1, w: '' },
      { d: 'Medium', q: 'Restructuring saves 90 ps on a path with −80 ps slack. New slack:', o: ['+10 ps', '−10 ps', '+170 ps', '−170 ps'], a: 0, w: '' },
      { d: 'Medium', q: 'Low-Vt cells fix timing at the cost of…', o: ['area', 'higher leakage', 'lower frequency', 'hold time'], a: 1, w: '' },
      { d: 'Medium', q: 'Operand isolation adds a small delay because…', o: ['the isolation gate is in the data path', 'it changes the clock', 'it raises VDD', 'it removes buffers'], a: 0, w: '' },
      { d: 'Hard', q: 'A path has +40 ps slack and logic delay 900 ps. A 10 % voltage-scaling slowdown on logic gives slack…', o: ['+40 ps', '−50 ps', '+4 ps', '−90 ps'], a: 1, w: '40 − 90 = −50 ps.' },
      { d: 'Hard', q: 'Dynamic power 90 mW, leakage 20 mW. Clock gating halves 30 mW of clock power; high-Vt cuts leakage 45 %. New total ≈', o: ['86 mW', '95 mW', '80 mW', '110 mW'], a: 0, w: '90 − 15 + 11 = 86 mW.' },
      { d: 'Hard', q: 'Which statement about timing–power closure is TRUE?', o: ['Power changes never affect timing', 'Every fix must be followed by re-analysis of both timing and power', 'Hold is fixed by lowering frequency', 'Area never changes'], a: 1, w: '' }
    ]
  });
})();
