/* Level 12 · Module 8 – At-Speed & Silicon Testing */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  function evaluate(c) {
    var interval = c.clk === 'occ' ? 8 : 40;                       // ns between launch and capture
    if (c.method === 'los' && c.se === 'slow') return { valid: false, msg: 'Invalid test: in launch-on-shift the scan-enable must switch from shift to capture between the last shift (launch) and the capture pulse – an at-speed interval. A slow global scan-enable cannot do that.' };
    var arrive = 10;                                               // path with the slow-to-rise defect: 8 ns nominal + 2 ns defect
    var det = interval < arrive;
    return { valid: true, interval: interval, det: det, msg: det ? 'Launch–capture interval ' + interval + ' ns < defective path delay ' + arrive + ' ns: the late transition is captured wrong → defect DETECTED.' : 'Launch–capture interval ' + interval + ' ns from the slow tester clock: even the defective path (' + arrive + ' ns) arrives in time → defect NOT detected. Delay tests need at-speed pulses.' };
  }

  /* ---------- Widget: at-speed test simulator ---------- */
  function atLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>At-speed test simulator · detect a slow-to-rise defect on an 8 ns path (functional clock 125 MHz)</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var c = { method: 'loc', se: 'slow', clk: 'tester' }, got = {}, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'Launch method', [['loc', 'Launch-on-capture (LOC)'], ['los', 'Launch-on-shift (LOS)']], c.method, function (v) { c.method = v; draw(); });
    L.select(row, 'Scan enable', [['slow', 'Slow global scan enable'], ['fast', 'At-speed (pipelined) scan enable']], c.se, function (v) { c.se = v; draw(); });
    L.select(row, 'Capture clocks', [['tester', 'Slow tester clock (25 MHz)'], ['occ', 'OCC: two PLL pulses at 125 MHz']], c.clk, function (v) { c.clk = v; draw(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var r = evaluate(c), o = '', x0 = 90, W = 34, capCls = r.valid && r.det ? 't-ok t-b t-sm' : 't-bad t-b t-sm';
      var shift = [1, 1, 1, 1], loc = c.method === 'loc';
      var clkD = 'M' + x0 + ' 50', t = x0;
      for (var i = 0; i < 4; i++) { clkD += 'V30H' + (t + 10) + 'V50H' + (t + W); t += W; }
      var gap = c.clk === 'occ' ? 30 : 110;
      if (loc) { t += 30; clkD += 'H' + t + 'V30H' + (t + 8) + 'V50H' + (t + gap) + 'V30H' + (t + gap + 8) + 'V50H' + (t + gap + 60); }
      else { clkD += 'H' + (t + gap - 26) + 'V30H' + (t + gap - 18) + 'V50H' + (t + gap + 60); }
      o += P(clkD, 'wv-clk') + T(x0 - 8, 44, 'clk', 't-dim t-sm', 'end');
      var seFall = loc ? x0 + 4 * W + 12 : x0 + 4 * W + (c.se === 'fast' ? 4 : gap + 20);
      o += P('M' + x0 + ' 70H' + seFall + 'V90H' + (x0 + 4 * W + gap + 120), 'w-cu') + T(x0 - 8, 84, 'SE', 't-dim t-sm', 'end');
      var launchX = loc ? x0 + 4 * W + 30 : x0 + 3 * W, capX = loc ? x0 + 4 * W + 30 + gap : x0 + 4 * W + gap - 26;
      o += P('M' + launchX + ' 22V100', 'w-dash') + T(launchX, 116, 'launch', 't-sig t-b t-sm') + P('M' + capX + ' 22V100', 'w-dash') + T(capX, 116, 'capture', capCls, 'middle');
      o += P('M' + launchX + ' 136H' + capX, r.valid ? (r.det ? 'w-on' : 'w-bad') : 'w-bad') + T((launchX + capX) / 2, 152, r.valid ? r.interval + ' ns launch → capture' : 'cannot switch SE in time', 't-ink t-sm');
      o += T(x0 + 70, 14, 'shift (slow)', 't-dim t-sm');
      pic.innerHTML = S(600, 164, o, 'At-speed test waveform');
      if (r.valid && r.det) got[c.method] = 1;
      verdict.className = 'l7-verdict ' + (!r.valid ? 'bad' : r.det ? 'ok' : 'warn');
      verdict.innerHTML = (!r.valid ? '❌ ' : r.det ? '✅ ' : '⚠️ ') + r.msg + '<small>Progress: detected with LOC ' + (got.loc ? '✅' : '○') + ' · detected with LOS ' + (got.los ? '✅' : '○') + (got.loc && got.los ? ' – LOC works with a slow scan enable but needs a functional launch; LOS gives ATPG more freedom (often higher coverage) but needs an at-speed scan enable.' : '') + '</small>';
      if (got.loc && got.los && !done) { done = true; api.done(); }
    }
    draw();
  }

  function locFrame(k) {
    var o = '', items = [['Shift in V1', 'scan enable = 1, slow clock'], ['Launch', 'first at-speed pulse creates V2 (LOC: from the logic)'], ['Capture', 'second pulse, one functional period later'], ['Shift out', 'compare captured values']];
    items.forEach(function (it, i) { var x = 10 + i * 148; o += R(x, 40, 136, 56, i === k ? 'box-on' : 'box', 10) + T(x + 68, 64, it[0], 't-ink t-b') + T(x + 68, 84, '', 't-dim t-sm'); });
    o += T(300, 124, items[k][1], 't-vio t-b t-sm');
    return S(600, 140, o, 'Two-pattern at-speed test');
  }

  L.module({
    n: 8,
    lead: 'Most modern defects make circuits slow, not stuck. At-speed tests launch a transition and capture it exactly one functional clock later. Learn launch-on-capture and launch-on-shift, the on-chip clock controllers that make them possible, and the challenges of testing real silicon at speed.',
    tags: ['at-speed testing', 'transition-delay testing', 'launch-on-capture', 'launch-on-shift', 'on-chip clocking', 'silicon test challenges'],
    sections: [
      {
        id: 'st-loc', type: 'steps', title: 'Animation: a two-pattern at-speed test', nav: 'At-speed test',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Shift the initialisation pattern V1 into the scan chains (slowly).', 'Launch: the first fast pulse makes the target node switch.', 'Capture: the second pulse, exactly one functional period later – a slow node is captured with the old value.', 'Shift out and compare as in any scan test.'][k], svg: locFrame(k) }; })
      },
      {
        id: 'c-loc', type: 'concept', title: 'Launch-on-capture vs launch-on-shift', nav: 'LOC vs LOS',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th></th><th>Launch-on-capture (LOC, broadside)</th><th>Launch-on-shift (LOS, skewed-load)</th></tr><tr><td>V2 comes from</td><td>the circuit\'s response to V1 (a functional capture)</td><td>one more shift of the scan chain</td></tr><tr><td>Scan enable</td><td>can be slow (switches before launch)</td><td>must switch at speed between launch and capture</td></tr><tr><td>Coverage / patterns</td><td>lower coverage, more patterns</td><td>higher coverage, fewer patterns</td></tr><tr><td>Risk</td><td>–</td><td>timing closure of the scan-enable network; may test non-functional paths</td></tr></table></div>'
      },
      { id: 'w-at', type: 'widget', title: 'At-speed test simulator', nav: 'At-speed lab', intro: 'Configure the test so the slow-to-rise defect is detected – once with LOC and once with LOS.', build: atLab },
      {
        id: 'c-occ', type: 'concept', title: 'On-chip clocking and silicon test challenges', nav: 'OCC & challenges',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>On-chip clock controller (OCC)</h4><p>Testers cannot deliver GHz clocks precisely. The OCC lets the slow tester clock shift data, then releases exactly two (or more) pulses from the on-chip PLL for launch and capture.</p></div><div class="l7-box cu"><h4>Challenges on real silicon</h4><ul><li>power/IR drop during capture makes good chips fail (over-kill)</li><li>false and multicycle paths must be masked</li><li>small-delay defects need long paths (Module 4)</li><li>clock-domain crossings during capture</li></ul></div></div>'
      },
      {
        id: 'rv-8', type: 'reveal', title: 'Click to reveal: at-speed insights', nav: 'Reveal',
        items: [
          { q: 'Why does a slow clock not detect delay defects?', a: 'With a long launch–capture interval, even a slow transition arrives in time.' },
          { q: 'Why is launch-on-shift harder to implement?', a: 'The scan-enable network must switch at functional speed across the whole chip.' },
          { q: 'What is over-kill in at-speed testing?', a: 'Good chips failing because test conditions (e.g. extreme capture power) are harsher than real operation.' },
          { q: 'Why are false paths masked in at-speed tests?', a: 'They are not required to meet timing functionally; testing them at speed would reject good chips.' }
        ]
      },
      {
        id: 'dd-8', type: 'drag', title: 'Drag & drop: LOC or LOS?', nav: 'Drag & drop',
        bins: ['Launch-on-capture', 'Launch-on-shift'],
        items: [['V2 is the circuit\'s own response', 0], ['works with a slow scan enable', 0], ['V2 is one more shift of the chain', 1], ['needs an at-speed scan enable', 1], ['usually higher coverage', 1]]
      },
      {
        id: 'calc8', type: 'calc', title: 'At-speed calculations', nav: 'Calculate',
        items: [
          { q: 'Functional clock 800 MHz: launch-to-capture interval (ns)?', a: 1.25, h: '1 / f.', s: '<b>1.25 ns</b>.' },
          { q: 'A path of 1.1 ns gets a 0.3 ns defect. At 800 MHz is it detected (1 = yes, 0 = no)?', a: 1, h: '1.4 > 1.25.', s: '<b>1</b> – yes.' },
          { q: 'Same defect on a 0.6 ns path: detected (1/0)?', a: 0, abs: 0.01, h: '0.9 < 1.25.', s: '<b>0</b> – a small-delay defect on a short path escapes.' }
        ]
      },
      {
        id: 'mcq8', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'At-speed tests detect…', o: ['delay defects', 'only stuck-at faults', 'memory faults only', 'shorts on boards'], a: 0, w: '' },
          { q: 'An OCC provides…', o: ['precise launch/capture pulses from the PLL', 'scan compression', 'memory repair', 'boundary scan'], a: 0, w: '' },
          { q: 'LOS requires…', o: ['an at-speed scan enable', 'no clock', 'MBIST', 'a slow scan enable'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen8', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Transition patterns reject 3 % of dies that later work perfectly in the system.', q: 'Likely cause?', o: [{ t: 'Over-kill: excessive capture power/IR drop or untested false paths during at-speed capture', ok: true, w: 'Test conditions harsher than function.' }, { t: 'The dies are really bad', ok: false, w: 'They work in the system.' }, { t: 'The tester clock is too fast', ok: false, w: 'Launch/capture come from the OCC.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Transition-delay tests need…', o: ['a launch and an at-speed capture', 'one pattern', 'no clock', 'boundary scan'], a: 0, w: '' },
      { d: 'Easy', q: 'LOC stands for…', o: ['launch-on-capture', 'logic-on-chip', 'low-overhead clock', 'line-of-code'], a: 0, w: '' },
      { d: 'Easy', q: 'A slow tester clock cannot detect…', o: ['delay defects', 'stuck-at faults', 'opens', 'bridges'], a: 0, w: '' },
      { d: 'Medium', q: 'Launch–capture interval at 500 MHz =', o: ['2 ns', '5 ns', '0.5 ns', '20 ns'], a: 0, w: '' },
      { d: 'Medium', q: 'Which method usually gives higher transition coverage?', o: ['LOS', 'LOC', 'neither', 'slow scan'], a: 0, w: '' },
      { d: 'Medium', q: 'In LOC, V2 is…', o: ['the circuit\'s response to V1', 'another shift', 'random', 'from the tester directly'], a: 0, w: '' },
      { d: 'Medium', q: 'Over-kill means…', o: ['good chips rejected by the test', 'bad chips shipped', 'tests too short', 'no coverage'], a: 0, w: '' },
      { d: 'Hard', q: 'A 0.5 ns extra delay on a 3 ns path at 4 ns period is…', o: ['not detected', 'detected', 'a stuck-at', 'invalid'], a: 0, w: '3.5 < 4.' },
      { d: 'Hard', q: 'Why mask false paths in at-speed patterns?', o: ['to avoid rejecting good chips', 'to raise coverage', 'to speed up shift', 'to save area'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is capture power a concern in at-speed test?', o: ['many flops switch at once → IR drop → false failures', 'it lowers coverage', 'it removes faults', 'it is not'], a: 0, w: '' }
    ]
  });
})();
