/* Level 12 · Module 2 – Advanced Scan Design */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var FLOPS = 50000, PATS = 4000, FSHIFT = 25e6;

  function calc(c) {
    var chains = c.pins * c.ratio, avg = Math.ceil(FLOPS / chains), longest = Math.ceil(avg * (c.bal ? 1 : 1.6));
    var pats = Math.round(PATS * (c.lp ? 1.05 : 1) * (c.ratio >= 200 ? 1.15 : 1));
    var time = pats * (longest + 3) / FSHIFT * 1000;
    var vol = pats * FLOPS * 2 / c.ratio / 1e9;
    var cov = 99.2 - (c.ratio >= 200 ? 1.4 : c.ratio >= 100 ? 0.5 : c.ratio >= 50 ? 0.3 : 0);
    var pwr = c.lp ? 12 : 30;
    return { chains: chains, longest: longest, avg: avg, pats: pats, time: time, vol: vol, cov: cov, pwr: pwr };
  }

  /* ---------- Widget: scan chain optimizer ---------- */
  function optLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Scan chain optimizer · 50,000 flip-flops, 4,000 ATPG patterns</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Targets</span> ≤ 8 scan-in pins · test time ≤ 25 ms · test data ≤ 0.1 Gbit · coverage ≥ 98.5 % · shift switching ≤ 20 % (IR-drop limit)'));
    var c = { pins: 4, ratio: 1, bal: false, lp: false }, done = false;
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'Scan-in pins (channels)', 1, 16, 1, c.pins, null, function (v) { c.pins = v; draw(); });
    var r = L.h('div', 'l7-row'); c1.appendChild(r);
    L.select(r, 'Compression ratio (EDT)', [['1', 'none (1×)'], ['10', '10×'], ['50', '50×'], ['100', '100×'], ['200', '200×']], '1', function (v) { c.ratio = +v; draw(); });
    var bb = L.btn('Balance chain lengths: OFF', '', function () { c.bal = !c.bal; draw(); }); c2.appendChild(bb);
    var bl = L.btn('Low-power shift (fill X with constants): OFF', '', function () { c.lp = !c.lp; draw(); }); c2.appendChild(bl);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      bb.innerHTML = 'Balance chain lengths: ' + (c.bal ? 'ON' : 'OFF'); bb.classList.toggle('is-on', c.bal);
      bl.innerHTML = 'Low-power shift (fill X with constants): ' + (c.lp ? 'ON' : 'OFF'); bl.classList.toggle('is-on', c.lp);
      var m = calc(c), o = '';
      o += R(10, 20, 70, 140, 'box-cu', 8) + T(45, 95, 'tester', 't-ink t-b t-sm');
      if (c.ratio > 1) o += R(110, 20, 60, 140, 'box-vio', 8) + T(140, 90, 'de-', 't-ink t-sm') + T(140, 106, 'comp', 't-ink t-sm');
      var shown = Math.min(12, m.chains), x0 = c.ratio > 1 ? 180 : 110;
      for (var i = 0; i < shown; i++) { var len = c.bal ? 1 : (i % 3 === 0 ? 1.6 : 0.7 + (i % 3) * 0.2); o += '<rect x="' + x0 + '" y="' + (24 + i * 11) + '" width="' + Math.min(330, 200 * len) + '" height="7" rx="3" fill="#0071e3" opacity=".7"/>'; }
      for (i = 0; i < Math.min(c.pins, 8); i++) o += P('M80 ' + (40 + i * 14) + 'H' + (c.ratio > 1 ? 110 : 110), 'w-on');
      if (c.ratio > 1) o += R(530, 20, 60, 140, 'box-vio', 8) + T(560, 90, 'com-', 't-ink t-sm') + T(560, 106, 'pactor', 't-ink t-sm');
      o += T(300, 178, m.chains + ' internal chains · longest ' + m.longest + ' flip-flops' + (m.chains > 12 ? ' (12 shown)' : ''), 't-dim t-sm');
      pic.innerHTML = S(600, 186, o, 'Scan architecture');
      var ok = { pins: c.pins <= 8, time: m.time <= 25, vol: m.vol <= 0.1, cov: m.cov >= 98.5, pwr: m.pwr <= 20 };
      var f = function (k, t) { return '<span class="' + (ok[k] ? 'v' : 'c') + '">' + t + '</span>'; };
      out.innerHTML = '<span class="k">Shift cycles / pattern</span> ' + m.longest + ' · <span class="k">patterns</span> ' + m.pats + '<br><span class="k">Test time</span> ' + f('time', m.time >= 1000 ? (m.time / 1000).toFixed(2) + ' s' : m.time.toFixed(1) + ' ms') + ' · <span class="k">test data</span> ' + f('vol', m.vol.toFixed(3) + ' Gbit') + ' · <span class="k">coverage</span> ' + f('cov', m.cov.toFixed(1) + ' %') + ' · <span class="k">shift switching</span> ' + f('pwr', m.pwr + ' %') + ' · <span class="k">pins</span> ' + f('pins', c.pins);
      var all = Object.keys(ok).every(function (k) { return ok[k]; });
      verdict.className = 'l7-verdict ' + (all ? 'ok' : 'bad');
      verdict.innerHTML = all ? '✅ Optimised scan architecture<small>Compression multiplies the internal chains, balancing makes every chain equally short, and low-power fill keeps shift switching (and IR drop) safe.</small>' :
        '❌ Targets not met<small>' + [!ok.time ? 'too slow: the longest chain sets the shift time' : '', !ok.vol ? 'too much test data for the tester memory' : '', !ok.cov ? 'very high compression causes encoding conflicts and lost coverage' : '', !ok.pwr ? 'random fill makes ~30 % of flip-flops toggle every shift cycle' : '', !ok.pins ? 'too many pins' : ''].filter(Boolean).join(' · ') + '</small>';
      if (all && !done) { done = true; api.done(); }
    }
    draw();
  }

  function edtFrame(k) {
    var o = R(10, 30, 80, 100, 'box-cu', 8) + T(50, 85, '2 pins', 't-ink t-b t-sm');
    if (k >= 1) o += R(120, 30, 70, 100, 'box-vio', 8) + T(155, 85, 'decomp.', 't-ink t-sm');
    var n = k >= 1 ? 10 : 2;
    for (var i = 0; i < n; i++) o += '<rect x="' + (k >= 1 ? 210 : 120) + '" y="' + (34 + i * (90 / n)) + '" width="' + (k >= 1 ? 200 : 380) + '" height="' + (90 / n - 3) + '" rx="2" fill="#0071e3" opacity=".7"/>';
    if (k >= 2) o += R(430, 30, 70, 100, 'box-vio', 8) + T(465, 85, 'compactor', 't-ink t-sm') + P('M500 80H540', 'w-on') + T(560, 84, '2 pins', 't-ink t-b t-sm', 'start');
    o += T(300, 160, ['Without compression: a few long chains – long shift time', 'A decompressor expands a few channels into many short chains', 'A compactor squeezes many chain outputs back into a few channels', 'Same pins, 10–100× less test time and data'][k], 't-vio t-b t-sm');
    return S(620, 172, o, 'Scan compression');
  }

  L.module({
    n: 2,
    lead: 'Level 5 showed a single scan chain. A real chip has hundreds of thousands of flip-flops and only a few test pins. Learn how multiple balanced chains, scan compression (EDT) and low-power shift make scan test fast, small and safe.',
    tags: ['multiple chains', 'balancing', 'scan compression', 'EDT', 'test-data volume', 'test time', 'low-power scan', 'trade-offs'],
    sections: [
      {
        id: 'c-time', type: 'concept', title: 'Why one long chain is not enough', nav: 'Test time',
        html: '<div class="l7-eq">shift cycles per pattern ≈ longest chain length      test time ≈ patterns × (longest chain + capture) / f_shift</div>' +
          '<p>50,000 flip-flops in one chain at 25 MHz shift → 2 ms per pattern → 8 s for 4,000 patterns: far too slow. More chains help, but each chain normally needs a pin – and pins are limited.</p>'
      },
      {
        id: 'st-edt', type: 'steps', title: 'Animation: scan compression', nav: 'Compression',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Few pins, few long chains.', 'A <b>decompressor</b> (e.g. EDT ring generator + phase shifter) feeds hundreds of short internal chains from a few channels – ATPG patterns contain mostly don\'t-care bits, so they can be encoded compactly.', 'A <b>compactor</b> (XOR tree) combines the chain outputs back into a few channels.', 'Test time and test data drop by the compression ratio.'][k], svg: edtFrame(k) }; })
      },
      { id: 'w-scan', type: 'widget', title: 'Scan chain optimizer', nav: 'Scan optimizer', intro: 'Choose pins, compression, balancing and low-power shift so that every target is met.', build: optLab },
      {
        id: 'c-trade', type: 'concept', title: 'Compression and low-power trade-offs', nav: 'Trade-offs',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Balancing</h4><p>all chains equally long – otherwise the longest chain sets the time</p></div><div class="l7-box cu"><h4>Very high ratios</h4><p>encoding conflicts and X-values at the compactor reduce coverage or add patterns</p></div><div class="l7-box vio"><h4>Shift power</h4><p>random fill toggles many flip-flops at once → IR drop, failures; low-power fill and shift-clock staggering help</p></div></div>'
      },
      {
        id: 'rv-2', type: 'reveal', title: 'Click to reveal: advanced scan insights', nav: 'Reveal',
        items: [
          { q: 'Why can patterns be compressed at all?', a: 'Typically only 1–5 % of scan bits in an ATPG pattern are specified; the rest are don\'t-cares.' },
          { q: 'What is an X in the compactor?', a: 'An unknown value (e.g. from an uninitialised memory) that corrupts the compacted output; X-masking blocks it.' },
          { q: 'Why is shift power higher than functional power?', a: 'In shift, almost every flip-flop may toggle every cycle with random data – unlike normal operation.' },
          { q: 'Does compression change the test itself?', a: 'No – the same faults are targeted; only how data reaches the chains changes.' }
        ]
      },
      {
        id: 'dd-2', type: 'drag', title: 'Drag & drop: what does it reduce?', nav: 'Drag & drop',
        bins: ['Test time', 'Test data volume', 'Shift power'],
        items: [['Balancing chain lengths', 0], ['More internal chains', 0], ['Compression ratio 50×', 1], ['Fewer, compacted patterns', 1], ['Low-power (constant) fill', 2], ['Staggered shift clocks', 2]]
      },
      {
        id: 'calc2', type: 'calc', title: 'Scan calculations', nav: 'Calculate',
        items: [
          { q: '50,000 flip-flops in 400 balanced chains: chain length?', a: 125, h: '50,000 / 400.', s: '<b>125</b>.' },
          { q: '4,000 patterns × (125 + 3) cycles at 25 MHz: test time (ms)?', a: 20.48, tol: 0.01, h: '512,000 cycles / 25 MHz.', s: '<b>20.5 ms</b>.' },
          { q: '8 channels × compression 50×: how many internal chains?', a: 400, h: '8 × 50.', s: '<b>400</b>.' }
        ]
      },
      {
        id: 'mcq2', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Scan test time is set mainly by…', o: ['the longest chain', 'the shortest chain', 'the number of pins only', 'the clock tree'], a: 0, w: '' },
          { q: 'EDT compression works because…', o: ['most pattern bits are don\'t-cares', 'faults are rare', 'chains are long', 'pins are many'], a: 0, w: '' },
          { q: 'Low-power fill reduces…', o: ['switching during shift', 'coverage', 'pins', 'chains'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen2', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Scan tests fail on the tester at full shift speed but pass at half speed; IR-drop analysis of shift is high.', q: 'Best fix?', o: [{ t: 'Low-power fill / lower toggle activity during shift (or stagger shift clocks)', ok: true, w: 'Shift power causes the IR drop.' }, { t: 'Remove compression', ok: false, w: 'Longer test, same toggling.' }, { t: 'Add more patterns', ok: false, w: 'More shifting.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Multiple scan chains reduce…', o: ['shift time', 'coverage', 'area to zero', 'pins'], a: 0, w: '' },
      { d: 'Easy', q: 'A compactor…', o: ['combines chain outputs into few channels', 'expands inputs', 'adds flip-flops', 'tests memories'], a: 0, w: '' },
      { d: 'Easy', q: 'Unbalanced chains waste time because…', o: ['the longest chain sets the shift length', 'short chains are slower', 'pins are idle', 'they add faults'], a: 0, w: '' },
      { d: 'Medium', q: '100,000 flops, 500 chains → length =', o: ['200', '2000', '50', '500'], a: 0, w: '' },
      { d: 'Medium', q: 'Compression ratio 100× with 4 channels gives… internal chains', o: ['400', '104', '25', '4'], a: 0, w: '' },
      { d: 'Medium', q: 'Too high compression can cause…', o: ['coverage loss / extra patterns', 'more pins', 'longer chains', 'no effect'], a: 0, w: '' },
      { d: 'Medium', q: 'X-masking protects…', o: ['the compacted response from unknown values', 'the clock', 'power pads', 'memories'], a: 0, w: '' },
      { d: 'Hard', q: '3000 patterns × 203 cycles at 20 MHz ≈', o: ['30 ms', '3 ms', '300 ms', '0.3 ms'], a: 0, w: '609,000 / 20 MHz.' },
      { d: 'Hard', q: 'Why is shift power a concern?', o: ['random fill makes many flip-flops toggle simultaneously', 'shift is slow', 'chains are short', 'it lowers coverage'], a: 0, w: '' },
      { d: 'Hard', q: 'Test-data volume is roughly…', o: ['patterns × scan bits / compression ratio', 'pins × chains', 'flops / patterns', 'independent of compression'], a: 0, w: '' }
    ]
  });
})();
