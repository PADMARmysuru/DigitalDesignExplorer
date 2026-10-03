/* Level 8 · Module 8 – Low-Power VLSI Techniques */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var TECH = [
    { k: 'vs', n: 'Voltage scaling', s: 'VDD 1.0 → 0.85 V', why: 'Dynamic power falls with V² (−28 %) and leakage falls too, but every gate gets about 20 % slower.' },
    { k: 'fs', n: 'Frequency scaling', s: 'f 1.0 → 0.7 GHz', why: 'Power falls in proportion to f, and the longer period adds slack – but throughput drops 30 % and energy per operation is unchanged.' },
    { k: 'cg', n: 'Clock gating', s: 'stop the clock to idle registers', why: 'Idle registers stop toggling, removing most clock-network and register power. Costs a few integrated clock-gating cells and a little enable logic.' },
    { k: 'pg', n: 'Power gating', s: 'switch the block off when idle (70 % of time)', why: 'Leakage of the switched block is almost eliminated while it is off. Costs header switches, isolation and retention cells (area), a small IR drop when on, and wake-up time.' },
    { k: 'mv', n: 'Multi-VDD', s: 'non-critical half of the logic at 0.8 V', why: 'The non-critical half uses 36 % less dynamic power. Signals crossing between voltage domains need level shifters (area, a little delay).' },
    { k: 'mt', n: 'Multi-Vt', s: 'high-Vt cells on non-critical paths', why: 'High-Vt cells leak far less. They are slower, so they are used only where slack allows – critical paths keep standard or low-Vt cells.' },
    { k: 'oi', n: 'Operand isolation', s: 'hold inputs of unused units', why: 'Units whose results are not used stop switching. A few gating cells are added on their inputs.' }
  ];
  function evalDesign(on) {
    var clk = 25, logic = 45, leak = 30;
    if (on.cg) { clk *= 0.45; logic *= 0.9; }
    if (on.oi) logic *= 0.9;
    if (on.mv) logic *= 0.82;
    var dyn = clk + logic;
    if (on.vs) { dyn *= 0.7225; leak *= 0.8; }
    if (on.fs) dyn *= 0.7;
    if (on.pg) leak *= 0.35;
    if (on.mt) leak *= 0.5;
    var delay = 0.80 * (on.vs ? 1.2 : 1) * (on.pg ? 1.03 : 1) * (on.mt ? 1.04 : 1) + (on.cg ? 0.01 : 0) + (on.mv ? 0.02 : 0) + (on.oi ? 0.01 : 0);
    var period = on.fs ? 1 / 0.7 : 1, area = 1 + (on.cg ? 0.02 : 0) + (on.pg ? 0.06 : 0) + (on.mv ? 0.03 : 0) + (on.oi ? 0.01 : 0);
    return { dyn: dyn, leak: leak, p: dyn + leak, delay: delay, slack: period - delay, period: period, area: area, thr: on.fs ? 70 : 100 };
  }

  /* ---------- Widget: Before → Technique → After ---------- */
  function techLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Low-power lab · apply techniques to a 1 GHz block</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var on = {}, btn = {};
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Before</span> 1 GHz block · dynamic 70 mW (clock 25 + logic 45) · leakage 30 mW · critical path 0.80 ns (slack +0.20 ns) · area 1.00 mm²'));
    var grid = L.h('div', 'l7-grid2'); body.appendChild(grid);
    TECH.forEach(function (t) {
      var b = L.btn('<span style="font-weight:700">' + t.n + '</span><span style="font-weight:500;font-size:.85em">' + t.s + '</span>', '', function () { on[t.k] = !on[t.k]; upd(t); });
      b.style.textAlign = 'left'; b.style.borderRadius = '16px'; b.style.padding = '12px 16px'; b.style.justifyContent = 'flex-start'; b.style.flexDirection = 'column'; b.style.alignItems = 'flex-start'; b.style.gap = '2px';
      btn[t.k] = b; grid.appendChild(b);
    });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var tbl = L.h('div', 'l7-table-wrap'); body.appendChild(tbl);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    var why = L.h('div', 'l7-fb'); body.appendChild(why);
    var b0 = evalDesign({});
    function upd(last) {
      TECH.forEach(function (t) { btn[t.k].classList.toggle('is-on', !!on[t.k]); });
      var a = evalDesign(on), cnt = TECH.filter(function (t) { return on[t.k]; }).length, o = '';
      if (cnt >= 3) api.done();
      var bar = function (x, lbl, d, l) { var sc = 1.35; return T(x + 60, 212, lbl, 't-ink t-b t-sm') + '<rect x="' + x + '" y="' + (190 - (d + l) * sc) + '" width="120" height="' + (l * sc) + '" rx="6" fill="#ff9500"/>' + '<rect x="' + x + '" y="' + (190 - d * sc) + '" width="120" height="' + (d * sc) + '" rx="6" fill="#0071e3"/>' + T(x + 60, 184 - (d + l) * sc, (d + l).toFixed(1) + ' mW', 't-ink t-b t-sm'); };
      o += bar(60, 'Before', b0.dyn, b0.leak) + '<path d="M210 120h60" class="w-dash"/><path d="M262 112l10 8l-10 8" class="w"/>' + T(240, 108, cnt + ' technique' + (cnt === 1 ? '' : 's'), 't-vio t-b t-sm') + bar(300, 'After', a.dyn, a.leak);
      o += '<rect x="460" y="60" width="14" height="14" rx="3" fill="#0071e3"/>' + T(480, 72, 'dynamic', 't-dim t-sm', 'start') + '<rect x="460" y="84" width="14" height="14" rx="3" fill="#ff9500"/>' + T(480, 96, 'leakage', 't-dim t-sm', 'start');
      pic.innerHTML = S(580, 222, o, 'Power before and after');
      var c = function (v, b, lower, f) { return '<td class="' + (Math.abs(v - b) < 1e-6 ? '' : (lower ? v < b : v > b) ? 'better' : 'worse') + '">' + f(v) + '</td>'; };
      var mw = function (v) { return v.toFixed(1) + ' mW'; }, ns = function (v) { return v.toFixed(2) + ' ns'; };
      tbl.innerHTML = '<table class="l7-cmp"><tr><th>Metric</th><th>Before</th><th>After</th></tr>' +
        '<tr><td>Dynamic power</td><td>' + mw(b0.dyn) + '</td>' + c(a.dyn, b0.dyn, true, mw) + '</tr>' +
        '<tr><td>Leakage power</td><td>' + mw(b0.leak) + '</td>' + c(a.leak, b0.leak, true, mw) + '</tr>' +
        '<tr><td><b>Total power</b></td><td>' + mw(b0.p) + '</td>' + c(a.p, b0.p, true, mw) + '</tr>' +
        '<tr><td>Critical-path delay</td><td>' + ns(b0.delay) + '</td>' + c(a.delay, b0.delay, true, ns) + '</tr>' +
        '<tr><td>Setup slack</td><td>' + ns(b0.slack) + '</td>' + c(a.slack, b0.slack, false, ns) + '</tr>' +
        '<tr><td>Area</td><td>1.00 mm²</td>' + c(a.area, 1, true, function (v) { return v.toFixed(2) + ' mm²'; }) + '</tr>' +
        '<tr><td>Throughput</td><td>100 %</td>' + c(a.thr, 100, false, function (v) { return v + ' %'; }) + '</tr></table>';
      var saved = Math.round(100 * (1 - a.p / b0.p));
      verdict.className = 'l7-verdict ' + (a.slack < 0 ? 'bad' : cnt ? 'ok' : 'warn');
      verdict.innerHTML = a.slack < 0 ? '❌ Power saved ' + saved + ' %, but timing now FAILS (slack ' + a.slack.toFixed(2) + ' ns)<small>Low-power techniques that slow gates (voltage scaling, high-Vt, power-switch IR drop) must be checked against timing. Try combining them with frequency scaling or using them only on non-critical logic.</small>' :
        cnt ? '✅ Power saved ' + saved + ' % with timing still met<small>Look at the cost column: area, slack and throughput.</small>' : 'Select techniques to see their effect<small>Apply at least three techniques and compare the trade-offs.</small>';
      if (last) L.fb(why, 'info', '<b>' + last.n + (on[last.k] ? ' applied' : ' removed') + ':</b> ' + last.why);
    }
    upd();
  }

  /* ---------- Widget: clock gating ---------- */
  function cgLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Clock gating · an integrated clock-gating cell (latch + AND)</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var en = [1, 1, 0, 0, 0, 1, 0, 0, 0, 0], n = 0;
    body.appendChild(L.h('p', 'l7-hint', 'Tap the EN values to say in which cycles the register bank has new data. The gated clock only pulses when EN = 1.'));
    var row = L.h('div', 'l7-row'); body.appendChild(row); row.appendChild(L.h('span', 'l7-lab-label', 'EN per cycle'));
    var cells = en.map(function (v, i) { var b = L.h('button', 'l7-bit'); b.type = 'button'; b.addEventListener('click', function () { en[i] ^= 1; n++; upd(); }); row.appendChild(b); return b; });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-fb'); body.appendChild(out);
    function upd() {
      if (n >= 3) api.done();
      cells.forEach(function (b, i) { b.textContent = en[i]; b.classList.toggle('is-1', !!en[i]); });
      var o = '', X = function (c) { return 90 + c * 52; }, N = en.length;
      o += T(10, 34, 'CLK', 't-ink t-b t-sm', 'start') + T(10, 84, 'EN', 't-ink t-b t-sm', 'start') + T(10, 134, 'GCLK', 't-ink t-b t-sm', 'start');
      var c = 'M' + X(0) + ' 40', g = 'M' + X(0) + ' 140', e = 'M' + X(0) + ' ' + (en[0] ? 70 : 90);
      for (var i = 0; i < N; i++) {
        c += 'V20H' + X(i + 0.5) + 'V40H' + X(i + 1);
        g += en[i] ? 'V120H' + X(i + 0.5) + 'V140H' + X(i + 1) : 'H' + X(i + 1);
        e += 'V' + (en[i] ? 70 : 90) + 'H' + X(i + 1);
      }
      o += P(c, 'wv-clk') + P(e, 'w-cu') + P(g, 'w-on');
      pic.innerHTML = S(X(N) + 20, 156, o, 'Clock gating waveform');
      var used = en.filter(function (x) { return x; }).length;
      L.fb(out, 'info', 'Gated clock pulses: <b>' + used + ' of ' + N + '</b> – <b>' + Math.round(100 * (1 - used / N)) + ' %</b> of clock edges (and the register switching they cause) removed in this block. The latch in the ICG cell holds EN stable while CLK is high, so the gated clock never glitches.');
    }
    upd();
  }

  function pgFrame(k) {
    var steps = ['Running', 'Isolate outputs', 'Save state (retention)', 'Switch OFF', 'Wake: switch ON', 'Restore state & de-isolate'];
    var o = '', off = k === 3, stored = k >= 2 && k <= 4;
    o += P('M40 24H560', 'w-cu') + T(300, 18, 'VDD (always on)', 't-cu t-b t-sm');
    o += R(270, 34, 60, 30, off ? 'box-bad' : 'box-ok', 6) + T(300, 54, off ? 'OFF' : 'ON', 't-ink t-b t-sm') + T(345, 54, 'header switch', 't-dim t-sm', 'start');
    o += P('M300 24V34M300 64V80', off ? 'w' : 'w-on');
    o += R(150, 80, 300, 90, off ? 'box' : 'box-on', 12) + T(300, 110, 'Switchable block (logic + registers)', off ? 't-dim t-b t-sm' : 't-ink t-b t-sm');
    o += R(180, 125, 110, 32, stored ? 'box-cu' : 'box', 6) + T(235, 145, stored ? 'retention: state saved' : 'retention flops', 't-ink t-sm');
    o += R(470, 105, 80, 40, (k >= 1 && k <= 4) ? 'box-vio' : 'box', 8) + T(510, 130, (k >= 1 && k <= 4) ? 'ISO = 1' : 'ISO = 0', 't-ink t-b t-sm');
    o += P('M450 125H470', 'w') + P('M550 125H580', (k >= 1 && k <= 4) ? 'w-vio' : 'w-on');
    o += T(300, 196, (k + 1) + '. ' + steps[k], 't-vio t-b');
    return S(600, 206, o, 'Power gating sequence step ' + (k + 1));
  }

  L.module({
    n: 8,
    lead: 'Every term of αCV²f – and leakage – can be attacked. Explore voltage and frequency scaling, clock gating, power gating, multiple supplies and thresholds, operand isolation and state retention, and weigh what each one costs in timing and area.',
    tags: ['voltage scaling', 'frequency scaling', 'clock gating', 'power gating', 'multi-VDD', 'multi-Vt', 'operand isolation', 'state retention'],
    sections: [
      {
        id: 'c-map', type: 'concept', title: 'A map of low-power techniques', nav: 'Overview',
        html: '<p>Each technique targets one term of the power equation. Good designs combine several.</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Technique</th><th>Attacks</th><th>Main cost</th></tr>' +
          '<tr><td>Voltage scaling / DVFS</td><td>V² (and leakage)</td><td>slower gates</td></tr>' +
          '<tr><td>Frequency scaling</td><td>f</td><td>lower throughput</td></tr>' +
          '<tr><td>Clock gating</td><td>α of clock and registers</td><td>gating cells, enable timing</td></tr>' +
          '<tr><td>Operand isolation</td><td>α of unused datapath units</td><td>isolation gates</td></tr>' +
          '<tr><td>Multi-VDD</td><td>V² in non-critical domains</td><td>level shifters, extra supplies</td></tr>' +
          '<tr><td>Multi-Vt</td><td>leakage</td><td>slower high-Vt cells</td></tr>' +
          '<tr><td>Power gating + retention</td><td>leakage in idle blocks</td><td>switches, isolation, retention, wake-up time</td></tr></table></div>'
      },
      {
        id: 'c-dyn', type: 'concept', title: 'Dynamic power reduction', nav: 'Dynamic',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Voltage &amp; frequency scaling</h4><p>Lower V gives a quadratic saving but slows the circuit, so V and f are lowered together. <b>DVFS</b> (dynamic voltage and frequency scaling) changes them at run time: full speed when busy, low V/f when lightly loaded.</p></div>' +
          '<div class="l7-box cu"><h4>Clock gating</h4><p>An integrated clock-gating (ICG) cell stops the clock to registers that would only reload the same value. It is the most widely used dynamic-power technique and is mostly inserted automatically.</p></div>' +
          '<div class="l7-box vio"><h4>Operand isolation</h4><p>Hold the inputs of a functional unit (e.g. a multiplier) constant when its output will not be used, so it stops switching.</p></div>' +
          '<div class="l7-box"><h4>Multi-VDD</h4><p>Run timing-critical logic at a higher voltage and the rest at a lower one. Level shifters convert signals between domains.</p></div></div>'
      },
      { id: 'w-cg', type: 'widget', title: 'Clock gating demo', nav: 'Clock gating', intro: 'Change the enable pattern a few times and watch the gated clock.', build: cgLab },
      {
        id: 'c-leak', type: 'concept', title: 'Leakage reduction, power gating and state retention', nav: 'Leakage',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>Multi-Vt</h4><p>Libraries offer low-, standard- and high-threshold versions of each cell. High-Vt cells leak up to 10× less but are slower, so they go on paths with slack.</p></div>' +
          '<div class="l7-box sig"><h4>Power gating</h4><p>A header (or footer) switch disconnects an idle block from its supply, removing almost all its leakage.</p></div>' +
          '<div class="l7-box vio"><h4>Isolation</h4><p>Outputs of a powered-off block float. Isolation cells clamp them to a safe 0 or 1 so the always-on logic is not disturbed.</p></div>' +
          '<div class="l7-box"><h4>State retention</h4><p>Retention flip-flops keep their state in a small always-on latch while the block is off, so it can resume without a full restart.</p></div></div>' +
          '<p style="margin-top:12px">Power intent – which blocks have which supplies, switches, isolation and retention – is described in a power-intent file (UPF/CPF) alongside the RTL.</p>'
      },
      {
        id: 'st-pg', type: 'steps', title: 'Animation: a power-gating sequence', nav: 'Power gating',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['The block runs normally; its header switch is ON.', 'Before switching off, isolation cells clamp the block\'s outputs.', 'Retention flip-flops save their state into always-on latches.', 'The header switch turns OFF: leakage of the whole block practically disappears.', 'To wake up, the switch turns ON again (gradually, to limit the inrush current).', 'State is restored and isolation released – the block continues where it left off.'][k], svg: pgFrame(k) }; })
      },
      { id: 'w-tech', type: 'widget', title: 'Low-power lab: Before → Technique → After', nav: 'Technique lab', intro: 'Apply at least three techniques, alone and in combination. Compare power, timing and area – and find a combination that saves a lot of power without breaking timing.', build: techLab },
      {
        id: 'rv-lp', type: 'reveal', title: 'Click to reveal: low-power insights', nav: 'Reveal',
        items: [
          { q: 'Why is voltage scaling usually combined with frequency scaling?', a: 'Lower voltage slows gates; reducing frequency keeps the setup checks passing.' },
          { q: 'Why does clock gating need a latch, not just an AND gate?', a: 'If EN changed while CLK is high, a plain AND would produce a glitch or a shortened pulse. The latch holds EN stable during the high phase.' },
          { q: 'Why not power-gate everything?', a: 'Switches, isolation and retention cost area; waking up costs time and energy. It only pays off for blocks idle long enough.' },
          { q: 'Why are level shifters needed in multi-VDD designs?', a: 'A low-voltage signal may not fully turn off a pMOS in a high-voltage domain, causing leakage or wrong logic; a level shifter restores full swing.' },
          { q: 'Does clock gating reduce leakage?', a: 'No – the gated logic is still powered. Clock gating cuts dynamic power only.' },
          { q: 'What is race-to-idle?', a: 'Running fast to finish a task quickly, then power-gating – sometimes uses less energy than running slowly when leakage is high.' }
        ]
      },
      {
        id: 'dd-lp', type: 'drag', title: 'Drag & drop: which power does it reduce?', nav: 'Drag & drop',
        bins: ['Dynamic power', 'Leakage power', 'Both'],
        items: [['Clock gating', 0], ['Operand isolation', 0], ['Frequency scaling', 0], ['High-Vt cell swap', 1], ['Power gating', 1], ['Voltage scaling', 2], ['DVFS', 2]]
      },
      {
        id: 'calc8', type: 'calc', title: 'Low-power calculations', nav: 'Calculate',
        items: [
          { q: 'Dynamic power is 80 mW at 1.0 V, 1 GHz. With DVFS to 0.8 V and 600 MHz, what is it (mW)?', a: 30.72, u: 'mW', h: '× 0.8² × 0.6.', s: '80 × 0.64 × 0.6 = <b>30.7 mW</b>.' },
          { q: 'Clock power is 30 mW. Clock gating idles 70 % of the registers. Estimate the new clock power (mW), ignoring the gating cells.', a: 9, u: 'mW', h: 'Only 30 % still toggles.', s: '30 × 0.3 = <b>9 mW</b>.' },
          { q: 'A block leaks 20 mW and is power-gated 80 % of the time. Average leakage (mW)?', a: 4, u: 'mW', h: 'It leaks only 20 % of the time.', s: '20 × 0.2 = <b>4 mW</b>.' },
          { q: 'Swapping 60 % of cells to high-Vt cuts their leakage by 80 %. If total leakage was 50 mW (spread evenly), what is the new leakage (mW)?', a: 26, u: 'mW', h: '0.4·50 + 0.6·50·0.2.', s: '20 + 6 = <b>26 mW</b>.' },
          { q: 'Half of a 40 mW logic block moves from 1.0 V to 0.8 V. New dynamic power of the block (mW)?', a: 32.8, u: 'mW', h: '20 + 20 × 0.64.', s: '20 + 12.8 = <b>32.8 mW</b>.' }
        ]
      },
      {
        id: 'mcq8', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Clock gating mainly reduces…', o: ['leakage', 'dynamic power of clock and registers', 'area', 'wire delay'], a: 1, w: '' },
          { q: 'Power gating mainly reduces…', o: ['dynamic power', 'leakage in idle blocks', 'clock skew', 'setup time'], a: 1, w: '' },
          { q: 'Isolation cells are needed because…', o: ['outputs of a powered-off block float', 'clocks need buffering', 'leakage increases', 'they speed up logic'], a: 0, w: '' },
          { q: 'High-Vt cells are…', o: ['faster and leakier', 'slower and less leaky', 'used for clock gating', 'level shifters'], a: 1, w: '' }
        ]
      },
      {
        id: 'short8', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Compare clock gating and power gating.', k: ['clock|toggling|switching', 'dynamic', 'leakage|supply|switch off', 'retention|isolation|wake'], m: 'Clock gating stops the clock to idle registers, eliminating their switching and saving dynamic power, while the block stays powered so leakage remains and it can restart instantly. Power gating disconnects the block\'s supply, eliminating leakage, but it needs header switches, isolation and retention cells, and takes time to wake up.' },
          { q: 'Explain why multi-Vt and voltage scaling must be checked against timing.', k: ['slower|delay', 'slack|critical', 'setup|violation', 'non-critical'], m: 'Both make gates slower: high-Vt cells have less drive current, and lower supply voltage reduces current for all cells. If they are applied to critical paths, setup slack can become negative, so they are used where there is slack, or combined with frequency reduction, and timing is re-analysed.' }
        ]
      },
      {
        id: 'scen8', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A wearable\'s audio DSP is used for 2 seconds every minute.', q: 'Which technique gives the biggest saving for the idle time?', o: [{ t: 'Power gating with state retention', ok: true, w: 'Idle 97 % of the time: removing leakage dominates.' }, { t: 'Clock gating only', ok: false, w: 'Leakage continues while idle.' }, { t: 'Higher clock frequency', ok: false, w: 'That increases active power.' }] },
          { s: 'After swapping all cells to high-Vt, leakage fell 70 % but 300 paths now fail setup.', q: 'What is the right approach?', o: [{ t: 'Keep standard/low-Vt cells on critical paths and use high-Vt only where slack allows', ok: true, w: 'Multi-Vt is applied selectively.' }, { t: 'Raise the clock frequency', ok: false, w: 'That makes setup worse.' }, { t: 'Remove all high-Vt cells', ok: false, w: 'That throws away the leakage savings on non-critical paths.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'DVFS stands for…', o: ['Dynamic Voltage and Frequency Scaling', 'Digital Voltage Filter System', 'Dual VDD Flip-flop Scan', 'Delay Variation Frequency Shift'], a: 0, w: '' },
      { d: 'Easy', q: 'Clock gating saves…', o: ['leakage', 'dynamic power', 'area', 'nothing'], a: 1, w: '' },
      { d: 'Easy', q: 'State retention flip-flops keep their data…', o: ['while the block is powered off', 'only at high frequency', 'in DRAM', 'in the clock tree'], a: 0, w: '' },
      { d: 'Medium', q: 'Which technique needs level shifters?', o: ['clock gating', 'multi-VDD', 'operand isolation', 'high-Vt swap'], a: 1, w: '' },
      { d: 'Medium', q: 'Dynamic power 50 mW; V reduced 1.0 → 0.9 V (f fixed). New dynamic power:', o: ['45 mW', '40.5 mW', '25 mW', '50 mW'], a: 1, w: '50 × 0.81.' },
      { d: 'Medium', q: 'A block idle 75 % of the time leaks 16 mW when on. With power gating, average leakage ≈', o: ['4 mW', '12 mW', '16 mW', '0 mW'], a: 0, w: '16 × 0.25.' },
      { d: 'Medium', q: 'Why does an ICG cell contain a latch?', o: ['to store data', 'to avoid glitches on the gated clock', 'to shift voltage', 'to reduce leakage'], a: 1, w: '' },
      { d: 'Hard', q: 'Voltage scaling 1.0 → 0.85 V increases delay by ~20 %. A path with 0.9 ns delay at T = 1 ns will…', o: ['still pass', 'fail setup (1.08 ns > 1 ns)', 'fail hold', 'not change'], a: 1, w: '0.9 × 1.2 = 1.08 ns.' },
      { d: 'Hard', q: 'Halving frequency for a fixed task changes energy per task by…', o: ['−50 %', 'roughly no change (dynamic), more leakage energy', '+50 %', '−75 %'], a: 1, w: 'Same α·C·V² per operation; longer runtime adds leakage energy.' },
      { d: 'Hard', q: 'Which pair is a good combination for a timing-critical but leaky block?', o: ['high-Vt everywhere', 'low-Vt on critical paths + high-Vt elsewhere', 'voltage scaling only', 'remove clock gating'], a: 1, w: 'Selective multi-Vt.' }
    ]
  });
})();
